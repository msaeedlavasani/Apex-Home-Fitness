# Admin Authentication V1

> **STATUS: CURRENT — ADMIN AUTH V1 CONTRACT**
>
> Implementation task: `ADMIN-AUTH-01`; architecture authority:
> [`adr/0004-dedicated-admin-authentication.md`](adr/0004-dedicated-admin-authentication.md).

## Boundary

Admin authentication is independent from public Phone + OTP authentication.
Admin accounts are stored in the local Prisma data boundary and use a dedicated
opaque session cookie. Public `User` rows, Supabase sessions, OTP codes, and
public auth UX are not reused as administrator credentials.

## V1 contract

- Login: `GET /admin/login` and `POST /api/admin/login`.
- Logout: `POST /api/admin/logout`.
- Protected example surface: `GET /admin/dashboard`.
- Credential: email + password.
- Role: exactly `ADMIN` in V1.
- Registration: none; no public admin signup route exists.
- Provisioning: operator-run `scripts/provision-admin.ts`; password input is
  supplied out-of-band and is never committed or logged.
- Passkey/WebAuthn: explicitly deferred; the credential boundary is kept
  replaceable, but no passkey enrollment/authentication exists in V1.

## Security contract

- Passwords use Node `scrypt` with a per-account random salt and versioned hash
  encoding. Password hashes are never returned to clients.
- Session cookies contain random opaque tokens; only SHA-256 token digests are
  stored. Sessions expire, can be revoked, and are checked server-side on every
  protected request.
- Login attempts are bounded by the existing shared rate-limit abstraction for
  both client IP and normalized email. Rate-limit store failure fails closed.
- Login errors are generic to avoid account enumeration.
- Protected route authorization runs in the server layout/route boundary, not
  only in client UI. A disabled account or unexpected role is rejected.
- CSRF posture for the login/logout mutation uses same-site cookies plus an
  Origin/Referer same-origin check where the browser supplies those headers.
- No password, session token, secret, or provisioning input belongs in logs,
  source, `.env.example`, or reports.

## Environment

Admin auth uses the runtime `DATABASE_URL` already owned by the Prisma contract;
there is no admin secret build argument. Optional policy variables are:

- `ADMIN_SESSION_TTL_MS` — positive bounded session lifetime; default 12 hours.
- `ADMIN_LOGIN_WINDOW_MS` — positive bounded login window; default 15 minutes.
- `ADMIN_LOGIN_IP_LIMIT` — default 10 attempts per IP window.
- `ADMIN_LOGIN_EMAIL_LIMIT` — default 5 attempts per email window.

These names are configuration only; values belong in the protected runtime
secret/configuration channel, never in Git.

## Provisioning

Provisioning is manual and server-side. Run the checked-in provisioning helper
with an operator-controlled password input channel. Do not put passwords in
shell history, command arguments, source, or committed files. Provisioning is
not a web endpoint and does not alter the public registration surface.

## Deferred follow-up

`ADMIN-AUTH-PASSKEY-01` — define and implement Passkey/WebAuthn enrollment,
recovery, and step-up authentication after a separate owner authorization.

`ADMIN-IMPERSONATION-01` — **DEFERRED / NOT AUTHORIZED**. Any future
View-as-User capability crosses the administrator/public-user security
boundary and therefore requires, at minimum, a durable audit log, a persistent
and unambiguous “Viewing as…” banner, explicitly constrained operations, and
an immediate exit guard. Admin Console V1 must not simulate or partially
implement this capability.

## Admin Console V1

`ADMIN-CONSOLE-01` is **CLOSED (PRODUCTION_PASS, 2026-08-31)**. Admin Console
V1 is live on Production (exact-main image
`apex-home-fit:release-2d131fc60453` via the Production Deployment Gateway)
covering read-only Overview, Users, Workout Plans, Exercises, Operations, and
Admin/Sessions.

- Every console surface is a Server Component behind `requireAdmin()`; no new
  admin API or registration endpoint was added (the admin API boundary remains
  exactly `login` + `logout`).
- All projections are read-only and exclude password hashes, session-token
  hashes, OTP codes/hashes, and any credential or secret material.
- Public Phone + OTP behavior is unchanged; no impersonation / View-as-User;
  no schema or migration change (`DB_CHANGED = NO`).
- Focused security/data tests (`tests/admin-console.test.ts`) plus a
  self-provisioning real-browser acceptance spec
  (`tests/admin-console.spec.ts`, full E2E suite).

Future console capabilities must preserve this authentication boundary, use
only real data and safe projections, and follow the canonical release policy
(Production delivery through the gateway).
