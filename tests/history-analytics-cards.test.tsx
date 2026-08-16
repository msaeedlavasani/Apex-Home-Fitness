/**
 * Component tests for the bilingual History / Analytics data cards,
 * skeletons and empty states (Batch 13 — empty-state data cards).
 *
 * Renders the pure presentational components with react-test-renderer (no
 * DOM available in the Node test environment) and a stub translator, then
 * asserts the data wiring (which message keys receive which values), the
 * loading / no-data semantics (`role="status"`, `sr-only` text, `aria-hidden`
 * placeholders) and the empty-state CTA.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import {HistorySummary} from '../src/components/history/HistorySummary';
import {HistorySkeleton} from '../src/components/history/HistorySkeleton';
import {HistoryEmpty} from '../src/components/history/HistoryEmpty';
import {AnalyticsSummary} from '../src/components/analytics/AnalyticsSummary';
import {AnalyticsSkeleton} from '../src/components/analytics/AnalyticsSkeleton';
import {AnalyticsEmpty} from '../src/components/analytics/AnalyticsEmpty';
import type {WorkoutAnalytics} from '../src/services/analyticsService';

const ANALYTICS: WorkoutAnalytics = {
  totalSessions: 12,
  activeDays: 8,
  totalSets: 86,
  totalReps: 1240,
  totalDurationSeconds: 5400, // 90 minutes
  totalCaloriesBurned: 950,
  estimated: false,
  weeklyVolume: {
    weekStart: new Date('2026-08-10T00:00:00Z'),
    weekEnd: new Date('2026-08-17T00:00:00Z'),
    sessions: 2,
    sets: 14,
    reps: 180,
  },
  currentStreak: 7,
  streakEndDate: new Date('2026-08-16T00:00:00Z'),
  firstWorkoutAt: new Date('2026-01-05T08:00:00Z'),
  lastWorkoutAt: new Date('2026-08-15T08:00:00Z'),
};

interface TCall {
  key: string;
  values?: Record<string, unknown>;
}

/** Stub translator that records calls and echoes the key as its output. */
function makeT() {
  const calls: TCall[] = [];
  const t = (key: string, values?: Record<string, unknown>) => {
    calls.push({key, values});
    return key;
  };
  return {t, calls};
}

function assertCall(calls: TCall[], key: string, values?: Record<string, unknown>) {
  const call = calls.find(
    (entry) =>
      entry.key === key &&
      JSON.stringify(entry.values ?? null) === JSON.stringify(values ?? null),
  );
  assert.ok(call, `expected translator call for "${key}" with ${JSON.stringify(values)}`);
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

test('HistorySummary renders four cards wired to the analytics snapshot', () => {
  const {t, calls} = makeT();
  const renderer = TestRenderer.create(
    <HistorySummary analytics={ANALYTICS} t={t} />,
  );
  const root = renderer.root;

  // Labels come from the summary.* keys.
  for (const key of [
    'summary.sessions',
    'summary.volume',
    'summary.activeDays',
    'summary.streak',
  ]) {
    assert.ok(root.findAllByProps({children: key}).length > 0, `label ${key}`);
  }
  // Values receive the right data.
  assertCall(calls, 'summaryUnits.sessions', {count: 12});
  assertCall(calls, 'summaryUnits.volume', {sets: 86, reps: 1240});
  assertCall(calls, 'summaryUnits.days', {count: 8}); // active days
  assertCall(calls, 'summaryUnits.days', {count: 7}); // current streak

  // Section is labelled for assistive tech and icons are decorative.
  const section = root.findByType('section');
  assert.equal(section.props['aria-label'], 'title');
  assert.equal(section.props.className.includes('grid'), true);
  assert.ok(root.findAllByProps({'aria-hidden': 'true'}).length >= 4);
  assert.equal(root.findAllByType('section')[0].children.length, 4);
});

test('HistorySummary respects an explicit section label', () => {
  const {t} = makeT();
  const renderer = TestRenderer.create(
    <HistorySummary analytics={ANALYTICS} t={t} label="My sessions" />,
  );
  assert.equal(renderer.root.findByType('section').props['aria-label'], 'My sessions');
});

test('HistorySkeleton announces loading and renders four pulsing cards', () => {
  const {t, calls} = makeT();
  const renderer = TestRenderer.create(<HistorySkeleton t={t} />);
  const root = renderer.root;

  const status = root.findByProps({role: 'status'});
  assert.equal(status.props['aria-label'], 'loading');
  assertCall(calls, 'loading', undefined);
  // sr-only loading text; the grid + wide block are the decorative containers.
  assert.ok(root.findByProps({className: 'sr-only'}).children.includes('loading'));
  const pulsing = root.findAllByProps({className: 'glass animate-pulse rounded-2xl p-4'});
  assert.equal(pulsing.length, 4);
  assert.equal(root.findAllByProps({'aria-hidden': 'true'}).length, 2);
});

test('HistoryEmpty renders the bilingual empty state with a CTA', () => {
  const {t, calls} = makeT();
  const renderer = TestRenderer.create(<HistoryEmpty t={t} ctaHref="/en/workout" />);
  const root = renderer.root;

  assert.ok(root.findByProps({role: 'status'}));
  for (const key of ['emptyState.title', 'emptyState.description', 'emptyState.action']) {
    assertCall(calls, key, undefined);
  }
  const cta = root.findByType('a');
  assert.equal(cta.props.href, '/en/workout');
  assert.equal(cta.props.children, 'emptyState.action');
});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

test('AnalyticsSummary renders four all-time stat cards wired to the snapshot', () => {
  const {t, calls} = makeT();
  const renderer = TestRenderer.create(
    <AnalyticsSummary analytics={ANALYTICS} t={t} />,
  );
  const root = renderer.root;

  for (const key of ['stats.sessions', 'stats.volume', 'stats.minutes', 'stats.calories']) {
    assert.ok(root.findAllByProps({children: key}).length > 0, `label ${key}`);
  }
  assertCall(calls, 'statsUnits.sessions', {count: 12});
  assertCall(calls, 'statsUnits.sets', {count: 86});
  assertCall(calls, 'statsUnits.minutes', {count: 90}); // floor(5400 / 60)
  assertCall(calls, 'statsUnits.calories', {count: 950});

  const section = root.findByType('section');
  assert.equal(section.props['aria-label'], 'stats.title');
  assert.equal(section.children.length, 4);
});

test('AnalyticsSkeleton announces loading with pulsing placeholders', () => {
  const {t, calls} = makeT();
  const renderer = TestRenderer.create(<AnalyticsSkeleton t={t} />);
  const root = renderer.root;

  const status = root.findByProps({role: 'status'});
  assert.equal(status.props['aria-label'], 'loading');
  assertCall(calls, 'loading', undefined);
  assert.ok(root.findByProps({className: 'sr-only'}).children.includes('loading'));
  // Grid holds exactly 4 card placeholders; the decorative containers are hidden.
  const pulsing = root.findAllByProps({className: 'glass animate-pulse rounded-2xl p-4'});
  assert.equal(pulsing.length, 4);
  assert.equal(root.findAllByProps({'aria-hidden': 'true'}).length, 2);
});

test('AnalyticsEmpty renders the bilingual empty state with a CTA', () => {
  const {t, calls} = makeT();
  const renderer = TestRenderer.create(<AnalyticsEmpty t={t} ctaHref="/fa/workout" />);
  const root = renderer.root;

  assert.ok(root.findByProps({role: 'status'}));
  for (const key of ['emptyState.title', 'emptyState.description', 'emptyState.action']) {
    assertCall(calls, key, undefined);
  }
  const cta = root.findByType('a');
  assert.equal(cta.props.href, '/fa/workout');
  assert.equal(cta.props.children, 'emptyState.action');
});
