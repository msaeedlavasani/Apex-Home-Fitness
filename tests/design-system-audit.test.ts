import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAudit } from '../scripts/audit-design-system.mjs';

/**
 * Design-system integration guard.
 *
 * Fails whenever the multi-platform token/utility layer drifts:
 *  - a Tailwind class referencing the apple, apex or material namespaces
 *    (or a custom font / ease / shadow / backdrop-blur / rounded key) is used
 *    in src but not defined in infra/config/tailwind.config.js;
 *  - a var(--x) consumed in src is not defined in src/app/globals.css;
 *  - a safelisted/custom class is missing from globals.css;
 *  - globals.css contains duplicated selector blocks;
 *  - a token documented in docs/DESIGN_SYSTEM.md is not implemented.
 */
test('design system audit: no used-but-undefined tokens/utilities', () => {
  const { violations } = runAudit();
  assert.deepEqual(violations, []);
});
