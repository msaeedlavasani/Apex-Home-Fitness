/**
 * audit-assets.mjs — Unified Asset Pipeline audit.
 *
 * Verifies that every asset contract in the repo is consistent:
 *
 *   1. manifest.json        — every referenced icon exists in public/ and its
 *                             declared PNG dimensions match the real file.
 *   2. service-worker.js    — the precache list contains only files that
 *                             exist under public/, never '/' (a 307 redirect
 *                             that used to break install), and the offline
 *                             fallback file exists.
 *   3. public/offline.html  — exists and is fully self-contained (no
 *                             external origins, no scripts).
 *   4. next.config.mjs      — CSP allows the external poster/video origins
 *                             actually used by the app, and the HTTP cache
 *                             policy for icons is explicit (immutable).
 *   5. src/ references      — every same-origin asset path referenced from
 *                             runtime code must resolve to a file in public/.
 *                             References inside comments (e.g. JSDoc examples
 *                             for future /videos, /posters, /animations
 *                             assets) are informational only.
 *
 * Usage:
 *   node scripts/audit-assets.mjs        # exits non-zero on violations
 *   import {runAudit} from '...'         # used by tests/asset-audit.test.ts
 *
 * No dependencies, no secrets — pure filesystem + regex checks.
 */
import {readFileSync, existsSync, readdirSync, statSync} from 'node:fs';
import {join, extname, resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(ROOT, 'public');
const SRC_DIR = join(ROOT, 'src');

/** Extensions scanned in src/ for asset-path references. */
const SRC_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css']);

/** Documented-but-not-shipped asset namespaces (JSDoc examples only). */
const FUTURE_NAMESPACES = ['/videos/', '/posters/', '/animations/'];

/** Paths served dynamically by the app router (never exist in public/). */
const DYNAMIC_PATHS = new Set(['/sitemap.xml']);

/** String-literal asset paths, e.g. '/icons/icon-192x192.png?x' */
const ASSET_RE =
  /(['"`])(\/[a-zA-Z0-9_@./-]+\.(?:png|svg|jpe?g|webp|gif|ico|avif|mp4|webm|ogv|ogg|mov|m4v|json|m3u8|css|js|txt|html|woff2?|xml))(\?[^'"`]*)?\1/g;

/** Reads the PNG width/height from the IHDR chunk (bytes 16..23). */
function pngDimensions(buf) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < sig.length; i += 1) {
    if (buf[i] !== sig[i]) return null;
  }
  if (buf.length < 24) return null;
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

/** Recursively lists files under a directory with a given extension set. */
function walk(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, exts, out);
    } else if (exts.has(extname(entry).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

/** True when a source line is a comment (not runtime code). */
function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
}

export function runAudit() {
  const violations = [];
  const info = [];

  /* ------------------------------------------------------------------ *
   * 1. manifest.json
   * ------------------------------------------------------------------ */
  const manifestPath = join(PUBLIC_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    violations.push('public/manifest.json is missing');
  } else {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
    if (icons.length === 0) violations.push('manifest.json declares no icons');
    for (const icon of icons) {
      const rel = typeof icon.src === 'string' ? icon.src.replace(/^\//, '') : '';
      const file = join(PUBLIC_DIR, rel);
      if (!rel || !existsSync(file)) {
        violations.push(`manifest icon "${icon.src}" does not exist in public/`);
        continue;
      }
      if (extname(rel).toLowerCase() === '.png') {
        const actual = pngDimensions(readFileSync(file));
        const declared = String(icon.sizes ?? '');
        if (!actual) {
          violations.push(`manifest icon "${icon.src}" is not a valid PNG`);
        } else if (declared && declared !== `${actual.width}x${actual.height}`) {
          violations.push(
            `manifest icon "${icon.src}" declares ${declared} but the file is ${actual.width}x${actual.height}`
          );
        }
      }
    }
    if (manifest.start_url !== '/' || manifest.scope !== '/') {
      violations.push(`manifest start_url/scope must be "/" (got "${manifest.start_url}" / "${manifest.scope}")`);
    }
  }

  /* ------------------------------------------------------------------ *
   * 2. service-worker.js
   * ------------------------------------------------------------------ */
  const swPath = join(PUBLIC_DIR, 'service-worker.js');
  if (!existsSync(swPath)) {
    violations.push('public/service-worker.js is missing');
  } else {
    const sw = readFileSync(swPath, 'utf8');
    if (!/next-pwa-cache-v\d+/.test(sw)) {
      violations.push('service-worker.js must define a versioned CACHE_NAME (next-pwa-cache-vN)');
    }
    if (!sw.includes("'/api/")) {
      violations.push('service-worker.js must skip /api/ requests — API responses must never be cached');
    }

    const precacheMatch = sw.match(/const PRECACHE_URLS\s*=\s*\[([\s\S]*?)\];/);
    if (!precacheMatch) {
      violations.push('service-worker.js PRECACHE_URLS not found');
    } else {
      const urls = [...precacheMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
      if (urls.length === 0) violations.push('service-worker.js PRECACHE_URLS is empty');
      for (const url of urls) {
        if (url === '/') {
          violations.push(
            "service-worker.js precaches '/' — '/' 307-redirects to '/en', cache.addAll() rejects and install fails"
          );
          continue;
        }
        if (!existsSync(join(PUBLIC_DIR, url.replace(/^\//, '')))) {
          violations.push(`service-worker.js precaches "${url}" but it does not exist in public/`);
        }
      }
      for (const icon of ['/icons/icon-192x192.png', '/icons/icon-512x512.png', '/manifest.json', '/offline.html']) {
        if (!urls.includes(icon)) {
          violations.push(`service-worker.js PRECACHE_URLS is missing required entry "${icon}"`);
        }
      }
    }

    const fallbackMatch = sw.match(/const OFFLINE_FALLBACK\s*=\s*'([^']+)'/);
    if (!fallbackMatch || fallbackMatch[1] !== '/offline.html') {
      violations.push('service-worker.js OFFLINE_FALLBACK must be "/offline.html" (static, self-contained page)');
    } else if (!existsSync(join(PUBLIC_DIR, 'offline.html'))) {
      violations.push('public/offline.html is missing but is the service worker fallback');
    }
  }

  /* ------------------------------------------------------------------ *
   * 3. public/offline.html — self-contained offline fallback
   * ------------------------------------------------------------------ */
  const offlinePath = join(PUBLIC_DIR, 'offline.html');
  if (!existsSync(offlinePath)) {
    violations.push('public/offline.html is missing');
  } else {
    const html = readFileSync(offlinePath, 'utf8');
    if (/https?:\/\//.test(html)) {
      violations.push('public/offline.html must not reference external origins (offline means offline)');
    }
    if (/<script/i.test(html)) {
      violations.push('public/offline.html must not use scripts (self-contained fallback)');
    }
  }

  /* ------------------------------------------------------------------ *
   * 4. next.config.mjs — CSP allowlist + HTTP cache policy
   * ------------------------------------------------------------------ */
  const configPath = join(ROOT, 'next.config.mjs');
  if (!existsSync(configPath)) {
    violations.push('next.config.mjs is missing');
  } else {
    const cfg = readFileSync(configPath, 'utf8');
    if (!cfg.includes('https://commondatastorage.googleapis.com')) {
      violations.push(
        'next.config.mjs CSP img-src must allow https://commondatastorage.googleapis.com (Exercise Library poster images)'
      );
    }
    if (!/media-src[^"]*https:/i.test(cfg)) {
      violations.push('next.config.mjs CSP media-src must allow https: (CDN exercise videos)');
    }
    if (!/source:\s*'\/icons\/:path\*'/.test(cfg) || !cfg.includes('immutable')) {
      violations.push('next.config.mjs must set an immutable Cache-Control for /icons/:path*');
    }
    if (!cfg.includes("source: '/offline.html'")) {
      violations.push('next.config.mjs must set a Cache-Control rule for /offline.html');
    }
  }

  /* ------------------------------------------------------------------ *
   * 5. src/ same-origin asset references
   * ------------------------------------------------------------------ */
  const files = walk(SRC_DIR, SRC_EXTENSIONS);
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    const relFile = file.replace(ROOT + '/', '');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const comment = isCommentLine(line);
      ASSET_RE.lastIndex = 0;
      let match;
      while ((match = ASSET_RE.exec(line)) !== null) {
        const path = match[2];
        if (path.includes('$') || path.includes('{')) continue; // dynamic
        if (path.startsWith('/api/') || path.startsWith('/_next/')) continue;
        if (DYNAMIC_PATHS.has(path)) continue;

        const missing = !existsSync(join(PUBLIC_DIR, path.replace(/^\//, '')));
        if (!missing) continue;

        const future = FUTURE_NAMESPACES.some((ns) => path.startsWith(ns));
        if (future && comment) {
          info.push(`${relFile}:${i + 1}: documented future asset "${path}" (comment only)`);
          continue;
        }
        violations.push(
          `${relFile}:${i + 1}: references "${path}" which does not exist in public/${future ? ' (only allowed in comments)' : ''}`
        );
      }
    }
  }

  return {violations, info};
}

/* Run directly: node scripts/audit-assets.mjs */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {violations, info} = runAudit();
  for (const line of info) console.info(`[info] ${line}`);
  if (violations.length === 0) {
    console.log('asset audit: PASS — no violations');
    process.exit(0);
  }
  console.error(`asset audit: FAIL — ${violations.length} violation(s)`);
  for (const line of violations) console.error(`  - ${line}`);
  process.exit(1);
}
