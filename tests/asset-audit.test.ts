import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runAudit} from '../scripts/audit-assets.mjs';

/**
 * Unified Asset Pipeline integration guard.
 *
 * Fails whenever the asset contracts drift:
 *  - manifest.json references an icon that is missing or whose declared PNG
 *    dimensions do not match the real file;
 *  - service-worker.js precaches a file that does not exist under public/
 *    (or precaches '/' — a 307 redirect that made install fail) or points
 *    the offline fallback at a missing page;
 *  - public/offline.html depends on external origins or scripts;
 *  - next.config.mjs drops the CSP allowlist for external demo media or the
 *    HTTP cache policy for icons/offline.html;
 *  - runtime code in src/ references a same-origin asset that does not exist
 *    under public/ (references in comments, e.g. JSDoc examples for future
 *    /videos, /posters, /animations assets, are allowed).
 *
 * See docs/ASSETS.md for the full policy.
 */
test('asset audit: no broken or inconsistent asset references', () => {
  const {violations} = runAudit();
  assert.deepEqual(violations, []);
});
