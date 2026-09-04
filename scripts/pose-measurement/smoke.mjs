#!/usr/bin/env node
/**
 * CP-03 harness smoke verification (desktop Chrome, fake camera).
 *
 * Drives scripts/pose-measurement/index.html in a real Chrome with a
 * virtual camera and asserts the full repaired pipeline:
 *   camera → LIVE VIEW (first frame + luma) → MoveNet model → inference
 *   loop (FPS metrics) → trial start/end → JSON export.
 * Also exercises the classified-failure path for the model CDN fetch.
 *
 * This is NOT the CP-03 real-device gate: the Chrome fake camera emits a
 * synthetic test pattern (no human), so pose/reps cannot be validated here.
 * It verifies that the harness pipeline itself is healthy and that failures
 * surface as classified errors instead of hanging on "Loading…".
 *
 * Usage:  node scripts/pose-measurement/smoke.mjs   (from repo root)
 * Deps:   @playwright/test (devDependency, provides playwright-core).
 */
import { createRequire } from 'node:module';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HARNESS_DIR = join(ROOT, 'scripts', 'pose-measurement');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.md': 'text/markdown' };

let pass = 0, fail = 0, skipped = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (ok) pass++; else fail++;
}

function serve(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      const file = url.pathname === '/' ? '/index.html' : url.pathname;
      const full = join(HARNESS_DIR, file);
      if (!full.startsWith(HARNESS_DIR) || !existsSync(full)) { res.writeHead(404); res.end('nf'); return; }
      const body = readFileSync(full);
      res.writeHead(200, { 'Content-Type': MIME[extname(full)] || 'application/octet-stream' });
      res.end(body);
    });
    server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${port}/index.html` }));
  });
}

async function waitState(page, predicate, timeoutMs, label) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeoutMs) {
    last = await page.evaluate(() => window.__ahf ? window.__ahf.getState() : null);
    if (last && predicate(last)) return last;
    await page.waitForTimeout(500);
  }
  return last;
}

async function main() {
  if (!existsSync(CHROME)) { console.log('SKIP  harness smoke — Google Chrome not found at ' + CHROME); skipped++; return; }
  const { server, url } = await serve(4175);
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const consoleErrs = [];
  page.on('pageerror', (e) => consoleErrs.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });

  // ---- Success path: autostart with fake camera ------------------------------
  await page.goto(url + '?autostart=1', { waitUntil: 'domcontentloaded' });
  const st = await waitState(page, (s) => s && (s.phase === 'running' || s.phase === 'error'), 90000, 'run');
  if (!st || st.phase !== 'running') {
    check('pipeline reaches running', false, st ? `phase=${st.phase} stage=${st.stage} err=${st.error ? st.error.stage + ': ' + st.error.message : 'none'}` : 'no state');
    console.log('----- diagnostics tail -----');
    const st2 = await page.evaluate(() => window.__ahf ? window.__ahf.getState() : null);
    if (st2 && st2.log) for (const l of st2.log.slice(-14)) console.log('  [' + l.stage + '] ' + l.msg);
  } else {
    check('pipeline reaches running', true, `backend=${st.backend} model=${st.model}`);
    check('LIVE VIEW active (first frame + luma)', st.videoLive === true && st.luma >= 5, `luma=${st.luma}`);
    check('MoveNet model loaded', !!st.model, st.model || 'none');

    // Let the inference loop run a few seconds; FPS metric must move.
    await page.waitForTimeout(4000);
    const run = await page.evaluate(() => window.__ahf.getState());
    check('inference loop processing frames', run.processed > 0 && run.fps > 0, `processed=${run.processed} fps=${run.fps} detections=${run.detections}`);
    check('metrics panel populated', (await page.locator('#fps').textContent()) !== '—', 'fps field numeric');
    check('no unhandled page errors so far', consoleErrs.length === 0, consoleErrs.join(' | ').slice(0, 160) || 'clean');

    // Trial + export (no human in frame → 0 detected reps is expected)
    await page.click('#trialStartBtn');
    await page.waitForTimeout(2500);
    await page.click('#trialEndBtn');
    await page.click('#exportBtn');
    const exportText = await page.locator('#exportBox').inputValue();
    const exported = JSON.parse(exportText);
    check('trial logged and export works', exported.trials.length === 1 && exported.diagnostics.length > 0,
      `trials=${exported.trials.length} diagLines=${exported.diagnostics.length} detected=${exported.trials[0] ? exported.trials[0].detected : 'n/a'}`);
    check('export keeps on-device boundary', exported.trials.length === 1 && !JSON.stringify(exported).includes('data:image'),
      'no frame payload in export');
  }
  await page.close();

  // ---- Failure path: model CDN fetch blocked → classified MODEL_FETCH error ----
  const page2 = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await page2.route(/tfhub\.dev|kaggle\.com/, (r) => r.abort('failed'));
  await page2.goto(url + '?autostart=1', { waitUntil: 'domcontentloaded' });
  const st2 = await waitState(page2, (s) => s && (s.phase === 'error' || s.phase === 'running'), 90000, 'modelblock');
  if (st2 && st2.phase === 'error' && st2.error) {
    check('blocked model CDN surfaces classified error (no hang)', st2.error.stage === 'MODEL_FETCH', `stage=${st2.error.stage}: ${st2.error.message.slice(0, 120)}`);
    check('error box visible with remedy', await page2.locator('#errBox').isVisible(), 'errBox shown');
    check('retry button offered', await page2.locator('#retryBtn').isVisible(), 'retryBtn shown');
  } else {
    check('blocked model CDN surfaces classified error (no hang)', false, st2 ? `phase=${st2.phase}` : 'no state');
  }
  await page2.close();

  // ---- CPU-fallback path (deterministic via ?backend=cpu autostart) -----------
  const page3 = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await page3.goto(url + '?autostart=1&backend=cpu', { waitUntil: 'domcontentloaded' });
  const st3 = await waitState(page3, (s) => s && (s.phase === 'running' || s.phase === 'error'), 120000, 'cpu');
  if (st3 && st3.phase === 'running' && st3.backend === 'cpu') {
    check('CPU-backend path reaches running', true, `backend=${st3.backend}`);
    await page3.waitForTimeout(6000);
    const run3 = await page3.evaluate(() => window.__ahf.getState());
    check('inference loop runs on CPU backend', run3.processed > 0 && run3.infErrors === 0, `processed=${run3.processed} fps=${run3.fps}`);
  } else {
    check('CPU-backend path reaches running', false, st3 ? `phase=${st3.phase} backend=${st3.backend} err=${st3.error ? st3.error.stage + ': ' + st3.error.message : 'none'}` : 'no state');
  }
  await page3.close();

  await browser.close();
  server.close();
}

main().then(() => {
  console.log(`\nSMOKE RESULT: ${pass} passed, ${fail} failed, ${skipped} skipped`);
  process.exit(fail > 0 ? 1 : 0);
}).catch((e) => { console.error('SMOKE DRIVER ERROR:', e); process.exit(1); });
