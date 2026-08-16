import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runAudit} from '../scripts/audit-assets.mjs';

/**
 * Focused typography / RTL audit — Persian (fa) font contract.
 *
 * Guards the Batch 13 "self-hosted Vazirmatn" work:
 *  - Persian text resolves to a real, self-hosted Vazirmatn webfont
 *    (next/font/local, served same-origin) — no Google Fonts / CDN
 *    requests, so PWA offline and CSP `font-src 'self' data:` hold.
 *  - The CSS cascade applies Vazirmatn to every RTL/Persian page on every
 *    platform (the `html[dir='rtl'] body` rule outranks the material
 *    platform body rule, so fa on Android still gets Vazirmatn instead of
 *    falling back to a system Arabic font).
 *  - Zero tracking stays enforced for Persian (DESIGN_SYSTEM.md §4:
 *    negative tracking is forbidden for RTL).
 *  - The English Inter / Roboto stacks remain untouched.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

const LAYOUT = 'src/app/[locale]/layout.tsx';
const GLOBALS = 'src/app/globals.css';
const TAILWIND = 'infra/config/tailwind.config.js';
const NEXT_CONFIG = 'next.config.mjs';

test('font audit: asset pipeline passes with self-hosted fonts', () => {
  const {violations} = runAudit();
  assert.deepEqual(violations, []);
});

test('layout.tsx: Vazirmatn is self-hosted via next/font/local', () => {
  const layout = read(LAYOUT);

  assert.match(layout, /import\s+localFont\s+from\s+'next\/font\/local'/, 'must import next/font/local');
  assert.match(layout, /next\/font\/google/, 'English Inter/Roboto stacks must be preserved');
  assert.match(layout, /const\s+vazirmatn\s*=\s*localFont\(\{/, 'must declare Vazirmatn via localFont');
  assert.match(layout, /--font-vazirmatn/, 'must expose the --font-vazirmatn variable');

  // The referenced woff2 must actually exist next to the layout.
  const srcMatch = layout.match(/src:\s*'(\.\.?\/[^']+\.woff2)'/);
  assert.ok(srcMatch, 'must reference a local .woff2 src');
  const fontPath = resolve(dirname(resolve(ROOT, LAYOUT)), srcMatch![1]);
  assert.ok(existsSync(fontPath), `referenced font file must exist (${srcMatch![1]})`);
});

test('globals.css: RTL/Persian body resolves to the self-hosted Vazirmatn first', () => {
  const css = read(GLOBALS);

  // The RTL rule must be a body-level rule with higher specificity than
  // `[data-platform='material'] body`, so fa on Android still gets
  // Vazirmatn (Roboto has no Persian glyphs).
  assert.match(css, /html\[dir='rtl'\]\s*body/, 'RTL rule must target html[dir=rtl] body');
  assert.match(css, /html\[lang='fa'\]\s*body/, 'RTL rule must target html[lang=fa] body');

  // Capture the whole rule block (the doc comment above it also mentions
  // the selector, so match from the selector to the closing brace).
  const ruleMatch = css.match(/html\[dir='rtl'\]\s*body[^{]*\{[^}]*\}/);
  assert.ok(ruleMatch, 'must find the complete RTL body rule block');
  const rtlRule = ruleMatch![0];
  const vazirmatnPos = rtlRule.indexOf('var(--font-vazirmatn)');
  const fallbackPos = rtlRule.indexOf("'Vazirmatn'");
  assert.ok(vazirmatnPos !== -1 && vazirmatnPos < fallbackPos,
    'self-hosted variable must precede the named Vazirmatn fallback');
  assert.match(rtlRule, /letter-spacing:\s*0\s*!important/,
    'zero tracking must be enforced for Persian (no negative tracking in RTL)');
});

test('tailwind.config.js: sans stack keeps self-hosted Vazirmatn before named fallback', () => {
  const tw = read(TAILWIND);
  const sansIdx = tw.indexOf("sans: [");
  const sansBlock = tw.slice(sansIdx, tw.indexOf("],", sansIdx));
  const vazirmatnPos = sansBlock.indexOf('var(--font-vazirmatn)');
  const fallbackPos = sansBlock.indexOf("'Vazirmatn'");
  assert.ok(vazirmatnPos !== -1, 'sans stack must include var(--font-vazirmatn)');
  assert.ok(vazirmatnPos < fallbackPos,
    'self-hosted Vazirmatn must precede the named fallback in the sans stack');
  // Inter / Roboto entries must survive untouched.
  assert.match(sansBlock, /var\(--font-inter\)/);
  assert.match(sansBlock, /var\(--font-roboto\)/);
});

test('CSP: fonts are same-origin only (font-src \'self\' data:)', () => {
  const cfg = read(NEXT_CONFIG);
  assert.match(cfg, /font-src\s+'self'\s+data:/, 'CSP font-src must stay "self data:"');
});

test('no external font requests anywhere (offline/PWA compatibility)', () => {
  const origins = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'fonts.cdnfonts.com',
    'cdn.jsdelivr.net',
    'unpkg.com',
  ];
  const files = [LAYOUT, GLOBALS, TAILWIND, NEXT_CONFIG, 'public/service-worker.js', 'public/offline.html'];
  for (const rel of files) {
    const text = read(rel);
    for (const origin of origins) {
      assert.ok(!text.includes(origin), `${rel} must not reference external font origin "${origin}"`);
    }
  }
});
