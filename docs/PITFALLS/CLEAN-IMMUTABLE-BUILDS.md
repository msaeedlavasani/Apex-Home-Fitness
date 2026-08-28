# Pitfall: Clean Immutable Builds Prevent False Release Confidence

- **STATUS:** CLOSED / documented lesson.
- **AFFECTED STACK:** Docker multi-stage Next.js builds, release evidence.
- **RELATED CHECKPOINT:** S02 (`60abb2d`, `d0483ad7…`), R6 (`aee28d1`,
  `6aabafe1…`).

## Observed

- The S02 release failure was carried in a build-time state (empty
  `NEXT_PUBLIC_SITE_URL` compiled into the artifact) that runtime env
  inspection could not reveal.
- Earlier builds from the same source produced materially different generated
  artifacts (Build IDs, wrappers, client-reference manifests) when contexts
  differed; only a clean immutable build from the exact commit produced the
  accepted, browser-validated release.

## Why Stale Builds Are Dangerous

Reused `.next`, `node_modules`, generated Prisma clients, temporary
diagnostics, uncommitted source, or old Docker build contexts can leak stale
build-time state into the release artifact and invalidate the evidence that a
given image corresponds to a given commit.

## Required Practice

- Build Production releases from an **exact source commit** in a **clean
  context** (`git archive <SHA> | tar -x -C <dir>` or equivalent).
- No stale `.next` / `node_modules` / generated clients / diagnostics.
- Record immutable identity: `SOURCE_COMMIT_FULL`, `IMAGE_TAG`, `IMAGE_ID`,
  `NEXT_BUILD_ID`.
- Transfer the artifact and **verify the remote loaded image ID equals the
  locally validated image ID** before accepting it.
- Validate build-time `NEXT_PUBLIC_*` config independently of runtime env
  (see the build-time URL pitfall).

## DO NOT DO

- Do not build a "release" from a working tree with uncommitted or temporary
  changes.
- Do not reuse build caches/contexts when release evidence must be exact.
- Do not promote candidate builds into the verified checkpoint ledger.
