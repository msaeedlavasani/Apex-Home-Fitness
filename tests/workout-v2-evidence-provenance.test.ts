import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('Workout V2 evidence classes remain distinct and deployed proof is downstream', async () => {
  const source = await fs.readFile('docs/governance/WORKOUT-V2-EVIDENCE-PROVENANCE.md', 'utf8');
  for (const evidenceClass of ['STATIC', 'UNIT', 'INTEGRATION', 'SIMULATED_SENSOR', 'REAL_CAMERA', 'REAL_POSE_RUNTIME', 'REAL_CALIBRATION', 'REAL_DEVICE', 'DEPLOYED_BETA_RUNTIME']) {
    assert.match(source, new RegExp(`\\`${evidenceClass}\\``));
  }
  assert.match(source, /cannot be promoted/);
  assert.match(source, /Dashboard.*Program.*Workout/);
  assert.match(source, /exact deployed source\/build identity/);
});
