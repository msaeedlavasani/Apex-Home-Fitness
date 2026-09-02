/**
 * MG-05 — Normalization / dedup / identity resolution tests.
 *
 * Proves the S02-E classifier pattern ported to the Movement domain:
 * determinism, FA/EN normalization, AUTO/ALIAS classification, the
 * `Side-Lying Leg Lift` AMBIGUOUS regression, the deterministic fuzzy tier
 * (suggestions only — never auto-resolve), batch dedup, slug collisions,
 * and the evidence-model report invariants.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildIdentityReport,
  classifyMovementName,
  findDuplicateNames,
  fuzzySuggestions,
  hasFaScript,
  levenshteinDistance,
  normalizeFaName,
  normalizeMovementName,
  similarityScore,
  verifyIdentityReport,
} from '../src/lib/movement/index';

describe('MG-05 normalization (FA/EN)', () => {
  it('EN names use the S02-A normalization (case, trim, collapse, punctuation)', () => {
    assert.equal(normalizeMovementName('  Push-Up  '), 'push-up');
    assert.equal(normalizeMovementName('Mountain   Climbers'), 'mountain climbers');
    assert.equal(normalizeMovementName("Plank to Push-Up"), 'plank to push-up');
    assert.equal(normalizeMovementName('Jump Squats.'), 'jump squats.'); // no invented punctuation rules
  });

  it('hasFaScript detects Persian/Arabic script', () => {
    assert.equal(hasFaScript('اسکوات'), true);
    assert.equal(hasFaScript('Push-Up'), false);
    assert.equal(hasFaScript(''), false);
  });

  it('FA names take the Persian normalization path', () => {
    assert.equal(normalizeMovementName('اسکوات'), normalizeFaName('اسکوات'));
    assert.equal(normalizeMovementName('Push-Up'), 'push-up');
  });

  it('normalizeFaName maps Arabic letters to Persian canonical forms', () => {
    assert.equal(normalizeFaName('كتاب'), normalizeFaName('کتاب'));
    assert.equal(normalizeFaName('ي'), 'ی');
    assert.equal(normalizeFaName('أحمد'), normalizeFaName('احمد'));
    assert.equal(normalizeFaName('إيران'), normalizeFaName('ايران'));
    assert.equal(normalizeFaName('آب'), normalizeFaName('اب'));
  });

  it('normalizeFaName strips diacritics/tatweel and de-spaces ZWNJ deterministically', () => {
    assert.equal(normalizeFaName('مدرّس'), 'مدرس');
    assert.equal(normalizeFaName('بـ ـس'), 'ب س');
    assert.equal(normalizeFaName('می‌ روم'), normalizeFaName('می‌روم'));
  });
});

describe('MG-05 classification (S02-E model)', () => {
  it('exact normalized canonical name → AUTO', () => {
    const r = classifyMovementName('Downward-Facing Dog');
    assert.equal(r.cls, 'AUTO');
    assert.equal(r.slug, 'downward-facing-dog');
  });

  it('exact normalized alias → ALIAS', () => {
    const r = classifyMovementName('Pushups');
    assert.equal(r.cls, 'ALIAS');
    assert.equal(r.slug, 'push-up');
  });

  it('Side-Lying Leg Lift is AMBIGUOUS with both candidates surfaced (S02-E regression)', () => {
    const r = classifyMovementName('Side-Lying Leg Lift');
    assert.equal(r.cls, 'AMBIGUOUS');
    assert.deepEqual(r.candidates, ['side-kick-side-leg-lifts', 'side-lying-leg-lift']);
    assert.equal(r.slug, undefined);
  });

  it('ambiguous identity is never resolved (no slug issued)', () => {
    const r = classifyMovementName('Side-Lying Leg Lift');
    assert.equal(r.slug, undefined);
    assert.equal(r.cls, 'AMBIGUOUS');
  });

  it('name with no exact match and no fuzzy hit → UNRESOLVED', () => {
    const r = classifyMovementName('Zero-G Unknown Movement 3000');
    assert.equal(r.cls, 'UNRESOLVED');
    assert.equal(r.suggestions?.length ?? 0, 0);
  });

  it('deterministic fuzzy tier surfaces ranked suggestions but never resolves', () => {
    const r = classifyMovementName('Side-Lying Leg Lft'); // transposition typo
    assert.equal(r.cls, 'UNRESOLVED_WITH_SUGGESTIONS');
    assert.ok(r.suggestions && r.suggestions.length > 0);
    // Suggestions are evidence only — no canonical slug claimed.
    assert.equal(r.slug, undefined);
    // Deterministic order: score DESC, then name ASC.
    for (let i = 1; i < r.suggestions.length; i++) {
      assert.ok(r.suggestions[i - 1].score >= r.suggestions[i].score);
    }
  });

  it('classifier is deterministic: identical inputs → identical outputs', () => {
    const names = ['Bodyweight Squat', 'Pushups', 'Side-Lying Leg Lift', 'Zero-G X 3000', 'Side-Lying Leg Lft'];
    for (const name of names) {
      const a = classifyMovementName(name);
      const b = classifyMovementName(name);
      assert.deepEqual(b, a, `non-deterministic classification for ${name}`);
    }
  });
});

describe('MG-05 fuzzy tier primitives', () => {
  it('levenshteinDistance is deterministic and symmetric', () => {
    assert.equal(levenshteinDistance('push-up', 'push-up'), 0);
    assert.equal(levenshteinDistance('kitten', 'sitting'), 3);
    assert.equal(levenshteinDistance('abc', 'abc'), levenshteinDistance('abc', 'abc'));
  });

  it('similarityScore is in [0,1] and deterministic', () => {
    assert.equal(similarityScore('abc', 'abc'), 1);
    assert.equal(similarityScore('', ''), 1);
    const s = similarityScore('push-up', 'pushup');
    assert.ok(s >= 0 && s <= 1);
    assert.equal(s, similarityScore('push-up', 'pushup'));
  });

  it('fuzzySuggestions is deterministic and capped', () => {
    const a = fuzzySuggestions('dead bug', undefined, { maxResults: 3 });
    const b = fuzzySuggestions('dead bug', undefined, { maxResults: 3 });
    assert.deepEqual(b, a);
    assert.ok(a.length <= 3);
  });
});

describe('MG-05 batch dedup + collisions + report (S02-E evidence model)', () => {
  it('findDuplicateNames groups distinct raw names sharing a normalized form', () => {
    const groups = findDuplicateNames(['Burpee', 'burpee  ', 'Push-Up', 'Burpees']);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].normalizedName, 'burpee');
    assert.deepEqual(groups[0].names, ['Burpee', 'burpee  ']);
  });

  it('buildIdentityReport produces S02-E-model counts and decisions', () => {
    const names = ['Downward-Facing Dog', 'Pushups', 'Side-Lying Leg Lift', 'Zero-G X 3000'];
    const report = buildIdentityReport(names);
    assert.equal(report.counts.AUTO, 1);
    assert.equal(report.counts.ALIAS, 1);
    assert.equal(report.counts.AMBIGUOUS, 1);
    assert.equal(report.counts.UNRESOLVED, 1);
    assert.equal(report.counts.UNRESOLVED_WITH_SUGGESTIONS, 0);
    assert.equal(report.rows.length, 4);

    const byName = new Map(report.rows.map((r) => [r.name, r]));
    assert.equal(byName.get('Downward-Facing Dog')?.decision, 'APPLY');
    assert.equal(byName.get('Pushups')?.decision, 'APPLY');
    assert.equal(byName.get('Side-Lying Leg Lift')?.decision, 'SKIP_AMBIGUOUS');
    assert.equal(byName.get('Zero-G X 3000')?.decision, 'SKIP_UNRESOLVED');
  });

  it('ambiguous rows surface candidates in the report (Owner-decision surface)', () => {
    const report = buildIdentityReport(['Side-Lying Leg Lift']);
    assert.equal(report.ambiguous.length, 1);
    assert.deepEqual(report.ambiguous[0].candidates, ['side-kick-side-leg-lifts', 'side-lying-leg-lift']);
  });

  it('slug collisions are detected (two rows claiming the same canonical slug)', () => {
    // 'Push-Up' (exact name) and 'Pushups' (alias) both claim slug push-up.
    const report = buildIdentityReport(['Push-Up', 'Pushups']);
    assert.equal(report.collisions.length, 1);
    assert.equal(report.collisions[0].slug, 'push-up');
    assert.deepEqual(report.collisions[0].names, ['Push-Up', 'Pushups']);
  });

  it('verifyIdentityReport: clean batch PASSes', () => {
    const report = buildIdentityReport(['Downward-Facing Dog', 'Pushups', 'Zero-G X 3000']);
    const v = verifyIdentityReport(report);
    assert.equal(v.status, 'PASS');
    assert.deepEqual(v.problems, []);
  });

  it('verifyIdentityReport: collided slug FAILs (BLOCKED_COLLISION model)', () => {
    const report = buildIdentityReport(['Push-Up', 'Pushups']);
    const v = verifyIdentityReport(report);
    assert.equal(v.status, 'FAIL');
    assert.ok(v.problems.some((p) => p.includes('push-up')));
  });

  it('report is deterministic across runs', () => {
    const names = ['Downward-Facing Dog', 'Pushups', 'Side-Lying Leg Lift', 'Zero-G X 3000', 'Burpee', 'burpee  '];
    const a = buildIdentityReport(names);
    const b = buildIdentityReport(names);
    assert.deepEqual(b, a);
  });
});