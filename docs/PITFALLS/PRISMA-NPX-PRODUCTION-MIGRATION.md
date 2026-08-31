# Pitfall: Dynamic `npx prisma` Resolution Fails in Images Without the Pinned CLI

- **STATUS:** CLOSED / documented lesson
- **RELATED INCIDENT:** ADMIN-AUTH-PROD-01

## Lesson

Production migrations MUST use the exact project-pinned Prisma CLI from the
canonical source/package-lock — never a dynamically resolved `npx prisma`.

The Next.js standalone runner image does NOT contain the Prisma CLI (only the
generated client engines). Running `npx prisma migrate deploy` inside it made
npx dynamically download `prisma@<registry-latest>` (observed: 8.0.0-rc.12),
which failed with `No command registered for migrate`; the owner aborted and
the migration stayed pending with no SQL executed.

## Rules

- Invoke the pinned binary directly: `node_modules/.bin/prisma …`, installed
  via `npm ci` from the lockfile (e.g. an ops image derived from the canonical
  source archive) — never `npx prisma` and never an unpinned install.
- Derive migration runners from the exact canonical source/package-lock; keep
  the runner on the target architecture (Prisma engines are platform-specific).
- Verify the in-image version before migrating (`prisma --version` must equal
  the lockfile pin).
- Archive layout matters: `git archive` without `--prefix` puts files at the
  archive root — a `--strip-components=1` extraction mangling every path and
  dropping root files like `Dockerfile`. Detect the source root by finding the
  `Dockerfile` after a plain extraction, and use hard `if/fi` guards (an
  `&&`-chain verification is exempt from `set -e` and will not stop the script).
