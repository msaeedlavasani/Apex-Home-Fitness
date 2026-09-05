# TS-03 — Account / Data Deletion

> **STATUS: DELIVERED / CLOSED (CODE_NO_DEPLOY) — 2026-09-05.**
> Implementation landed on `origin/main` with Main CI PASS on the exact
> SHA (batch delivery with CP-03 measurement review — see
> `docs/BATCH_DELIVERY_V2.md` and the batch record in `docs/TASKS.md`).
> **Production deletion acceptance remains a separate Owner-gated step**
> (OWNER_DECISION_GATE + gateway environment) — nothing here executed a
> real deletion against any live Supabase project or Production database.

## 1. Objective

Give the user a clear, confirmed, irreversible path to delete their
account **and all associated user data** across both data planes, while
never deleting shared content. This is a trust surface (TS-01 C-class
user control) and a legal requirement in many jurisdictions; it must be
fail-closed and honest about what it does.

## 2. Scope — what is deleted vs preserved

| Plane | Deleted (user-owned) | Preserved (shared) |
|---|---|---|
| Prisma (SQLite) | `User`, `WeightEntry`, `WorkoutSession` + `WorkoutSessionExercise` (FK cascade), `QuizResponse`, `ProgramGenerationRequest`, `PhoneOtp` rows for the account's verified phone | `Program` rows are **de-owned** (`ownerId → null`) — programs are shared content; Exercise / Movement / MovementRelationship / MovementMedia catalog is global; `AdminAccount` / `AdminSession` are a separate identity domain |
| Supabase | `workout_exercise_logs` outbox rows (by `user_id`), avatar object in the `avatars` bucket, the auth identity itself (service-role `admin.auth.admin.deleteUser` — also revokes its sessions) | Nothing user-specific |

## 3. Confirmation & irreversibility

- The API requires the body literal `DELETE` (`DELETE_CONFIRMATION`) —
  anything else is `400 CONFIRMATION_REQUIRED` before anything is touched.
- The UI (profile → Delete account) explains exactly what is removed,
  states that it cannot be undone, and requires typing `DELETE` to enable
  the submit button. The literal is deliberately locale-independent
  (GitHub-style typed confirmation).
- No soft-delete, no undo, no restore path.

## 4. Orchestration (deterministic, fail-closed)

`deleteAccount(deps, input)` in `src/services/accountDeletionService.ts`:

1. Validate `confirmation === DELETE_CONFIRMATION` (else
   `CONFIRMATION_REQUIRED`).
2. `loadUser(userId)` — the Supabase auth id is also the Prisma
   `User.id` (identity contract, `userService.syncUserWithSupabase`).
   Missing → `ACCOUNT_NOT_FOUND` (404).
3. Prisma transaction (`deleteUserData`): delete WeightEntry,
   WorkoutSession, QuizResponse, ProgramGenerationRequest; de-own
   Programs; delete PhoneOtp by phone; delete the User row. All-or-nothing.
4. Delete Supabase outbox rows (`workout_exercise_logs` by `user_id`).
5. Delete the avatar object (no-op for null / legacy in-DB data URLs).
6. Delete the Supabase auth identity — **last**, the point of no return
   (also revokes its sessions server-side).
7. The route then signs out the browser session (200 `{ok: true}`); the
   client redirects to the public start page.

**Partial-failure semantics (honest):** failure in (3) → transaction
rollback, account intact, typed `DATA_DELETE_FAILED`. Failure in (4)/(5)/
(6) after (3) → app data gone but auth identity survives, so the user can
still sign in and retry; the retry is idempotent (the recreated Prisma row
is empty and deleted again). Cross-system deletion is non-atomic by
nature and documented as such — success is never claimed unless every step
completed.

## 5. Surface & guards

- **Route:** `DELETE /api/account/delete` — session required (401), JSON
  body with `confirmation` (400), typed errors mapped to HTTP:
  `ACCOUNT_NOT_FOUND` → 404, `CONFIG_MISSING` → 503 (fail closed when the
  service-role env is absent), provider/data failures → 502, unknown → 500.
- **UI:** `ProfileView` "Delete account" section (danger styling,
  `text-apple-red` / `bg-apple-red` tokens) with a typed-confirmation
  step; keys in `src/messages/{en,fa}.json`.
- **Service contracts:** narrow, injectable interfaces
  (`AccountDeletionDataClient`, `AccountDeletionAdminClient`,
  avatar deleter) so tests run offline with fakes — no Prisma or Supabase
  needed; factories adapt the real clients and fail closed on missing env.

## 6. Verification

`tests/account-deletion.test.ts` (11 tests, offline): confirmation gate
(nothing touched without the literal), full cascade + ordering (auth
identity last), legacy-avatar no-op, `ACCOUNT_NOT_FOUND` / data-failure /
outbox-failure / auth-failure paths (fail-stop, honest errors), the
Prisma transaction covering every user-owned table + de-owning + OTP
ledger by phone + user delete, and `CONFIG_MISSING` on the admin factory.
Repo-wide: typecheck clean, full unit suite green, lint 0 errors,
`GOVERNANCE_PASS`, UI conformance check green.

## 7. Honest limits & next steps

- **Production deletion acceptance is NOT covered** — executing the flow
  against the Production Supabase project (real auth users, real synced
  logs, real avatar bucket) requires an Owner decision + the gateway
  environment, and must include acceptance of the deletion flow on a
  disposable account before it is exposed to users.
- Legal retention carve-outs (jurisdiction-specific records that must
  survive deletion) are a TS-02 (legal review) requirement, not resolved
  here.
- OTP ledger rows for the deleted phone are removed; any long-lived
  phone-identity records outside the Prisma/Supabase planes would need a
  follow-up audit (none known today).