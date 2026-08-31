# ADMIN-IMPERSONATION-01 — Deferred Capability Specification

> **STATUS: DEFERRED / NOT AUTHORIZED FOR IMPLEMENTATION** (persisted
> 2026-09-01 during `BATCH-DELIVERY-AND-ADMIN-AUDIT-01`)
>
> This document records the **goal and mandatory future requirements** of
> admin impersonation ("View-as-User"). It does **not** authorize
> implementation, design work, schema changes, or any code. Nothing here may
> be executed until the Owner separately authorizes a bounded task in
> `docs/TASKS.md` **and** a security review gate has passed.
>
> Canonical owner of admin-auth decisions: [`ADMIN_AUTH.md`](ADMIN_AUTH.md)
> (deferred row) and [`docs/TASKS.md`](../TASKS.md) (registered decisions).

## 1. Goal

Allow an authorized administrator to enter a specific user's application
context for support/troubleshooting, without ever standing in the user's
shoes for authentication or receiving the user's credentials.

## 2. Mandatory future requirements (non-negotiable when/if authorized)

1. **Explicit actor admin identity** — the impersonating administrator's
   own identity is always known and recorded.
2. **Explicit target user identity** — the impersonated user is always
   known and recorded; wildcard/ambiguous targets are rejected.
3. **Durable audit trail** — every impersonation event (start, navigation
   of protected actions, exit) is persisted server-side in an audit record;
   the trail survives the session and cannot be disabled by the actor.
4. **Start/end timestamps** — every impersonation session records explicit
   start and end timestamps; open sessions are visible and terminable.
5. **Persistent unmistakable impersonation banner** — a banner clearly
   showing the actor identity and the target user identity is visible on
   every page for the entire impersonation; it cannot be dismissed,
   hidden, or styled away.
6. **Explicit safe exit** — one obvious, always-available "Exit
   impersonation" action that atomically ends the impersonation back in the
   admin context.
7. **Admin/user session isolation** — impersonation never reuses or mutates
   the admin's own session, and never reuses the user's real session; it is
   a separate, bounded, revocable context.
8. **No credential exposure or use** — the admin never sees, receives, or
   uses the user's password, OTP, tokens, or session material.
9. **Sensitive/destructive operations restricted while impersonating** —
   anything destructive, mutating, payment/plan-affecting, identity-
   changing, or credential-adjacent is blocked or requires step-up while
   impersonating; the restriction set is defined in the authorized task.
10. **Server-side authorization/enforcement** — every impersonation request
    is authorized server-side (bounded admin role + explicit capability),
    never enforced only in the client UI.
11. **Security review before implementation** — a dedicated security review
    gate (threat model, audit-log review, fail-closed tests) precedes any
    implementation; the review result is persisted.

## 3. Naming / reference reconciliation

No conflicts found as of 2026-09-01:

- `ADMIN-AUTH.md` deferred follow-up names the capability
  `ADMIN-IMPERSONATION-01` ("View-as-User").
- `docs/TASKS.md` registered-decisions table lists
  "Admin impersonation / View-as-User — DEFERRED / NOT AUTHORIZED".
- ADR-0004 (`docs/adr/0004-dedicated-admin-authentication.md`) keeps admin
  impersonation out of the V1 admin-auth boundary (verified by title/scope;
  no conflicting references found in `src/lib/admin`, middleware, or
  routes — grep verified).
- No code symbols, routes, schema fields, or UI strings implementing or
  referencing impersonation exist in `src`.
- Recommended canonical task name (no rename needed): **ADMIN-IMPERSONATION-01**;
  description string "Admin impersonation / View-as-User" retained for
  continuity. Future tasks MUST extend the existing audit-table surface
  (`AdminSession`/operations ledger patterns) rather than create parallel
  audit stores.

## 4. Explicit exclusions today

- Admin Console V1 (`ADMIN-CONSOLE-01`, CLOSED) contains **no**
  impersonation simulation, placeholder, or "View as" affordance.
- No schema, migration, route, or UI preparatory work is authorized by this
  document. Even preparatory schema work is NOT authorized until the Owner
  authorizes a task. (Do not "pre-stage" the data model.)

## 5. Execution gate (if ever promoted)

Promotion requires, in order: Owner authorization in `docs/TASKS.md` →
bounded task record (ID, scope, dependencies, profile, acceptance) →
security review gate → implementation → full lifecycle per repository
Governance. Until then this document is a DEFERRED decision record only.