# ADR-0004: Dedicated Administrator Authentication

> **STATUS: ACCEPTED — 2026-08-31**
>
> **Decision owner:** Product/architecture owner
>
> **Implementation task:** `ADMIN-AUTH-01`

## Context

Apex Home Fit has a public Phone + OTP user journey backed by the existing
Supabase SSR session boundary. Administrator access is a separate security
boundary and must not inherit the public user UX or become coupled to the OTP
provider.

## Decision

Implement Admin Auth V1 with:

- dedicated `/admin/login`;
- Email + Password authentication;
- no public administrator registration;
- secure manual provisioning only;
- one authorization role: `ADMIN`;
- server-side authorization for every protected `/admin/*` surface;
- modern password hashing (Node `scrypt` with per-account salt and a versioned
  stored format);
- login abuse protection and secure opaque sessions stored as hashes;
- a provider-independent authentication boundary so the implementation can be
  replaced or extended without changing admin route authorization;
- a credential boundary that can later support Passkey/WebAuthn, without
  implementing Passkey/WebAuthn in V1.

Admin credentials and sessions are separate from public `User` rows and the
Supabase Phone + OTP session. No general multi-role RBAC system is introduced.

## Security invariants

- Passwords, raw session tokens, and provisioning input never enter source,
  committed configuration, responses, or logs.
- Login failures use a generic response and do not reveal whether an email is
  provisioned, disabled, or valid.
- Session cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, and
  bounded by server-side expiry/revocation checks. The cookie uses a host-only
  name without a `Domain` attribute. It is used only by server-side admin
  route code and does not establish a public user session.
- Disabled accounts and non-`ADMIN` roles fail closed on every protected route.
- Rate limiting uses the existing repository rate-limit abstraction; a store
  failure fails closed rather than bypassing abuse protection.

## Consequences

Positive:

- Administrator access is isolated from public OTP/provider behavior.
- The route authorization seam is provider-neutral and testable.
- Manual provisioning avoids an unaudited public account-creation surface.

Trade-offs:

- Admin account provisioning is an operator workflow and is not self-service.
- V1 requires a future recovery/rotation procedure to be separately specified
  before it is automated.
- A future Passkey/WebAuthn task must define enrollment, recovery, and step-up
  semantics before implementation.

## Explicit deferral

Passkey/WebAuthn is **DEFERRED — NOT IMPLEMENTED IN V1**. It is a persisted
follow-up, not an implicit part of this task.

## Related contracts

- Current implementation contract: [`../ADMIN_AUTH.md`](../ADMIN_AUTH.md)
- Executable task: [`../TASKS.md`](../TASKS.md)
- Public OTP contract remains [`../OTP_LAUNCH_READINESS.md`](../OTP_LAUNCH_READINESS.md)
