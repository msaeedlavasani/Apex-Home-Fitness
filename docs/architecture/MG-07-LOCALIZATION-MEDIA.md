# MG-07 — Localization + Media Architecture

- **Task:** MG-07 — P0 — `CODE_NO_DEPLOY` (no Production/DB/UI change; `PRODUCTION_SENSITIVITY: RELEASE_ONLY` — media delivery is release-bound, this task is architecture + code only)
- **Status:** ACTIVE 2026-09-01 (DELIVERED on merge)
- **Dependencies:** MG-06 — builds on MG-01 contract fields (`LocalizedText.key`, `MovementMediaAsset`), MG-02 FA/EN display maps, MG-03 hash contract
- **Architecture gate:** `REQUIRED` — ADR-0010 ([`adr/0010-localization-media-architecture.md`](../adr/0010-localization-media-architecture.md))
- **DB sensitivity:** `NONE`
- **Media-rights constraint:** MG-04 decision gate recorded a DATA-ONLY media posture — **no media bytes are imported by this task**; the manifest + architecture define how self-hosted media will be validated and delivered later (MG-07's real import requires future rights work)

## 1. Scope

Two MG-07 deliverables (MG-01 deferred both to this task):

1. **Localization key structure** — every user-facing field of a movement
   knowledge object carries a stable FA/EN localization key
   (`src/lib/movement/localization.ts`).
2. **Self-hosted media architecture** — a media manifest format (asset id,
   kind, self-hosted URL, sha256 content hash, fallback, caption key) with
   fail-closed validation enforcing the strategy §6 self-hosting/resilience
   principle (`src/lib/movement/media.ts`).

## 2. Localization key structure

Grammar (dotted, next-intl-compatible — the app's catalog convention is
`<namespace>.<id>.<field>`, cf. `badges.<id>.name`):

```
movement-key := scope "." ref "." field
scope        := mv | fedb | rules | seed | canonical | curated
ref          := movement reference (canonical slug, or upstream record id)
field        := name | description
              | instr "." <1-based index>
              | cue "." <1-based index>
              | media "." <assetId> "." caption
```

| User-facing field | Canonical key |
|---|---|
| name | `<scope>.<ref>.name` |
| description | `<scope>.<ref>.description` |
| instructions[i] | `<scope>.<ref>.instr.<i+1>` |
| coachingCues[i] | `<scope>.<ref>.cue.<i+1>` |
| media caption | `<scope>.<ref>.media.<assetId>.caption` |

The grammar accepts both canonical scopes (`mv.<slug>.instr.1` — MG-01/MG-02
usage) and upstream-imported scopes (`fedb.<id>.instr.1` — MG-04 ingestion
keys). Persian (`fa`) text shares the same key: a key is the stable address
of the localized string in the EN/FA catalogs (`src/messages/en.json` /
`fa.json`), exactly like the app's next-intl usage.

`localizationKeyCoverage(movement)` verifies the MG-07 acceptance: every
user-facing field carries a conforming, sequentially-indexed key; `PASS` only
when nothing is missing or invalid.

## 3. Self-hosted media architecture

### 3.1 Manifest format

```
MediaManifestEntry {
  assetId: string          // unique within the manifest
  kind: image|video|animation|audio
  url: string              // self-hosted (AHF-controlled)
  contentHash: string      // sha256 lowercase hex (MG-03 hash contract)
  fallbackUrl?: string     // resilience fallback (also self-hosted)
  captionKey?: string      // MG-07 localization grammar
}
MovementMediaManifest { manifestVersion: 1, source, license, entries }
```

### 3.2 Self-hosting rules (fail-closed)

- Required movement media is served from **same-origin absolute paths**
  (`/videos/…`, `/posters/…`, `/animations/…` — the namespaces already
  documented in `docs/ASSETS.md`, currently empty), or from an **explicitly
  allowlisted AHF-controlled origin** (built-in list: `apexhomefit.ir`).
- **No third-party CDN for required media.** `mux.dev` and
  `commondatastorage.googleapis.com` remain DEMO-only origins (existing
  Exercise Library demos per `docs/ASSETS.md` §2.5) and are rejected by
  `isSelfHostedMediaUrl` for canonical media.
- Every entry carries a sha256 content hash; `contentHashMatches` /
  `mediaContentHash` provide deterministic end-to-end integrity verification.
- A fallback URL is optional but when present must also be self-hosted.
- `assetToManifestEntry` is FAIL-CLOSED: an asset without a content hash
  cannot enter the manifest.

### 3.3 Resilience requirement (strategy §6)

Loss of upstream connectivity must NOT break core workout execution:

- The canonical catalog + required media are controlled/self-hosted — no
  runtime dependency on third-party exercise APIs or CDNs (the AHF → API →
  workout anti-pattern is avoided);
- media delivery rides the existing offline-first service worker
  (`docs/ASSETS.md` §3.1 — `/videos/`, `/posters/`, `/animations/` cacheable
  via `public/` static serving, network-first navigation with cache and
  `/offline.html` fallback);
- `fallbackUrl` per asset is the last-resort resilience path inside the
  manifest itself.

**This task imports no media bytes** (MG-04 DATA-ONLY posture stands). The
manifest format + validation define how rights-cleared, self-hosted assets
will be admitted in a later media-import lifecycle.

## 4. Acceptance criteria — evidence

- Every user-facing field has a localization key — grammar module +
  `localizationKeyCoverage` (tests on fully-keyed objects PASS, missing/
  non-sequential keys FAIL).
- Media manifest supports content-hash verification — sha256 contract
  (MG-03 `isValidContentHash`), `mediaContentHash`, `contentHashMatches`.
- Architecture doc states the resilience requirement — §3.3 above.
- No third-party CDN dependencies — `isSelfHostedMediaUrl` rejects external
  origins; manifest validation fails on any non-self-hosted url/fallback.
- 32 new unit tests (localization + media).
- No Production/DB/UI change; no deployment. `RUNTIME_BEHAVIOR_CHANGED = NO`
  (nothing in application code imports these modules yet).

## 5. Open items (unchanged by MG-07)

- Real media import remains deferred (rights + chain-of-title work — MG-04
  decision gate records DATA-ONLY; free-exercise-db media chain-of-title
  risk unresolved).
- `Side-Lying Leg Lift` ambiguity unchanged (MG-08 scope).
- Namespaces `/videos/`, `/posters/`, `/animations/` still contain no files
  (`docs/ASSETS.md` §5 known gap).