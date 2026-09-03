# CP-01 — Companion Architecture + UX Behavior Spec

> **STATUS: DELIVERED / CLOSED — 2026-09-03** (spec/docs only)
>
> Decision: [`adr/0018-companion-architecture.md`](../adr/0018-companion-architecture.md).
> Docs-only task (`DOCS_ONLY`): no code, no schema, no camera, no runtime
> wiring, no data collection. Authorizes nothing by itself — it is the
> architecture spec the strategy §2D Companion experience is built against,
> and the prerequisite for CP-02 (observation signal model) and CP-05
> (Workout Experience V2 integration).
>
> Inputs: `PRODUCT-STRATEGY.md` §2D (Companion), §3 (closed loop), §8
> (privacy principle), §9 (trust/safety); the AL-04 `AdaptiveDecisionOutput`
> schema (`docs/architecture/AL-04-ADAPTIVE-TRAINING-GRAPH.md`); the TS-01
> privacy/safety framework (`docs/architecture/TS-01-PRIVACY-SAFETY-ARCHITECTURE.md`);
> the S-04 session contract.

## 1. Purpose

Make the product promise tangible: **«تو ورزش کن؛ ما حواسمون بهت هست.»**
("You move. We've got you.") — an active fitness companion that guides the
workout, observes relevant performance/form signals where authorized,
intervenes when useful, and feeds future adaptation. The Companion is a
**guidance and observation surface**, never a decision-maker: all adaptive
decisions come from the AL-04 decision layer, all recorded truth from the
AL-01 outcome model.

## 2. Experience principle: watching over, not policing

Operationalized as three binding rules:

1. **Silence is the default.** The Companion speaks only when speaking
   changes the outcome for the better. There is no ambient commentary.
2. **Value over noise.** An intervention must be specific, actionable, and
   grounded in a signal or decision — never generic chatter. If the same
   message would apply to any user at any time, it does not get said.
3. **Guidance, not criticism.** Suggestions are phrased as offers ("Try
   slowing the descent…"), never as judgments ("You're doing it wrong").
   Corrections are specific and actionable; encouragement is data-grounded
   and never fabricated.

These rules are enforced mechanically through the intervention model (§5)
and the tone rules (§6), not left to copywriters.

## 3. Component boundaries

| Component | Responsibility | Boundary |
|---|---|---|
| **Companion Engine** (pure, client-side) | Consumes session state (S-04), observation signals (CP-02 contract), and the pre-session AL-04 `AdaptiveDecisionOutput`; emits typed **intervention intents** (or explicit silence). Never speaks directly, never decides adaptation, never records outcomes. | No I/O, no UI, no services — pure function of (session state, signals, decisions). Deterministic given the same inputs. |
| **Intervention surface** | Renders intervention intents to the user (HUD / inline / voice-ready). Localizes via MG-07-style keys (EN-first; FA only from a real corpus — no invented Persian). | One renderer per surface; all copy is keyed, never built in the Engine. |
| **Observation layer** (CP-02) | Typed rep/phase/tempo/form-proxy signals from authorized sources. Feeds the Engine in-session; feeds AL-01 outcomes post-session. | Signal schema owned by CP-02; no raw video here (C1 stays on-device, CP-03/04). |
| **Adaptation bridge** | Pre-session: `AdaptationInput` (AL-03, incl. `sessionIntent`) → AL-04 → `AdaptiveDecisionOutput` → plan rendering. Post-session: outcome (AL-01) → profile (AL-02) → future adaptation. | The Companion renders decisions; it does not create them. |

**Data flow (three moments):**

```text
Pre-session   AdaptationInput (AL-03 + sessionIntent) → AL-04 → AdaptiveDecisionOutput
              → plan: AUTO decisions applied, ADVISORY presented for confirmation (D2a)
In-session    SessionState (S-04) + observation signals (CP-02) → Companion Engine
              → intervention intents → surfaces (silence is an explicit no-op)
Post-session  outcome (AL-01) → profile (AL-02) → adaptation input (AL-03) → AL-04 (next session)
```

## 4. How AL-04 decisions surface (apply-mode contract)

The AL-04 output carries `session.setsDelta`, per-movement
`movements[] { decision, target?, setsDelta, apply, confidence, ruleId,
evidenceRefs, humanText }`, `basis`, and `flags`. The Companion's plan
rendering contract:

- `apply = 'AUTO'` (REGRESS / SUBSTITUTE / EXCLUDE / negative deltas) →
  applied to the session plan directly; the change is **announced once** in
  one sentence, using the decision's `humanText` as the copy source
  (e.g., "This set: incline push-ups instead — your last push-ups were very
  hard.").
- `apply = 'ADVISORY'` (PROGRESS / positive deltas) → presented as a
  confirmation ("Ready to try decline push-ups today?") before the plan
  changes; declined ⇒ plan stays as-is (no coercion, no re-prompt).
- `basis = 'INSUFFICIENT_DATA'` → no adjustments surface at all; the
  Companion may show neutral guidance only.
- `flags` (recurring-difficulty-flagged, recovery-frame, etc.) render as
  non-diagnostic, conservative copy — never medical language (§7).

## 5. Intervention model (when to speak, when to stay silent)

Interventions are typed, threshold-gated, and cadence-capped. A candidate
intervention must satisfy **all** of: (1) signal confidence above its
threshold, (2) within the intervention budget, (3) not a repeat of the last
identical intervention this session.

| # | Intervention type | Trigger (grounded signal) | Min confidence | Max cadence |
|---|---|---|---|---|
| G1 | Transition guidance | Session phase change (next exercise / set / rest end) | — | once per transition |
| G2 | Rep/phase awareness | CP-02 rep/phase signal drift (e.g. count mismatch or tempo proxy) | HIGH | once per set |
| G3 | Form feedback | CP-02 form proxy (MEASURED_PROXY) crossing a validated threshold | HIGH | max 2 per exercise, never mid-rep |
| G4 | Useful correction | Same as G3 + actionable alternative known | HIGH | inherits G3 cap |
| G5 | Encouragement | Data-grounded milestone: session completed, streak ≥ 3, longest session, completion ≥ 0.9 | — | once per milestone type, max 3 per session |
| G6 | Contextual substitution/regression | Mid-session: equipment constraint encountered, or user reports difficulty → the AL-04 SUBSTITUTE/REGRESS target for that movement | AUTO target: HIGH; ADVISORY target: any | once per movement per session |
| G7 | Deload/stop guidance | Session-level HARD/VERY_HARD + recovery frame, or user pain/discomfort language | HIGH | once, gentle, non-medical (§7) |

**Stay-silent rules (explicit):**

- No talking during an active rep (G3/G4 are post-rep or between sets).
- No repeated identical intervention (suppression list per session).
- No commentary on signals with no actionable response ("your tempo is
  fine" is not an intervention).
- No encouragement when the data contradicts it (fabricated praise is
  banned — a low-completion session gets guidance, not "great job").
- No intervention at all when the pre-session basis was `INSUFFICIENT_DATA`
  beyond neutral G1.

## 6. Tone rules (operationalizing "not policing")

1. **Suggestions, not commands:** "try", "you could", "let's" — never
   "you must", "you failed".
2. **Specific + actionable:** every correction names the movement, the
   observed proxy, and the alternative ("Slow the descent on push-ups —
   the lowering phase was about half a second.").
3. **No negative labels:** no "bad form", "wrong", "too weak" — describe
   the signal, not the person.
4. **No medical language:** pain/discomfort copy says stop and rest, never
   "injury", "diagnosis", or anatomical claims (§7).
5. **EN-first, keyed copy:** all intervention text is a stable key with EN
   default; FA only from a verified corpus (MG-07 rules). No free-text
   generation, no invented Persian.
6. **One voice:** a message is said once, clearly, then the Companion goes
   quiet until the next grounded trigger.

## 7. Safety boundary (fitness-not-medical)

- The Companion gives **training guidance**, never diagnosis or medical
  advice. HIGH-severity AL-04 flags (recurring difficulty, deload holds)
  render as conservative load management ("Take this one down a notch")
  with the decision's rationale, never as health claims.
- User-reported pain/discomfort language triggers G7 only: a single gentle
  stop/rest message. The user, not the Companion, decides medical matters;
  the Companion must not argue, minimize, or diagnose.
- Nothing in this spec authorizes collecting, storing, or transmitting any
  camera/pose data. C1 raw video stays on-device (TS-01); C2 derived
  signals require the CP-03 feasibility + CP-04 consent architecture before
  any collection.

## 8. Privacy posture (inherited from TS-01)

- Companion guidance is a **pure function of session state + decisions** —
  it adds no new data classes of its own in this stage.
- Observation signals (CP-02) are C2-class: collected only with explicit,
  granular, revocable consent; purpose-bound; deletable with the account.
- On-device inference is the preferred posture; raw video never leaves the
  device (deferred to CP-03/CP-04 for feasibility + consent design).

## 9. Acceptance

- [x] every Companion capability from strategy §2D covered: workout
      guidance (G1), rep/phase awareness (G2), form feedback (G3), useful
      correction (G4), encouragement (G5), contextual substitutions/
      regressions (G6), workout observation feeding adaptation (CP-02 +
      post-session bridge); camera/pose explicitly deferred to CP-03/CP-04;
- [x] intervention model documented with concrete examples and thresholds
      (G1–G7 tables);
- [x] "not policing" operationalized: silence-by-default, value-over-noise,
      guidance-not-criticism rules + tone rules (§6) + stay-silent rules (§5);
- [x] AL-04 apply-mode contract (§4) — AUTO applied/announced, ADVISORY
      confirmed, INSUFFICIENT_DATA silent;
- [x] safety boundary (§7) and privacy posture (§8) consistent with
      TS-01/AL-01/AL-02/AL-04 contracts; additive — no existing contract
      changed; no runtime wiring.

## 10. Related

- `docs/adr/0018-companion-architecture.md` — decision record
- `docs/architecture/AL-04-ADAPTIVE-TRAINING-GRAPH.md` — `AdaptiveDecisionOutput` (apply modes, flags)
- `docs/architecture/TS-01-PRIVACY-SAFETY-ARCHITECTURE.md` — data classes, consent, safety boundary
- `docs/TASKS.md` — CP-01 queue entry (DELIVERED / CLOSED; CP-02 deps CP-01)