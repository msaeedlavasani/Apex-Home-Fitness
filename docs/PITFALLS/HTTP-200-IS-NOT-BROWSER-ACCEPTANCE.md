# Pitfall: HTTP 200 Does Not Prove a Browser Release Is Healthy

- **STATUS:** CLOSED / documented lesson.
- **AFFECTED STACK:** Any browser-facing release; observed on Next.js 15 App
  Router Production.
- **RELATED CHECKPOINT:** S02 — image `apex-home-fit:s02-60abb2d-r1`
  (`sha256:d0483ad7…`); R6 — image `apex-home-fit:r6-aee28d1`
  (`sha256:6aabafe1…`).

## Observed

Production `/en` could return **HTTP 200** while a fresh browser reached the
white Next.js Application Error. The page could **render briefly → collapse →
"Application error: a client-side exception has occurred"**.

## Why HTTP Smoke Missed It

An HTTP transport/server response does not prove a successful browser
render/hydration/RSC/client lifecycle. A route returning 200 may still:

- crash during RSC rendering
- fail during hydration
- throw client-side exceptions
- render briefly then collapse
- fail after navigation
- fail due to stale/client artifact interaction

## Required Prevention

Real-browser acceptance with listeners attached BEFORE navigation:

- `pageerror`
- console errors
- `requestfailed`
- HTTP >= 500 responses

Use a **fresh browser context** (no cookies, no stale application cache).
For high-risk releases, repeat the matrix after 30–60 seconds (delayed
re-check). Test the full route matrix relevant to the release and record per
route: status, final URL, rendered content evidence, redirects, page errors,
console errors, failed requests, server errors.

## Explicit Statement

For browser-facing Production acceptance:

```
HTTP_SMOKE  = necessary but NOT sufficient
REAL_BROWSER_SMOKE = required
```

## DO NOT DO

- Do not accept a release on `curl`/HTTP 200 alone.
- Do not assume a stable container implies healthy rendering.
- Do not skip the delayed re-check on high-risk releases.
