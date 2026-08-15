import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WallClockAccumulator,
  advanceBaseline,
  secondsBetween,
} from '../src/lib/workout/wallClock';

test('secondsBetween floors real elapsed time and ignores null bases', () => {
  assert.equal(secondsBetween(null, 5_000), 0);
  assert.equal(secondsBetween(0, 0), 0);
  assert.equal(secondsBetween(0, 999), 0);
  assert.equal(secondsBetween(0, 1_000), 1);
  assert.equal(secondsBetween(1_000, 3_500), 2);
  // Clock moved backwards (NTP correction) → never negative.
  assert.equal(secondsBetween(5_000, 1_000), 0);
});

test('advanceBaseline carries the sub-second remainder forward', () => {
  // base=1000, now=1450 → baseline stays 1000 (450ms remainder carried).
  assert.equal(advanceBaseline(1_000, 1_450), 1_000);
  // base=1000, now=2500 → 1500ms elapsed → baseline 2000.
  assert.equal(advanceBaseline(1_000, 2_500), 2_000);
  // Backwards clock → snap to now so the next account restarts cleanly.
  assert.equal(advanceBaseline(5_000, 3_000), 3_000);
});

test('accumulator sums floor seconds across irregular intervals without drift', () => {
  const acc = new WallClockAccumulator();
  acc.start(0);
  // 4.5s since start → 4 whole seconds, remainder carried.
  assert.equal(acc.account(4_500), 4);
  // 3.5s later (8s total) → 4 more seconds (total 8 over 8 real seconds).
  assert.equal(acc.account(8_000), 4);
  // 600ms later → 0 (remainder accumulates).
  assert.equal(acc.account(8_600), 0);
  // 1s later → 1 (total 9 over 9.6s → floor 9). No drift, no loss.
  assert.equal(acc.account(9_600), 1);
});

test('accumulator counts nothing while paused and restarts fresh on start', () => {
  const acc = new WallClockAccumulator();
  acc.start(0);
  assert.equal(acc.account(2_000), 2);
  acc.pause();
  assert.equal(acc.isRunning, false);
  // 50s of paused time must never be counted.
  assert.equal(acc.account(52_000), 0);
  acc.start(52_000);
  assert.equal(acc.account(55_000), 3);
});

test('accumulator catches up exactly after a long backgrounded gap', () => {
  const acc = new WallClockAccumulator();
  acc.start(0);
  assert.equal(acc.account(1_000), 1);
  // Simulate a backgrounded tab: interval stops firing, 90s pass at once.
  assert.equal(acc.account(91_000), 90);
  // And a second catch-up call (e.g. pageshow after focus) adds nothing more.
  assert.equal(acc.account(91_000), 0);
  // Normal ticking resumes.
  assert.equal(acc.account(92_000), 1);
});

test('accumulator accepts an injectable clock and a zero call after start', () => {
  let now = 1_000_000;
  const acc = new WallClockAccumulator({ now: () => now });
  acc.start();
  assert.equal(acc.account(), 0);
  now += 3_200;
  assert.equal(acc.account(), 3);
  assert.equal(acc.isRunning, true);
});
