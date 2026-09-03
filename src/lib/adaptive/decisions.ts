/**
 * AL-04 — Adaptive Training Graph v1 decision engine (pure, deterministic).
 *
 * Implements the decision algorithm signed off by the Owner on 2026-09-03
 * (gate `docs/architecture/AL-04-DECISION-GATE.md`; D1a adjust-over-intent,
 * D2a auto-apply safety-lowering only, D3a rule-table defaults, D4a additive
 * session-intent input extension).
 *
 * Decision hierarchy (gate doc §2): L0 safety gates → L1 session frame →
 * L2 per-movement KEEP/PROGRESS/REGRESS/SUBSTITUTE/EXCLUDE → L3 bounded
 * sets deltas. Sequencing and catalog-wide exercise selection are deferred.
 *
 * Binding properties (gate doc §1):
 *  - PURE + DETERMINISTIC — same `AdaptationInput` → same output, always;
 *    all iteration follows intent order and edge order is sorted.
 *  - ZERO inference inside AL-04 — attributed profile inference
 *    (capability/adherence/trends) is consumed as opaque input with its
 *    confidence relayed; nothing is recomputed, no statistics are fit, no
 *    LLM is invoked.
 *  - FAIL-CLOSED — absence is never a signal (no performance row ⇒ no
 *    change; no difficulty feeling ⇒ not EASY; no report ⇒ no difficulty);
 *    invalid/absent session intent yields a conservative baseline, never a
 *    guessed plan.
 *  - ATTRIBUTABLE — every decision carries its ruleId, the consulted
 *    evidence refs, and a fixed EN template rendering.
 *  - NOT MEDICAL, NOT POLICING — constraint/regression/deload decisions are
 *    conservative load management; load-RAISING decisions are ADVISORY.
 *
 * The whole rule table lives in `DECISION_POLICY` (gate doc D3a) — the
 * single auditable knob module; no magic numbers elsewhere.
 */

import { SUBJECTIVE_DIFFICULTY_DISPLAY } from '../outcomes';
import type { MovementId, MovementRelationshipKind, MovementSlug } from '../movement';
import type { ProfileMovementSubject } from '../profile';
import type {
  AdaptationDifficultySubject,
  AdaptationInput,
  AdaptiveDecisionOutput,
  DecisionConfidence,
  MovementDecision,
  MovementDecisionKind,
  MovementKnowledgeEntry,
  SessionDecision,
} from './types';

/**
 * D3a policy defaults — the single auditable knob module (gate doc §4).
 */
export const DECISION_POLICY = {
  /** Freshness window for a performance row to drive a HIGH-confidence decision (days). */
  freshnessWindowDays: 21,
  /** Inactivity that triggers the recovery/return-to-training frame (days). */
  recoveryInactivityDays: 14,
  /** Minimum completion ratio for a performance row to support progression. */
  completionBaseline: 0.7,
  /** Completion ratio required to progress from an EASY feeling. */
  progressionCompletionThreshold: 0.9,
  /** Minimum attributed-inference confidence before a trend may drive decisions. */
  trendConfidenceThreshold: 0.5,
  /** Window completion ratio below which a recovery frame is forced. */
  recoveryCompletionThreshold: 0.6,
  /** Session volume caps by capability tier (unknown → conservative cap). */
  capabilityVolumeCaps: { beginner: 16, intermediate: 20, advanced: 24, unknown: 16 } as const,
  /** Max positive per-movement sets delta in v1. */
  movementDeltaMax: 1,
  /** Max positive session-level sets delta in v1. */
  sessionDeltaMax: 1,
} as const;

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

/** Stable subject key (slug preferred, else exerciseId / constraint / 'session'). */
function subjectKey(subject: ProfileMovementSubject | AdaptationDifficultySubject): string {
  if (subject.kind === 'exercise') return subject.slug ?? subject.exerciseId ?? '';
  if (subject.kind === 'movementConstraint') return subject.constraint;
  return 'session';
}

function daysBetween(earlierDateKey: string, laterDateKey: string): number {
  const a = new Date(`${earlierDateKey}T00:00:00Z`).getTime();
  const b = new Date(`${laterDateKey}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function pct(ratio: number): string {
  return ratio.toFixed(2);
}

function labelFor(subject: ProfileMovementSubject): string {
  if (subject.kind === 'exercise') return subject.slug ?? subject.exerciseId ?? 'exercise';
  return subject.constraint;
}

function knowledgeFor(input: AdaptationInput, subject: ProfileMovementSubject): MovementKnowledgeEntry | undefined {
  const key = subjectKey(subject);
  if (!key) return undefined;
  return input.movementKnowledge.find((m) => {
    const mk = m.slug ? String(m.slug) : m.id ? String(m.id) : '';
    return mk === key;
  });
}

function performanceFor(input: AdaptationInput, subject: ProfileMovementSubject) {
  const key = subjectKey(subject);
  return input.history.performance.find((p) => subjectKey(p.subject) === key);
}

function trendFor(input: AdaptationInput, subject: ProfileMovementSubject) {
  const key = subjectKey(subject);
  return input.user.movementTrends?.find((t) => subjectKey(t.subject) === key);
}

/**
 * Deterministic edge resolution: among edges of the required kind, prefer
 * substitution edges that carry a `note` (constraint/equipment-driven) when
 * `preferNoteFirst`, then sort by target slug/id. Exactly one edge step per
 * movement per session — never a chain.
 */
function resolveEdge(
  entry: MovementKnowledgeEntry | undefined,
  kind: MovementRelationshipKind,
  preferNoteFirst = false,
): { slug?: MovementSlug; id?: MovementId } | undefined {
  if (!entry) return undefined;
  const candidates = (entry.relationships ?? [])
    .filter((r) => r.kind === kind)
    .map((r) => ({ slug: r.targetSlug, id: r.targetId, note: r.note ?? '' }));
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => {
    if (preferNoteFirst) {
      const an = a.note ? 0 : 1;
      const bn = b.note ? 0 : 1;
      if (an !== bn) return an - bn;
    }
    return String(a.slug ?? a.id ?? '').localeCompare(String(b.slug ?? b.id ?? ''));
  });
  const best = candidates[0];
  return best.slug !== undefined || best.id !== undefined ? { slug: best.slug, id: best.id } : undefined;
}

function targetLabel(target: { slug?: MovementSlug; id?: MovementId }): string {
  return target.slug ?? (target.id as string | undefined) ?? 'target';
}

// ---------------------------------------------------------------------------
// Rule table (gate doc §3–§5)
// ---------------------------------------------------------------------------

interface RecoveryState {
  recoveryFlag: boolean;
  windowCompletion: number;
}

function recoveryState(input: AdaptationInput): RecoveryState {
  const a = input.history.activity;
  const total = a.totalSets;
  const windowCompletion = total > 0 ? a.completedSets / total : 0;
  const inactivity = a.lastDateKey
    ? daysBetween(a.lastDateKey, input.asOfDateKey)
    : Number.POSITIVE_INFINITY;
  const abandoned = a.sessions.some((s) => s.kind === 'ABANDONED' || s.kind === 'DID_NOT_START');
  const recoveryFlag =
    (a.lastDateKey !== undefined && inactivity > DECISION_POLICY.recoveryInactivityDays) ||
    abandoned ||
    (total > 0 && windowCompletion < DECISION_POLICY.recoveryCompletionThreshold);
  return { recoveryFlag, windowCompletion };
}

function determineBasis(input: AdaptationInput): 'RULE_DRIVEN' | 'INSUFFICIENT_DATA' {
  const intent = input.sessionIntent;
  if (!intent || intent.movements.length === 0) return 'INSUFFICIENT_DATA';
  const hasProfileSignals = input.user.capability !== undefined || input.user.adherence !== undefined;
  const noPerfForAnyIntent = intent.movements.every((m) => performanceFor(input, m.subject) === undefined);
  if (!hasProfileSignals || noPerfForAnyIntent) return 'INSUFFICIENT_DATA';
  return 'RULE_DRIVEN';
}

/** G-CONSTRAINT forced behavior: regression edge → REGRESS; else substitution → SUBSTITUTE; else EXCLUDE. */
function constrainedDecision(
  input: AdaptationInput,
  entry: MovementKnowledgeEntry | undefined,
  subject: ProfileMovementSubject,
  slotIndex: number,
): MovementDecision | undefined {
  const recurringKeys = new Set(
    input.constraints.recurringDifficultySubjects.map((s) => subjectKey(s)),
  );
  if (!recurringKeys.has(subjectKey(subject))) return undefined;

  const regression = resolveEdge(entry, 'regression');
  if (regression) {
    return makeDecision({
      slotIndex,
      subject,
      decision: 'REGRESS',
      target: regression,
      setsDelta: 0,
      confidence: 'HIGH',
      ruleId: 'L0-G-CONSTRAINT',
      evidenceRefs: [],
      humanText: `Regress "${labelFor(subject)}" to "${targetLabel(regression)}" — recurring difficulty flagged for this movement (conservative load management; not a diagnosis).`,
    });
  }
  const substitution = resolveEdge(entry, 'substitution', true);
  if (substitution) {
    return makeDecision({
      slotIndex,
      subject,
      decision: 'SUBSTITUTE',
      target: substitution,
      setsDelta: 0,
      confidence: 'HIGH',
      ruleId: 'L0-G-CONSTRAINT',
      evidenceRefs: [],
      humanText: `Substitute "${labelFor(subject)}" with "${targetLabel(substitution)}" — recurring difficulty flagged for this movement (conservative load management; not a diagnosis).`,
    });
  }
  return makeDecision({
    slotIndex,
    subject,
    decision: 'EXCLUDE',
    setsDelta: 0,
    confidence: 'HIGH',
    ruleId: 'L0-G-CONSTRAINT',
    evidenceRefs: [],
    humanText: `Exclude "${labelFor(subject)}" — recurring difficulty flagged and no safe variant found in the graph (not a diagnosis).`,
  });
}

interface DecisionArgs {
  slotIndex: number;
  subject: ProfileMovementSubject;
  decision: MovementDecisionKind;
  target?: { slug?: MovementSlug; id?: MovementId };
  setsDelta: number;
  confidence: DecisionConfidence;
  ruleId: string;
  evidenceRefs: readonly string[];
  humanText: string;
}

function makeDecision(args: DecisionArgs): MovementDecision {
  const apply = args.decision === 'PROGRESS' || args.setsDelta > 0 ? 'ADVISORY' : 'AUTO';
  return {
    slotIndex: args.slotIndex,
    subject: args.subject,
    decision: args.decision,
    target: args.target,
    setsDelta: args.setsDelta,
    apply,
    confidence: args.confidence,
    ruleId: args.ruleId,
    evidenceRefs: args.evidenceRefs,
    humanText: args.humanText,
  };
}

/** L2 — per-movement decision from the difficulty table (gate doc §4.2). */
function decideMovement(
  input: AdaptationInput,
  slot: { slotIndex: number; subject: ProfileMovementSubject },
  progressionAllowed: boolean,
): MovementDecision {
  const { slotIndex, subject } = slot;
  const label = labelFor(subject);
  const entry = knowledgeFor(input, subject);

  // G-FEAS — no graph knowledge ⇒ no adjustment (fail-closed).
  if (!entry) {
    return makeDecision({
      slotIndex,
      subject,
      decision: 'KEEP',
      setsDelta: 0,
      confidence: 'MEDIUM',
      ruleId: 'L0-G-FEAS',
      evidenceRefs: [],
      humanText: `Keep "${label}" — no graph knowledge for this movement; no adjustment.`,
    });
  }

  // G-CONSTRAINT — recurring difficulty wins over performance-driven rules.
  const constrained = constrainedDecision(input, entry, subject, slotIndex);
  if (constrained) return constrained;

  const perf = performanceFor(input, subject);
  if (!perf) {
    return makeDecision({
      slotIndex,
      subject,
      decision: 'KEEP',
      setsDelta: 0,
      confidence: 'MEDIUM',
      ruleId: 'L2-COLD',
      evidenceRefs: [],
      humanText: `Keep "${label}" — no recorded performance for this movement yet.`,
    });
  }

  const evidenceRefs = perf.lastOutcomeId ? [perf.lastOutcomeId] : [];
  const feeling = perf.lastDifficultyFeeling;
  const fresh = daysBetween(perf.lastDateKey, input.asOfDateKey) <= DECISION_POLICY.freshnessWindowDays;
  const compOk = perf.completionRatio >= DECISION_POLICY.completionBaseline;
  const trend = trendFor(input, subject);
  const improving =
    trend?.trend === 'IMPROVING' && trend.confidence >= DECISION_POLICY.trendConfidenceThreshold;
  const regressing =
    trend?.trend === 'REGRESSING' && trend.confidence >= DECISION_POLICY.trendConfidenceThreshold;
  const feelingText = feeling ? SUBJECTIVE_DIFFICULTY_DISPLAY[feeling] : undefined;

  // L2 — no difficulty feeling recorded: absence ≠ EASY.
  if (feeling === undefined) {
    return makeDecision({
      slotIndex,
      subject,
      decision: 'KEEP',
      setsDelta: 0,
      confidence: 'MEDIUM',
      ruleId: 'L2-NO-FEELING',
      evidenceRefs,
      humanText: `Keep "${label}" — no difficulty feeling recorded on ${perf.lastDateKey} (completion ${pct(perf.completionRatio)}).`,
    });
  }

  switch (feeling) {
    case 'VERY_EASY': {
      if (fresh && compOk && progressionAllowed) {
        const progression = resolveEdge(entry, 'progression');
        if (progression) {
          return makeDecision({
            slotIndex,
            subject,
            decision: 'PROGRESS',
            target: progression,
            setsDelta: 0,
            confidence: 'HIGH',
            ruleId: 'L2-DIFF-VERY_EASY',
            evidenceRefs,
            humanText: `Progress "${label}" to "${targetLabel(progression)}" — last recorded difficulty "Very easy" on ${perf.lastDateKey} (completion ${pct(perf.completionRatio)}).`,
          });
        }
        return makeDecision({
          slotIndex,
          subject,
          decision: 'KEEP',
          setsDelta: DECISION_POLICY.movementDeltaMax,
          confidence: 'HIGH',
          ruleId: 'L2-DIFF-VERY_EASY',
          evidenceRefs,
          humanText: `Keep "${label}", add 1 set — last recorded difficulty "Very easy" on ${perf.lastDateKey}; no progression variant in the graph.`,
        });
      }
      return makeDecision({
        slotIndex,
        subject,
        decision: 'KEEP',
        setsDelta: 0,
        confidence: fresh ? 'MEDIUM' : 'MEDIUM',
        ruleId: progressionAllowed ? 'L2-DIFF-VERY_EASY' : 'L2-SUPPRESSED',
        evidenceRefs,
        humanText: `Keep "${label}" — "Very easy" on ${perf.lastDateKey}, but ${progressionAllowed ? 'the row is stale or below the completion baseline' : 'progression is suppressed by the current frame (recovery/adherence)'}.`,
      });
    }
    case 'EASY': {
      const canProgress =
        fresh && compOk && progressionAllowed && perf.completionRatio >= DECISION_POLICY.progressionCompletionThreshold && (trend === undefined || improving);
      if (canProgress) {
        const progression = resolveEdge(entry, 'progression');
        if (progression) {
          return makeDecision({
            slotIndex,
            subject,
            decision: 'PROGRESS',
            target: progression,
            setsDelta: 0,
            confidence: 'HIGH',
            ruleId: 'L2-DIFF-EASY',
            evidenceRefs,
            humanText: `Progress "${label}" to "${targetLabel(progression)}" — "Easy" on ${perf.lastDateKey} with completion ${pct(perf.completionRatio)}.`,
          });
        }
      }
      return makeDecision({
        slotIndex,
        subject,
        decision: 'KEEP',
        setsDelta: 0,
        confidence: 'MEDIUM',
        ruleId: 'L2-DIFF-EASY',
        evidenceRefs,
        humanText: `Keep "${label}" — "Easy" on ${perf.lastDateKey} (completion ${pct(perf.completionRatio)}); ${perf.completionRatio >= DECISION_POLICY.progressionCompletionThreshold ? 'no progression variant or conditions not met' : 'below the progression completion threshold'}.`,
      });
    }
    case 'JUST_RIGHT': {
      return makeDecision({
        slotIndex,
        subject,
        decision: 'KEEP',
        setsDelta: 0,
        confidence: fresh ? 'HIGH' : 'MEDIUM',
        ruleId: 'L2-DIFF-JUST_RIGHT',
        evidenceRefs,
        humanText: `Keep "${label}" — last recorded difficulty "Just right" on ${perf.lastDateKey} (completion ${pct(perf.completionRatio)}).`,
      });
    }
    case 'HARD': {
      if (regressing) {
        const regression = resolveEdge(entry, 'regression');
        if (regression) {
          return makeDecision({
            slotIndex,
            subject,
            decision: 'REGRESS',
            target: regression,
            setsDelta: 0,
            confidence: 'MEDIUM',
            ruleId: 'L2-DIFF-HARD-REGRESSING',
            evidenceRefs,
            humanText: `Regress "${label}" to "${targetLabel(regression)}" — "Hard" on ${perf.lastDateKey} with a regression trend on this movement.`,
          });
        }
      }
      return makeDecision({
        slotIndex,
        subject,
        decision: 'KEEP',
        setsDelta: 0,
        confidence: fresh ? 'HIGH' : 'MEDIUM',
        ruleId: 'L2-DIFF-HARD',
        evidenceRefs,
        humanText: `Keep "${label}" — "Hard" on ${perf.lastDateKey} (completion ${pct(perf.completionRatio)}); no progression.`,
      });
    }
    case 'VERY_HARD': {
      const regression = resolveEdge(entry, 'regression');
      if (regression) {
        return makeDecision({
          slotIndex,
          subject,
          decision: 'REGRESS',
          target: regression,
          setsDelta: 0,
          confidence: 'HIGH',
          ruleId: 'L2-DIFF-VERY_HARD',
          evidenceRefs,
          humanText: `Regress "${label}" to "${targetLabel(regression)}" — last recorded difficulty "Very hard" on ${perf.lastDateKey}.`,
        });
      }
      const substitution = resolveEdge(entry, 'substitution', true);
      if (substitution) {
        return makeDecision({
          slotIndex,
          subject,
          decision: 'SUBSTITUTE',
          target: substitution,
          setsDelta: 0,
          confidence: 'MEDIUM',
          ruleId: 'L2-DIFF-VERY_HARD-SUBSTITUTE',
          evidenceRefs,
          humanText: `Substitute "${label}" with "${targetLabel(substitution)}" — last recorded difficulty "Very hard" on ${perf.lastDateKey}; no regression variant in the graph.`,
        });
      }
      return makeDecision({
        slotIndex,
        subject,
        decision: 'KEEP',
        setsDelta: -DECISION_POLICY.movementDeltaMax,
        confidence: 'LOW',
        ruleId: 'L2-DIFF-VERY_HARD-DELOAD',
        evidenceRefs,
        humanText: `Keep "${label}" with 1 fewer set — last recorded difficulty "Very hard" on ${perf.lastDateKey}; no safer variant in the graph.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// The decision entry point
// ---------------------------------------------------------------------------

/**
 * Builds the AL-04 decision output for one `AdaptationInput`. Pure and
 * deterministic: identical input → identical output (intent order preserved,
 * edges sorted, flags sorted).
 */
export function buildAdaptiveDecision(input: AdaptationInput): AdaptiveDecisionOutput {
  const intent = input.sessionIntent;
  const basis = determineBasis(input);
  const flags = new Set<string>();
  const ruleIds = new Set<string>();

  // --- INSUFFICIENT-DATA conservative baseline (gate doc §5) -----------------
  if (basis === 'INSUFFICIENT_DATA' || !intent) {
    flags.add('insufficient-data');
    if (!intent) flags.add('no-session-intent');
    const movements: MovementDecision[] = (intent?.movements ?? []).map((m) => {
      const perf = performanceFor(input, m.subject);
      const missing =
        perf === undefined ? 'no recorded performance for this movement yet' : 'insufficient user state to adjust safely';
      return makeDecision({
        slotIndex: m.slotIndex,
        subject: m.subject,
        decision: 'KEEP',
        setsDelta: 0,
        confidence: 'MEDIUM',
        ruleId: 'L2-COLD',
        evidenceRefs: [],
        humanText: `Keep "${labelFor(m.subject)}" — ${missing}.`,
      });
    });
    return {
      version: 1,
      asOfDateKey: input.asOfDateKey,
      basis,
      session: {
        setsDelta: 0,
        conservativeBaseline: true,
        recoveryFlag: false,
        ruleIds: ['L1-INSUFFICIENT'],
      },
      movements,
      flags: [...flags].sort(),
    };
  }

  // --- RULE_DRIVEN path ------------------------------------------------------
  const rec = recoveryState(input);
  if (rec.recoveryFlag) {
    flags.add('recovery-frame');
    ruleIds.add('L1-G-RECOV');
  }
  const adherenceLow = input.user.adherence?.tier === 'LOW';
  const windowLow = rec.windowCompletion < DECISION_POLICY.recoveryCompletionThreshold;
  const progressionAllowed = !adherenceLow && !rec.recoveryFlag;

  // L1 — session frame delta.
  let sessionDelta = adherenceLow || windowLow ? -1 : 0;
  if (sessionDelta === -1) ruleIds.add('L1-ADHERENCE');

  // L2/L3 — per-movement decisions in intent order.
  const movements = intent.movements.map((m) => decideMovement(input, m, progressionAllowed));
  for (const d of movements) {
    if (d.decision === 'REGRESS' || d.decision === 'SUBSTITUTE' || d.decision === 'EXCLUDE') {
      flags.add('recurring-difficulty-flagged');
    }
  }

  // G-VOLCAP — clamp the proposed total to the capability cap (gate doc §4.1).
  const capTier = input.user.capability?.tier ?? 'unknown';
  const cap = DECISION_POLICY.capabilityVolumeCaps[capTier];
  const intentTotal = intent.movements.reduce((sum, m) => sum + m.plannedSets, 0);
  const clampDelta = (): void => {
    let proposed = intentTotal + sessionDelta + movements.reduce((s, d) => s + d.setsDelta, 0);
    let excess = proposed - cap;
    if (excess > 0) {
      // Reduce advisory load raises first, then the session delta; record the clamp.
      for (const d of movements) {
        if (excess <= 0) break;
        if (d.setsDelta > 0) {
          const cut = Math.min(d.setsDelta, excess);
          d.setsDelta -= cut;
          excess -= cut;
        }
      }
      if (excess > 0) sessionDelta -= excess;
      ruleIds.add('L1-G-VOLCAP');
      flags.add('volume-cap-clamped');
    }
  };
  clampDelta();

  const session: SessionDecision = {
    setsDelta: sessionDelta,
    conservativeBaseline: false,
    recoveryFlag: rec.recoveryFlag,
    ruleIds: [...ruleIds].sort(),
  };

  return {
    version: 1,
    asOfDateKey: input.asOfDateKey,
    basis,
    session,
    movements,
    flags: [...flags].sort(),
  };
}