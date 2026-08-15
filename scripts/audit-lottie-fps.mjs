#!/usr/bin/env node
/**
 * audit-lottie-fps.mjs
 * --------------------
 * Static FPS / complexity audit for Lottie animation JSON files.
 *
 * It parses each Lottie JSON (no runtime needed) and derives the nominal
 * frame rate, real duration, layer/shape/mask/effect/expression counts and
 * a weighted "render complexity score" that predicts how likely the asset
 * is to hold 60fps on mid-range mobile hardware (iOS WebView / Android TWA).
 *
 * Usage:
 *   node scripts/audit-lottie-fps.mjs                        # scans public/animations/*.json
 *   node scripts/audit-lottie-fps.mjs a.json b.json          # explicit files
 *   node scripts/audit-lottie-fps.mjs --out /abs/report/dir  # write reports elsewhere
 *
 * Outputs:
 *   - a table on stdout
 *   - <out>/LOTTIE_FPS_AUDIT.md      — human-readable audit
 *   - <out>/lottie-fps-audit.csv     — machine-readable audit
 *
 * Ratings:
 *   LOW        — safe to play at full quality (expect 60fps)
 *   MODERATE   — fine on most devices; keep an eye on low-end
 *   HIGH       — expect drops on mid-range; ship a video/poster fallback
 *   CRITICAL   — will not hold 60fps; MUST ship a lightweight fallback
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_SCAN_DIR = join(REPO_ROOT, 'public', 'animations');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const files = [];
  let outDir = join(REPO_ROOT, 'reports');
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      outDir = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('-')) {
      // ignore unknown flags
    } else {
      files.push(arg);
    }
  }
  return { files, outDir };
}

// ---------------------------------------------------------------------------
// Lottie metrics
// ---------------------------------------------------------------------------

const SHAPE_TYPES = new Set(['sh', 'rc', 'el', 'sr', 'fl', 'st', 'gf', 'gs', 'tr', 'tm', 'mm', 'rd', 'rp', 'fb', 'pt', 'pc']);

/** Count shape-ish nodes recursively (shape layers + precomp children). */
function countShapes(layers, count = { shapes: 0 }) {
  for (const layer of layers ?? []) {
    for (const shape of layer.shapes ?? []) {
      walkShapeTree(shape, count);
    }
    // Precomp layers carry their own nested layer list.
    if (layer.ty === 0 && Array.isArray(layer.layers)) {
      countShapes(layer.layers, count);
    }
  }
  return count.shapes;
}

function walkShapeTree(node, count) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.ty === 'string' && SHAPE_TYPES.has(node.ty)) count.shapes += 1;
  for (const key of ['it', 'shapes', 'elements']) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) walkShapeTree(c, count);
    }
  }
  // Mask properties live on layers, not in the shape tree — handled separately.
}

/** Count masks across all layers (including inside precomps). */
function countMasks(layers, count = { masks: 0 }) {
  for (const layer of layers ?? []) {
    count.masks += (layer.masksProperties?.length ?? 0) + (layer.mask?.length ?? 0);
    if (layer.ty === 0 && Array.isArray(layer.layers)) {
      countMasks(layer.layers, count);
    }
  }
  return count.masks;
}

/** Count effects + expressions across the whole tree. */
function countFx(layers, count = { effects: 0, expressions: 0 }) {
  for (const layer of layers ?? []) {
    count.effects += layer.ef?.length ?? 0;
    walkFx(layer, count);
    if (layer.ty === 0 && Array.isArray(layer.layers)) {
      countFx(layer.layers, count);
    }
  }
  return count;
}

function walkFx(node, count) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.x === 'string') count.expressions += 1;
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (value && typeof value === 'object') walkFx(value, count);
  }
}

/** Count embedded assets (images/footages referenced by the JSON). */
function countAssets(assets) {
  const images = (assets ?? []).filter((a) => a?.p && a?.u && !Array.isArray(a.layers));
  const precomps = (assets ?? []).filter((a) => Array.isArray(a?.layers));
  return { images: images.length, precomps: precomps.length };
}

function complexityScore(metrics) {
  const { layers, shapes, masks, effects, expressions, precompLayers, embeddedImages, sizeKB, fps } = metrics;
  let score =
    layers * 1.0 +
    shapes * 0.5 +
    masks * 2.0 +
    effects * 3.0 +
    expressions * 5.0 +
    precompLayers * 1.5 +
    embeddedImages * 2.0 +
    sizeKB / 50;
  // Frame-rate multiplier: >60fps JSON doubles the per-frame raster cost.
  if (fps > 60) score *= 1.5;
  return Math.round(score * 10) / 10;
}

function ratingFor(score) {
  if (score < 40) return 'LOW';
  if (score < 80) return 'MODERATE';
  if (score < 140) return 'HIGH';
  return 'CRITICAL';
}

function auditFile(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const sizeBytes = statSync(filePath).size;
  const sizeKB = sizeBytes / 1024;

  const fr = Number(data.fr ?? 30);
  const ip = Number(data.ip ?? 0);
  const op = Number(data.op ?? 0);
  const totalFrames = Math.max(0, op - ip);
  const durationSec = totalFrames > 0 ? totalFrames / fr : 0;

  const layers = data.layers ?? [];
  const assets = countAssets(data.assets);

  const layerTypes = {};
  let precompLayers = 0;
  for (const layer of layers) {
    const key = String(layer.ty ?? '?');
    layerTypes[key] = (layerTypes[key] ?? 0) + 1;
    if (layer.ty === 0) precompLayers += 1;
  }
  precompLayers += assets.precomps;

  // Standard AE exports keep precomp content in `assets[].layers` (referenced
  // by ty:0 layers via refId), so count those too — but not twice.
  const nestedLists = (data.assets ?? [])
    .filter((a) => Array.isArray(a?.layers))
    .map((a) => a.layers);
  const allLists = [layers, ...nestedLists];

  const shapes = allLists.reduce((n, list) => n + countShapes(list), 0);
  const masks = allLists.reduce((n, list) => n + countMasks(list), 0);
  const fx = allLists.reduce(
    (acc, list) => {
      const c = countFx(list);
      acc.effects += c.effects;
      acc.expressions += c.expressions;
      return acc;
    },
    { effects: 0, expressions: 0 }
  );

  const metrics = {
    file: basename(filePath),
    sizeKB: Math.round(sizeKB * 10) / 10,
    fps: fr,
    frames: totalFrames,
    durationSec: Math.round(durationSec * 100) / 100,
    layers: layers.length,
    precompLayers,
    shapes,
    masks,
    effects: fx.effects,
    expressions: fx.expressions,
    embeddedImages: assets.images,
    layerBreakdown: layerTypes,
  };

  const score = complexityScore({ ...metrics, sizeKB });
  const rating = ratingFor(score);
  return { ...metrics, score, rating, filePath };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function mdTable(rows) {
  const cols = [
    'file', 'sizeKB', 'fps', 'frames', 'durationSec', 'layers', 'shapes', 'masks', 'effects', 'expressions', 'embeddedImages', 'score', 'rating',
  ];
  const header = `| ${cols.map((c) => c).join(' | ')} |`;
  const sep = `| ${cols.map(() => '---').join(' | ')} |`;
  const body = rows
    .map((r) => `| ${cols.map((c) => String(r[c] ?? '-')).join(' | ')} |`)
    .join('\n');
  return `${header}\n${sep}\n${body}`;
}

function writeReport(results, outDir, scannedDir) {
  mkdirSync(outDir, { recursive: true });

  const generatedAt = new Date().toISOString();
  const lines = [];
  lines.push('# Lottie FPS Audit');
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push('');
  lines.push(
    'Static audit of Lottie JSON complexity. Score = weighted sum of layers, shapes, masks, effects, expressions, precomps, embedded images and file size. Ratings: **LOW** (safe 60fps) / **MODERATE** (watch low-end) / **HIGH** (drops likely; ship a fallback) / **CRITICAL** (must ship a fallback).'
  );
  lines.push('');

  if (results.length === 0) {
    lines.push(`## No Lottie assets found`);
    lines.push('');
    lines.push(`Scanned: \`${scannedDir}\``);
    lines.push('');
    lines.push('No `.json` Lottie files were present at audit time. Add assets and re-run:');
    lines.push('');
    lines.push('```bash');
    lines.push('node scripts/audit-lottie-fps.mjs --out <report-dir>');
    lines.push('```');
    lines.push('');
    lines.push('### Recommended budgets (for when assets land)');
    lines.push('');
    lines.push(`| Metric | Budget for 60fps on mid-range mobile |`);
    lines.push(`| --- | --- |`);
    lines.push(`| Frame rate (fr) | ≤ 60 (30 is ideal for workout loops) |`);
    lines.push(`| Total frames | ≤ 360 (≤ 6s @ 60fps, ≤ 12s @ 30fps) |`);
    lines.push(`| Layers | ≤ 12 (≤ 4 precomps) |`);
    lines.push(`| Shapes | ≤ 60 |`);
    lines.push(`| Masks | ≤ 4 (each mask ≈ 2–3× shape cost) |`);
    lines.push(`| Effects / expressions | 0 (avoid; they force re-rasterization) |`);
    lines.push(`| Embedded images | 0 (prefer vector; or < 200KB total) |`);
    lines.push(`| Complexity score | < 40 (LOW) or < 80 (MODERATE) |`);
  } else {
    lines.push(`## Summary`);
    lines.push('');
    lines.push(mdTable(results));
    lines.push('');
    lines.push('### Per-asset details');
    lines.push('');
    for (const r of results) {
      lines.push(`#### \`${r.file}\``);
      lines.push('');
      lines.push(`- **Path**: \`${r.filePath}\``);
      lines.push(`- **Size**: ${r.sizeKB} KB`);
      lines.push(`- **Nominal FPS**: ${r.fps} · **Frames**: ${r.frames} (ip→op) · **Duration**: ${r.durationSec}s`);
      lines.push(`- **Layers**: ${r.layers} (${r.precompLayers} precomp)`);
      lines.push(`- **Shapes**: ${r.shapes} · **Masks**: ${r.masks} · **Effects**: ${r.effects} · **Expressions**: ${r.expressions} · **Embedded images**: ${r.embeddedImages}`);
      lines.push(`- **Layer breakdown** (ty): ${Object.entries(r.layerBreakdown).map(([k, v]) => `${k}×${v}`).join(', ')}`);
      lines.push(`- **Complexity score**: ${r.score} → **${r.rating}**`);
      lines.push('');
      const recs = recommendationsFor(r);
      for (const rec of recs) lines.push(`- ${rec}`);
      lines.push('');
    }
  }

  lines.push('## Remediation playbook');
  lines.push('');
  lines.push('1. **Reduce frame rate** to 30fps for looped exercise demos — half the per-frame raster work at identical perceived quality.');
  lines.push('2. **Bake masks/effects**: rasterize masked groups or drop `ef` effects in After Effects; each mask multiplies shape render cost.');
  lines.push('3. **Keep the loop short** (≤ 6s): total frames = fr × duration — trim the timeline.');
  lines.push('4. **Ship a fallback**: provide a static poster (`.jpg`/`.webp`, ≤ 60KB) or a `<video>` (`.webm`, 30fps, ≤ 2MB) for HIGH/CRITICAL assets. `AnimationPlayer` accepts \`fallbackSrc\` and auto-swaps on \`prefers-reduced-motion\` or sustained < 45fps.');
  lines.push('5. **Verify in the field**: run the app with the FPS monitor active (it logs \`onFpsDrop\`) on a mid-range Android and an older iPhone.');

  const mdPath = join(outDir, 'LOTTIE_FPS_AUDIT.md');
  writeFileSync(mdPath, lines.join('\n') + '\n', 'utf8');

  const csvHeader = 'file,size_kb,fps,frames,duration_sec,layers,shapes,masks,effects,expressions,embedded_images,score,rating';
  const csvRows = results.map((r) =>
    [r.file, r.sizeKB, r.fps, r.frames, r.durationSec, r.layers, r.shapes, r.masks, r.effects, r.expressions, r.embeddedImages, r.score, r.rating]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  const csvPath = join(outDir, 'lottie-fps-audit.csv');
  writeFileSync(csvPath, [csvHeader, ...csvRows].join('\n') + '\n', 'utf8');

  console.log(lines.join('\n'));
  console.log(`\nWrote ${mdPath}`);
  console.log(`Wrote ${csvPath}`);
}

function recommendationsFor(r) {
  const recs = [];
  if (r.fps > 60) recs.push('**High frame rate** — export at 30fps; halve raster cost at identical perceived quality.');
  if (r.durationSec > 8) recs.push('**Long loop** — trim to ≤ 6s to cut total frames.');
  if (r.layers > 12) recs.push('**Too many layers** — flatten/merge below 12 (≤ 4 precomps).');
  if (r.shapes > 60) recs.push('**Shape-heavy** — reduce shape count below 60.');
  if (r.masks > 4) recs.push('**Mask-heavy** — masks multiply render cost; bake them into paths.');
  if (r.effects > 0) recs.push('**Effects present** — remove `ef` effects; they force re-rasterization.');
  if (r.expressions > 0) recs.push('**Expressions present** — precompute animation so no JS runs per frame.');
  if (r.embeddedImages > 0) recs.push('**Embedded images** — replace with vector shapes or keep total < 200KB.');
  if (r.rating === 'HIGH' || r.rating === 'CRITICAL') {
    recs.push('**Fallback required** — provide \`fallbackSrc\` (static poster) or a 30fps \`.webm\`; AnimationPlayer swaps automatically on FPS drop / reduced motion.');
  }
  if (recs.length === 0) recs.push('Within budget — no remediation required.');
  return recs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const { files, outDir } = parseArgs(process.argv.slice(2));
  const targets = files.length > 0 ? files : [DEFAULT_SCAN_DIR];
  const scannedDir = files.length > 0 ? targets.join(', ') : DEFAULT_SCAN_DIR;

  const jsonFiles = [];
  for (const target of targets) {
    try {
      const stat = statSync(target);
      if (stat.isDirectory()) {
        for (const entry of readdirSync(target)) {
          if (extname(entry).toLowerCase() === '.json') jsonFiles.push(join(target, entry));
        }
      } else if (extname(target).toLowerCase() === '.json') {
        jsonFiles.push(target);
      }
    } catch {
      console.warn(`[audit] Skipping unreadable target: ${target}`);
    }
  }

  const results = jsonFiles
    .map((f) => {
      try {
        return auditFile(f);
      } catch (err) {
        console.warn(`[audit] Failed to parse ${f}: ${err.message}`);
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  writeReport(results, resolve(outDir), scannedDir);
}

main();
