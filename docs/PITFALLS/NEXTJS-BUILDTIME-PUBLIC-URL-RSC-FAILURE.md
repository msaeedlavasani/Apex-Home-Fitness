# Pitfall: Build-Time Public Config Can Differ From Runtime Env (Next.js RSC Failure)

- **STATUS:** CLOSED / documented lesson. Do NOT reopen the historical
  investigation — the diagnostic path below is the reusable lesson.
- **AFFECTED STACK:** Next.js 15 App Router (Server Components), Docker
  multi-stage build, `NEXT_PUBLIC_*` build args inlined at `next build` time.
- **RELATED CHECKPOINT:** S02 — source `60abb2d373983fa781665a0b6301f1ca1f46b357`,
  image `apex-home-fit:s02-60abb2d-r1` (`sha256:d0483ad7…`).

## Symptom

The page could initially render and then collapse into the white Next.js
"Application error: a client-side exception has occurred" (Server Components
render failure) on public routes (`/`, `/en`, `/fa`). Observed RSC digest:
`710792096` (reported once; digest archaeology is closed).

## Misleading Signals

- **HTTP requests could still return 200** for the same routes.
- The **runtime** environment showed a **valid** `NEXT_PUBLIC_SITE_URL`.
- Blocking Service Workers did NOT eliminate the failure (not a SW/cache issue).
- A fresh browser reproduced the failure; an "existing browser" hypothesis was
  wrong.

## Root Cause

A build-time site URL could be empty/invalid and a metadata/server-render path
could reach `new URL("")`, throwing during the Server Components render.

## Why Initial Checks Missed It

`NEXT_PUBLIC_*` values are compiled into the Next.js artifact at build time.
The **already-built artifact** could contain the bad build-time state even
while the runtime environment looked correct. Runtime env inspection alone is
therefore NOT sufficient evidence for `NEXT_PUBLIC` build-time configuration.

## Correct Diagnostic Path

1. Reproduce in a completely fresh browser (listeners before navigation).
2. Rule out Service Worker/cache by re-testing with Service Workers blocked.
3. Separate BUILD-TIME config from RUNTIME config — inspect what the *artifact*
   contains (e.g. compiled server chunks) as well as the container env.
4. Use server logs / a narrow temporary instrumentation to capture the actual
   exception, then REMOVE the instrumentation before the release commit.
5. Fix the concrete source defect; never ship the instrumentation.

## Fix Pattern

A central safe URL resolver with validation and fallback
(`src/lib/siteUrl.ts`): trim, validate with `new URL()`, fall back to a
documented default origin instead of ever reaching `new URL("")`. All
metadata/canonical/OG/sitemap paths consume the resolver.

## Regression Coverage

Focused tests cover:
- empty value → fallback
- malformed value → fallback
- valid value → origin preserved

## Production Acceptance

Accepted only after: clean immutable build → local Production-mode
real-browser validation → rollback preparation → controlled deployment →
fresh Production browser matrix → delayed re-check → container stability →
DB invariants unchanged.

## Prevention

- Treat `NEXT_PUBLIC_*` as build-time configuration; validate empty, invalid
  and valid states in tests.
- Never assume runtime env reflects what is compiled into the artifact.
- Report config state only as `PRESENT_VALID` / `PRESENT_EMPTY` / `ABSENT` /
  `INVALID`; never print secret values.

## DO NOT DO

- Do not reopen historical RSC digest analysis or old image/Build-ID
  archaeology.
- Do not treat HTTP 200 as browser acceptance for this class of failure.
- Do not keep temporary diagnostic hooks in release builds.
