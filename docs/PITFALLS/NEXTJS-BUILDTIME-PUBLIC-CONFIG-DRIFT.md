# Pitfall: Runtime Public Env Can Hide Missing Next.js Build-Time Config

- **STATUS:** CLOSED / documented lesson
- **RELATED INCIDENT:** POST-RESET-UI-01
- **AFFECTED STACK:** Next.js App Router, Docker multi-stage immutable builds, Supabase SSR

## Symptom

Production allowlisted-phone authentication failed: OTP/session flows returned `invalid_code` or `provider_error`, and session establishment produced an `auth.session.exchange_exception`.

## Trigger

The immutable Production image was built without the required `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` build arguments, while the container runtime `.env` contained the corresponding variables.

## Root cause

Next.js `NEXT_PUBLIC_*` values consumed by browser/client code are compiled and inlined during `next build`. Runtime `process.env` injection cannot repair an artifact that was built without those public values. The corrected immutable image was rebuilt with the required public build-time configuration.

## Why it was misleading

Runtime inspection showed the `NEXT_PUBLIC_SUPABASE_*` variables as SET, while the already-compiled Next.js image still lacked usable public Supabase configuration. The build-time defect explains the later session-exchange failure; it must not be rewritten as the conclusive direct cause of every earlier `invalid_code` observation, which occurred before session establishment.

## Detection

Correlate browser/network responses with sanitized server logs, inspect runtime variable presence without printing values, inspect Docker image identity/architecture, and verify the actual compiled release through real browser acceptance. HTTP 200 and runtime `process.env` are insufficient.

## Fix

Build the exact source SHA as an immutable image with non-empty `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and applicable `NEXT_PUBLIC_SITE_URL` build arguments. Transfer/load and verify the exact image ID before an image-only application deployment.

## Verification

`apex-home-fit:auth-buildfix-3c89609` (`sha256:b8f2a83249df366f2d95bb7d1e05a9f17a84c4bec0897e71ed2da5c13935b4a7`, amd64) ran successfully. DB volume `apexhomefit_prod_db:/data`, loopback binding, and restart stability were preserved. Owner-verified Production acceptance passed: allowlisted phone → OTP request → `123456` → verification → authenticated login.

## Prevention

- Mandatory pre-build validation that required public build arguments are non-empty; fail the release when they are empty.
- Keep public build-time configuration separate from runtime server configuration and secrets. Never pass `SUPABASE_SERVICE_ROLE_KEY`, `SMS_IR_API_KEY`, or other server secrets as public build arguments.
- Perform immutable-image acceptance before Production deployment.
- Include allowlisted-phone → `123456` → authenticated-session Production regression coverage.
- Never infer compiled `NEXT_PUBLIC_*` correctness solely from runtime `process.env`.
- Preserve rollback configuration and the previous immutable image before mutation; preserve the production DB volume.

## Rollback / safety notes

Use a writable temporary path such as `/tmp` for transfer archives; do not broaden protected deployment-directory or `.env` permissions merely for SCP. Change only the application image reference, recreate only the application service, and retain rollback evidence during stabilization. Docker-group membership is privileged access and must not be broadened casually. Verify command execution context before path-sensitive or privileged operations.

## Related operational lessons

See `CLEAN-IMMUTABLE-BUILDS.md`, `HTTP-200-IS-NOT-BROWSER-ACCEPTANCE.md`, `RELEASE_POLICY.md`, and `FEATURE_TO_PRODUCTION.md`. Distinguish application failures from test-harness failures such as an unavailable Playwright browser executable. Operational blockers must be recorded on every termination path (`REPORT_REQUIRED_ON_ALL_TERMINATION_PATHS = YES`).
