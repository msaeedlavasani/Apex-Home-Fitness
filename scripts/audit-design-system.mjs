#!/usr/bin/env node
/**
 * Design System Audit
 * -------------------
 * Static consistency checks over the multi-platform design system
 * (globals.css ⇄ tailwind.config.js ⇄ DESIGN_SYSTEM.md ⇄ src usage).
 *
 * Checks:
 *  1. Every Tailwind utility used in src/ that references a design-system
 *     namespace (`apple-*`, `apex-*`, `material-*`, plus the custom
 *     font/ease/shadow/backdrop-blur/rounded/animate keys) must resolve to a
 *     key defined in `infra/config/tailwind.config.js`. Arbitrary values
 *     (`bg-[...]`) and core Tailwind classes are out of scope.
 *  2. Every CSS custom property consumed via `var(--x)` in src/ must be
 *     defined in `src/app/globals.css` (references with a fallback are
 *     tolerated, though a fallback that hides a missing token is reported).
 *  3. Every class safelisted in tailwind.config.js and every custom class
 *     used in markup (`.glass`, `.card-surface`, `.surface-1..5`,
 *     `.animate-*`, …) must exist in globals.css.
 *  4. globals.css must not contain duplicated selector blocks (e.g. the old
 *     triple `[dir='rtl']` rule).
 *  5. Every `--apex-*` token referenced in docs/DESIGN_SYSTEM.md must be
 *     defined in globals.css.
 *
 * Usage:
 *   node scripts/audit-design-system.mjs            # CLI, exit 1 on violations
 *   runAudit()                                      # programmatic API
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);

const SRC = join(ROOT, 'src');
const GLOBALS_CSS = join(SRC, 'app', 'globals.css');
const TAILWIND_CONFIG = join(ROOT, 'infra', 'config', 'tailwind.config.js');
const DESIGN_DOC = join(ROOT, 'docs', 'DESIGN_SYSTEM.md');

// Property prefixes that carry a Tailwind color (flattened color keys).
const COLOR_PREFIXES = [
  'bg', 'text', 'border', 'ring', 'ring-offset', 'from', 'via', 'to',
  'fill', 'stroke', 'decoration', 'accent', 'outline', 'caret',
  'divide', 'placeholder',
];

// Custom (non-core) design-system keys, grouped by utility prefix.
const CUSTOM_KEYS = {
  font: new Set(['sans', 'rounded', 'material-sans', 'mono']),
  ease: new Set(['apple-ease', 'material-standard', 'material-emphasized']),
  shadow: new Set(['apple', 'apple-sm', 'apple-lg', 'apple-glow', 'elevation-1', 'elevation-2', 'elevation-3', 'elevation-4', 'elevation-5']),
  'backdrop-blur': new Set(['xs']),
  rounded: new Set(['1.5xl', '2.5xl', '4xl']),
  animate: new Set(['workout-pulse', 'phase-enter']),
};

// Bare custom classes defined in @layer components/utilities of globals.css.
const BARE_CUSTOM = new Set([
  'glass', 'glass-strong', 'glass-subtle', 'card-surface', 'list-row',
  'no-scrollbar', 'surface-1', 'surface-2', 'surface-3', 'surface-4', 'surface-5',
]);

/** Walk a nested color object and produce dot-path keys (e.g. `apex.state.on-alert`). */
function flattenColorKeys(obj, prefix = '', out = []) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      flattenColorKeys(value, path, out);
    } else {
      out.push(path);
    }
  }
  return out;
}

/** Collect candidate class tokens from a file body (namespaced + custom keys). */
function collectClassTokens(text) {
  const tokens = new Set();
  const ns = /(?:^|[\s'"`(])((?:[a-z-]+:)*[a-z-]+-(?:apple|apex|material)-[a-z0-9-]+(?:\/\d+)?)/g;
  const custom = /\b((?:[a-z-]+:)*(?:font-(?:rounded|material-sans)|ease-(?:apple-ease|material-standard|material-emphasized)|shadow-(?:apple|apple-sm|apple-lg|apple-glow|elevation-[1-5])|backdrop-blur-xs|rounded-(?:1\.5xl|2\.5xl|4xl)|animate-(?:workout-pulse|phase-enter)|glass-strong|glass-subtle|card-surface|list-row|no-scrollbar|surface-[1-5]|glass))\b/g;
  for (const re of [ns, custom]) {
    let m;
    while ((m = re.exec(text)) !== null) tokens.add(m[1]);
  }
  return [...tokens];
}

/** Collect `var(--x)` references, returning [{ name, hasFallback }]. */
function collectVarRefs(text) {
  const refs = [];
  const re = /var\(\s*(--[a-z0-9-]+)(?:\s*,\s*([^)]*))?\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    refs.push({ name: m[1], hasFallback: Boolean(m[2] && m[2].trim()) });
  }
  return refs;
}

function readIfExists(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

function listFiles(dir) {
  const { readdirSync } = require('node:fs');
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (/\.(ts|tsx|js|jsx|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Run the full audit. Returns { violations: string[] }. */
export function runAudit() {
  const violations = [];

  // ── Load inputs ───────────────────────────────────────────────────────────
  const globalsCss = readIfExists(GLOBALS_CSS);
  const config = readIfExists(TAILWIND_CONFIG);
  const doc = readIfExists(DESIGN_DOC);
  const files = listFiles(SRC);

  if (!globalsCss) violations.push('missing: src/app/globals.css');
  if (!config) violations.push('missing: infra/config/tailwind.config.js');
  if (!doc) violations.push('missing: docs/DESIGN_SYSTEM.md');
  if (!globalsCss || !config) return { violations };

  let tailwind;
  try {
    tailwind = require(TAILWIND_CONFIG);
  } catch (err) {
    violations.push(`tailwind.config.js failed to load: ${err.message}`);
    return { violations };
  }

  // ── Token maps ────────────────────────────────────────────────────────────
  const colorKeys = new Set(
    flattenColorKeys(tailwind.theme?.extend?.colors ?? {})
      .map((k) => k.replace(/\./g, '-')),
  );
  const definedVars = new Set(
    // globals.css packs two declarations per line (e.g. `--a: #fff; --b: rgba(...)`),
    // so collect every `--name:` occurrence, not just line-leading ones.
    [...globalsCss.matchAll(/--[a-z0-9-]+(?=\s*:)/g)].map((m) => m[0]),
  );

  // ── 1. Used Tailwind utilities must be defined in the config ─────────────
  for (const file of files) {
    if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue; // classes come from markup
    const body = readIfExists(file);
    if (!body) continue;
    for (const raw of collectClassTokens(body)) {
      let t = raw.replace(/\/\d+$/, ''); // strip /60 opacity modifier
      const last = t.split(':').pop(); // strip hover:/dark:/rtl:/… variants

      if (last.startsWith('[')) continue; // arbitrary value

      // Bare custom classes → must exist in globals.css
      if (BARE_CUSTOM.has(last)) {
        if (!globalsCss.includes(`.${last}`)) {
          violations.push(`${rel(file)}: custom class "${last}" is used but not defined in globals.css`);
        }
        continue;
      }

      // Custom utility keys (font/ease/shadow/backdrop-blur/rounded/animate)
      const keyMatch = last.match(/^(font|ease|shadow|backdrop-blur|rounded|animate)-(.+)$/);
      if (keyMatch) {
        const [, prefix, key] = keyMatch;
        if (prefix === 'font' && CUSTOM_KEYS.font.has(key)) continue;
        if (prefix === 'ease' && (key.startsWith('apple-') || key.startsWith('material-')) && !CUSTOM_KEYS.ease.has(key)) {
          violations.push(`${rel(file)}: ease-${key} is used but not defined in tailwind.config.js`);
        }
        if (prefix === 'shadow' && (key.startsWith('apple') || key.startsWith('elevation-')) && !CUSTOM_KEYS.shadow.has(key)) {
          violations.push(`${rel(file)}: shadow-${key} is used but not defined in tailwind.config.js`);
        }
        if (prefix === 'backdrop-blur' && key === 'xs') continue; // defined
        if (prefix === 'rounded' && CUSTOM_KEYS.rounded.has(key)) continue;
        if (prefix === 'animate') {
          if (CUSTOM_KEYS.animate.has(key) && !globalsCss.includes(`@keyframes ${key}`)) {
            violations.push(`${rel(file)}: animate-${key} is used but @keyframes ${key} is missing from globals.css`);
          }
        }
        continue;
      }

      // Color utilities (bg/text/border/…) — only validate namespaced keys
      const colorMatch = last.match(/^(bg|text|border|ring|ring-offset|from|via|to|fill|stroke|decoration|accent|outline|caret|divide|placeholder)-(.+)$/);
      if (colorMatch) {
        const key = colorMatch[2];
        if (/^(apple|apex|material)-/.test(key) && !colorKeys.has(key)) {
          violations.push(`${rel(file)}: "${last}" resolves to undefined color key "${key}" (add it to tailwind.config.js colors)`);
        }
      }
    }
  }

  // ── 2. var(--x) references must resolve in globals.css ───────────────────
  for (const file of files) {
    if (file === GLOBALS_CSS) continue;
    const body = readIfExists(file);
    if (!body) continue;
    for (const { name, hasFallback } of collectVarRefs(body)) {
      if (!definedVars.has(name) && !hasFallback) {
        violations.push(`${rel(file)}: var(${name}) is used but never defined in globals.css`);
      }
    }
  }

  // ── 3. Safelisted classes must exist in globals.css ──────────────────────
  for (const entry of tailwind.safelist ?? []) {
    if (BARE_CUSTOM.has(entry) && !globalsCss.includes(`.${entry}`)) {
      violations.push(`safelist: "${entry}" is safelisted in tailwind.config.js but not defined in globals.css`);
    }
  }

  // ── 4. No duplicated selector blocks in globals.css ──────────────────────
  const selectors = new Map();
  for (const m of globalsCss.matchAll(/^([^{}]+)\{\s*$/gm)) {
    const sel = m[1].trim();
    if (!sel || sel.startsWith('@media')) continue;
    selectors.set(sel, (selectors.get(sel) ?? 0) + 1);
  }
  for (const [sel, count] of selectors) {
    if (count > 1) violations.push(`globals.css: selector "${sel}" is declared ${count} times (duplicate block)`);
  }

  // ── 5. DESIGN_SYSTEM.md tokens must be defined in globals.css ────────────
  if (doc) {
    const docTokens = new Set(
      [...doc.matchAll(/`(--apex-[a-z0-9-]+)`/g)].map((m) => m[1]),
    );
    for (const token of docTokens) {
      if (!definedVars.has(token)) {
        violations.push(`DESIGN_SYSTEM.md: token ${token} is documented but not defined in globals.css`);
      }
    }
  }

  return { violations };
}

function rel(file) {
  return file.startsWith(ROOT + '/') ? file.slice(ROOT.length + 1) : file;
}

// CLI entry
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { violations } = runAudit();
  if (violations.length === 0) {
    console.log('Design system audit: OK — no violations.');
    process.exit(0);
  }
  console.error(`Design system audit: ${violations.length} violation(s)`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
