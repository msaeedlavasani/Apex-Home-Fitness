#!/usr/bin/env node
/**
 * CP-03 harness smoke verification (desktop Chrome).
 *
 * Drives scripts/pose-measurement/index.html in a real Chrome and asserts:
 *   A. pipeline health with Chrome's synthetic fake camera (pattern, no
 *      human) — camera → LIVE VIEW → MoveNet model → inference loop →
 *      trial start/end → JSON export; every inference now receives a real
 *      frame (regression guard for the repair-#2 null-input bug);
 *   B. classified MODEL_FETCH error when the model CDN is blocked (no hang);
 *   C. CPU-backend path reaches running and infers cleanly;
 *   D. POSE-BEARING check — getUserMedia is overridden with a canvas stream
 *      painting a real human photo (scripts/pose-measurement/testdata/
 *      human.jpg), and MoveNet must actually return poses with keypoints
 *      above the 0.5 gate, the skeleton overlay must draw, and the JSON
 *      export must carry pose telemetry. This closes the gap that the
 *      synthetic pattern could not: real image content reaching the model.
 *
 * This is NOT the CP-03 real-device gate: it runs on a desktop with a
 * virtual camera; Android/iPhone FPS, rep reliability and battery still
 * require the physical-device protocol (README §6). It verifies the harness
 * pipeline end-to-end, including pose detection on real pixels.
 *
 * Usage:  node scripts/pose-measurement/smoke.mjs   (from repo root)
 * Deps:   @playwright/test (devDependency, provides playwright-core).
 *         Google Chrome installed at the CHROME path.
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
const HUMAN_IMG = join(HARNESS_DIR, 'testdata', 'human.jpg');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.md': 'text/markdown' };

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
      res.writeHead(200, { 'Content-Type': MIME[extname(full)] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
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
  const hasHuman = existsSync(HUMAN_IMG);
  const { server, url } = await serve(4175);
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--no-sandbox'],
  });
  const ctxA = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
  const page = await ctxA.newPage();
  const consoleErrs = [];
  page.on('pageerror', (e) => consoleErrs.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });

  // ============ A. Pipeline health (synthetic pattern camera) ================
  await page.goto(url + '?autostart=1', { waitUntil: 'domcontentloaded' });
  const st = await waitState(page, (s) => s && (s.phase === 'running' || s.phase === 'error'), 90000, 'run');
  if (!st || st.phase !== 'running') {
    check('A. pipeline reaches running', false, st ? `phase=${st.phase} stage=${st.stage} err=${st.error ? st.error.stage + ': ' + st.error.message : 'none'}` : 'no state');
    const st2 = await page.evaluate(() => window.__ahf ? window.__ahf.getState() : null);
    if (st2 && st2.log) for (const l of st2.log.slice(-14)) console.log('  [' + l.stage + '] ' + l.msg);
  } else {
    check('A. pipeline reaches running', true, `backend=${st.backend} model=${st.model}`);
    check('A. LIVE VIEW active (first frame + luma)', st.videoLive === true && st.luma >= 5, `luma=${st.luma}`);
    check('A. inference input is the live frame (repair-#2 regression guard)', st.hasVideo === true && !!st.inputCanvas && st.inferenceCalls > 0, `video=${st.videoW}x${st.videoH} input=${st.inputCanvas} calls=${st.inferenceCalls} det=${st.detections}`);
    check('A. no inference errors (input real, loop clean)', st.infErrors === 0, `infErrors=${st.infErrors}`);

    await page.waitForTimeout(4000);
    const run = await page.evaluate(() => window.__ahf.getState());
    check('A. inference loop processing frames', run.processed > 0 && run.fps > 0 && run.inferenceCalls > 0, `processed=${run.processed} fps=${run.fps} calls=${run.inferenceCalls} detections=${run.detections}`);
    check('A. metrics panel populated', (await page.locator('#fps').textContent()) !== '—', 'fps field numeric');
    check('A. frame-content sampler produced samples', (run.lastSample && run.lastSample.cls) !== undefined && run.lastSample !== null, run.lastSample ? `cls=${run.lastSample.cls} inputMean=${run.lastSample.input.mean} srcCtDelta=${run.lastSample.src.dct}s` : 'no sample');
    check('A. no unhandled page errors so far', consoleErrs.length === 0, consoleErrs.join(' | ').slice(0, 160) || 'clean');

    // Trial + export (pattern has no human → detected reps 0 is expected)
    await page.click('#trialStartBtn');
    await page.waitForTimeout(2500);
    await page.click('#trialEndBtn');
    await page.click('#exportBtn');
    const exportText = await page.locator('#exportBox').inputValue();
    const exported = JSON.parse(exportText);
    check('A. trial logged and export works', exported.trials.length === 1 && exported.diagnostics.length > 0,
      `trials=${exported.trials.length} diagLines=${exported.diagnostics.length} detected=${exported.trials[0] ? exported.trials[0].detected : 'n/a'}`);
    check('A. export keeps on-device boundary', !JSON.stringify(exported).includes('data:image'),
      'no frame payload in export');
    check('A. export carries telemetry + frame trace', typeof exported.summary.inferenceCalls === 'number' && Array.isArray(exported.frameTrace) && exported.frameTrace.length > 0,
      `inferenceCalls=${exported.summary.inferenceCalls} trace=${exported.frameTrace.length}`);
  }
  await page.close();

  // ============ B. Model CDN blocked → classified MODEL_FETCH (no hang) ===========
  const page2 = await ctxA.newPage();
  await page2.route(/tfhub\.dev|kaggle\.com/, (r) => r.abort('failed'));
  await page2.goto(url + '?autostart=1', { waitUntil: 'domcontentloaded' });
  const st2 = await waitState(page2, (s) => s && (s.phase === 'error' || s.phase === 'running'), 90000, 'modelblock');
  if (st2 && st2.phase === 'error' && st2.error) {
    check('B. blocked model CDN surfaces classified error (no hang)', st2.error.stage === 'MODEL_FETCH', `stage=${st2.error.stage}: ${st2.error.message.slice(0, 120)}`);
    check('B. error box visible with remedy', await page2.locator('#errBox').isVisible(), 'errBox shown');
    check('B. retry button offered', await page2.locator('#retryBtn').isVisible(), 'retryBtn shown');
  } else {
    check('B. blocked model CDN surfaces classified error (no hang)', false, st2 ? `phase=${st2.phase}` : 'no state');
  }
  await page2.close();

  // ============ C. CPU-backend path (deterministic via ?backend=cpu) ==============
  const page3 = await ctxA.newPage();
  await page3.goto(url + '?autostart=1&backend=cpu', { waitUntil: 'domcontentloaded' });
  const st3 = await waitState(page3, (s) => s && (s.phase === 'running' || s.phase === 'error'), 120000, 'cpu');
  if (st3 && st3.phase === 'running' && st3.backend === 'cpu') {
    check('C. CPU-backend path reaches running', true, `backend=${st3.backend}`);
    await page3.waitForTimeout(6000);
    const run3 = await page3.evaluate(() => window.__ahf.getState());
    check('C. inference loop runs on CPU backend with real input', run3.processed > 0 && run3.inferenceCalls > 0 && run3.infErrors === 0, `processed=${run3.processed} calls=${run3.inferenceCalls} fps=${run3.fps}`);
  } else {
    check('C. CPU-backend path reaches running', false, st3 ? `phase=${st3.phase} backend=${st3.backend} err=${st3.error ? st3.error.stage + ': ' + st3.error.message : 'none'}` : 'no state');
  }
  await page3.close();

  // ============ D. POSE-BEARING: real human pixels → MoveNet poses → overlay ======
  if (!hasHuman) {
    console.log('SKIP  D. pose-bearing scenario — missing testdata/human.jpg (see scripts/pose-measurement/README.md §9)');
    skipped++;
  } else {
    const ctxD = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
    await ctxD.addInitScript(() => {
      // Replace the camera with a canvas stream painting testdata/human.jpg.
      // Same-origin image → canvas stays clean → identical to a real camera path.
      if (!navigator.mediaDevices) navigator.mediaDevices = {};
      navigator.mediaDevices.getUserMedia = (constraints) => new Promise((resolve, reject) => {
        const cv = document.createElement('canvas');
        cv.width = 1280; cv.height = 720;
        const ctx = cv.getContext('2d');
        const img = new Image();
        img.onload = () => {
          let phase = 0;
          const paint = () => {
            ctx.fillStyle = '#f4f2ec';               // bright backdrop → healthy luma
            ctx.fillRect(0, 0, cv.width, cv.height);
            // Contain-fit at 90%: whole person visible, large, uncropped.
            const s = Math.min(cv.width / img.width, cv.height / img.height) * 0.9;
            const dw = img.width * s, dh = img.height * s;
            const dx = (cv.width - dw) / 2 + Math.sin(phase) * 6;    // gentle motion so
            const dy = (cv.height - dh) / 2 + Math.cos(phase * 0.8) * 4; // frames advance
            ctx.drawImage(img, dx, dy, dw, dh);
            phase += 0.05;
          };
          paint();
          const stream = cv.captureStream(30);
          window.__paintInterval = setInterval(paint, 33);
          resolve(stream);
        };
        img.onerror = () => reject(new Error('testdata image failed to load'));
        img.src = '/testdata/human.jpg';
      });
    });
    const pageD = await ctxD.newPage();
    const errsD = [];
    pageD.on('pageerror', (e) => errsD.push(String(e).slice(0, 200)));
    await pageD.goto(url + '?autostart=1', { waitUntil: 'domcontentloaded' });
    const stD = await waitState(pageD, (s) => s && (s.phase === 'running' || s.phase === 'error'), 90000, 'pose-run');
    if (!stD || stD.phase !== 'running') {
      check('D. pose-bearing pipeline reaches running', false, stD ? `phase=${stD.phase} err=${stD.error ? stD.error.stage + ': ' + stD.error.message : 'none'}` : 'no state');
    } else {
      check('D. pose-bearing pipeline reaches running', true, `backend=${stD.backend} model=${stD.model} input=${stD.inputCanvas}`);
      // Wait for sustained detections on the real human content.
      const det = await waitState(pageD, (s) => s && s.poseReturns >= 3, 30000, 'pose-detect');
      check('D. MoveNet returns poses for a real human in frame (was 0 with the null-input bug)', det !== null && det.poseReturns >= 3, det ? `poseReturns=${det.poseReturns} detections=${det.detections}` : `poseReturns=${stD.poseReturns}`);
      const last = await pageD.evaluate(() => window.__ahf.getState());
      check('D. no inference errors on the pose path', last.infErrors === 0, `infErrors=${last.infErrors}`);
      const samp = last.lastSample;
      check('D. inference input is bright structured content (not black/flat)', samp && samp.input.mean >= 30 && samp.input.max - samp.input.min >= 14, samp ? `inputMean=${samp.input.mean} Δ=${samp.input.max - samp.input.min} cls=${samp.cls}` : 'no sample');
      // Classifier must show a VALID input — poses may flicker frame-to-frame, so
      // accept either healthy class; INPUT_NEAR_BLACK/INPUT_FLAT would mean failure.
      check('D. classifier sees valid structured input (never black/flat)', samp && (samp.cls === 'POSES_OK' || samp.cls === 'INPUT_STRUCTURED_NO_POSE'), samp ? `cls=${samp.cls}` : 'no sample');
      // Rolling pose stats persist once any pose was returned (hypothesis-2 telemetry).
      check('D. keypoints above the 0.5 gate are present (rolling pose stats)', samp && samp.pose && samp.pose.kp05 >= 1, samp && samp.pose ? `kp≥0.5=${samp.pose.kp05}/${samp.pose.kpTotal} kpMax=${samp.pose.kpMax} kpMean=${samp.pose.kpMean} age=${samp.poseAgeSec}s` : 'no pose stats yet');
      await pageD.waitForTimeout(1500);
      const runD = await pageD.evaluate(() => window.__ahf.getState());
      check('D. skeleton overlay drew on the live view', runD.skeletonDraws >= 3 && runD.overlayErrors === 0, `skeletonDraws=${runD.skeletonDraws} overlayErrors=${runD.overlayErrors}`);
      // Colored skeleton pixels are measured at draw time inside the harness (the
      // overlay clears on the next processed frame, so an external read races it).
      check('D. keypoints visibly drawn (colored pixels measured at draw time)', runD.lastOverlayHits >= 1, `lastOverlayHits=${runD.lastOverlayHits}`);
      // Export telemetry
      await pageD.click('#exportBtn');
      const expD = JSON.parse(await pageD.locator('#exportBox').inputValue());
      check('D. export carries pose telemetry + audit classification', expD.summary.poseReturns >= 3 && expD.summary.skeletonDraws >= 3 && expD.summary.lastOverlayHits >= 1 && (expD.frameTrace.some((s) => s.cls === 'POSES_OK') || expD.frameTrace.some((s) => s.pose && s.pose.kp05 >= 1)),
        `summary.poseReturns=${expD.summary.poseReturns} skeletonDraws=${expD.summary.skeletonDraws} overlayHits=${expD.summary.lastOverlayHits} traceSamples=${expD.frameTrace.length}`);
      check('D. no unhandled page errors on pose path', errsD.length === 0, errsD.join(' | ').slice(0, 160) || 'clean');
    }
    await pageD.close();
    await ctxD.close();
  }

  await ctxA.close();
  await browser.close();
  server.close();
}

main().then(() => {
  console.log(`\nSMOKE RESULT: ${pass} passed, ${fail} failed, ${skipped} skipped`);
  process.exit(fail > 0 ? 1 : 0);
}).catch((e) => { console.error('SMOKE DRIVER ERROR:', e); process.exit(1); });
