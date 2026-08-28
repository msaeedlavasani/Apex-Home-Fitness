import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, chmodSync, rmSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {
  checkDbWritable,
  isDbVolumeWritable,
  isDirWritable,
  resolveDbFilePath,
} from '../scripts/preflight-db.mjs';

// ---------------------------------------------------------------------------
// resolveDbFilePath
// ---------------------------------------------------------------------------

test('resolveDbFilePath: strips the file: prefix', () => {
  assert.equal(resolveDbFilePath('file:/data/app.db'), '/data/app.db');
  assert.equal(resolveDbFilePath('file:./dev.db'), './dev.db');
  assert.equal(resolveDbFilePath('file:relative.db'), 'relative.db');
});

test('resolveDbFilePath: returns null for non-file providers', () => {
  assert.equal(resolveDbFilePath('postgresql://user:pass@host/db'), null);
  assert.equal(resolveDbFilePath('mysql://user@host/db'), null);
  assert.equal(resolveDbFilePath(undefined), null);
  assert.equal(resolveDbFilePath(''), null);
});

// ---------------------------------------------------------------------------
// isDirWritable / isDbVolumeWritable
// ---------------------------------------------------------------------------

test('isDirWritable: writable temp dir returns true', () => {
  const dir = mkdtempSync(join(tmpdir(), 'apex-preflight-'));
  try {
    assert.equal(isDirWritable(dir), true);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});

test('isDirWritable: read-only dir returns false', () => {
  const dir = mkdtempSync(join(tmpdir(), 'apex-preflight-ro-'));
  try {
    chmodSync(dir, 0o555);
    // Probe-write must fail on a read-only directory (running as non-root).
    assert.equal(isDirWritable(dir), false);
  } finally {
    chmodSync(dir, 0o755);
    rmSync(dir, {recursive: true, force: true});
  }
});

test('isDbVolumeWritable: existing writable file in writable dir → true', () => {
  const dir = mkdtempSync(join(tmpdir(), 'apex-preflight-db-'));
  const db = join(dir, 'app.db');
  try {
    writeFileSync(db, 'sqlite');
    chmodSync(db, 0o644);
    assert.equal(isDbVolumeWritable(db), true);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});

test('isDbVolumeWritable: existing read-only file → false', () => {
  const dir = mkdtempSync(join(tmpdir(), 'apex-preflight-db-ro-'));
  const db = join(dir, 'app.db');
  try {
    writeFileSync(db, 'sqlite');
    chmodSync(db, 0o444);
    assert.equal(isDbVolumeWritable(db), false);
  } finally {
    chmodSync(db, 0o644);
    rmSync(dir, {recursive: true, force: true});
  }
});

test('isDbVolumeWritable: missing file in writable dir → true (fresh volume)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'apex-preflight-missing-'));
  try {
    assert.equal(isDbVolumeWritable(join(dir, 'app.db')), true);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});

test('isDbVolumeWritable: missing file in read-only dir → false', () => {
  const dir = mkdtempSync(join(tmpdir(), 'apex-preflight-missing-ro-'));
  try {
    chmodSync(dir, 0o555);
    assert.equal(isDbVolumeWritable(join(dir, 'app.db')), false);
  } finally {
    chmodSync(dir, 0o755);
    rmSync(dir, {recursive: true, force: true});
  }
});

// ---------------------------------------------------------------------------
// checkDbWritable (the CLI contract)
// ---------------------------------------------------------------------------

test('checkDbWritable: non-file provider passes without message', () => {
  const result = checkDbWritable('postgresql://u:p@h/db');
  assert.deepEqual(result, {ok: true});
});

test('checkDbWritable: writable file volume passes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'apex-preflight-ok-'));
  const db = join(dir, 'app.db');
  try {
    writeFileSync(db, 'sqlite');
    const result = checkDbWritable(`file:${db}`);
    assert.equal(result.ok, true);
    assert.equal(result.message, undefined);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});

test('checkDbWritable: read-only volume fails with actionable message', () => {
  const dir = mkdtempSync(join(tmpdir(), 'apex-preflight-fail-'));
  const db = join(dir, 'app.db');
  try {
    writeFileSync(db, 'sqlite');
    chmodSync(db, 0o444);
    chmodSync(dir, 0o555);
    const result = checkDbWritable(`file:${db}`);
    assert.equal(result.ok, false);
    assert.ok(result.message!.includes('chown -R 100:101'), 'message includes the host fix command');
    assert.ok(result.message!.includes('readonly database'), 'message explains the failure');
  } finally {
    chmodSync(dir, 0o755);
    chmodSync(db, 0o644);
    rmSync(dir, {recursive: true, force: true});
  }
});

test('checkDbWritable: missing volume dir (not writable parent) fails', () => {
  // A path inside a read-only parent must fail even when the file is missing.
  const dir = mkdtempSync(join(tmpdir(), 'apex-preflight-missing2-'));
  try {
    chmodSync(dir, 0o555);
    const result = checkDbWritable(`file:${join(dir, 'sub', 'app.db')}`);
    assert.equal(result.ok, false);
  } finally {
    chmodSync(dir, 0o755);
    rmSync(dir, {recursive: true, force: true});
  }
});

test('isDbVolumeWritable: probe file does not survive the check', () => {
  const dir = mkdtempSync(join(tmpdir(), 'apex-preflight-clean-'));
  try {
    assert.equal(isDbVolumeWritable(join(dir, 'app.db')), true);
    const leftovers = readdirSync(dir).filter((f) => f.startsWith('.apex-write-probe-')).length;
    assert.equal(leftovers, 0);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});
