# ADR-0020: Account / Data Deletion

> **STATUS: ACCEPTED — 2026-09-05**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `TS-03` (Account / data deletion, delivered
> 2026-09-05; architecture:
> `docs/architecture/TS-03-ACCOUNT-DELETION.md`; service:
> `src/services/accountDeletionService.ts`; route:
> `src/app/api/account/delete/route.ts`; UI: `ProfileView` delete-account
> section; invariants: `tests/account-deletion.test.ts`; view in
> `docs/TASKS.md`)
>
> **Execution gating:** this ADR ratifies the deletion flow design and the
> CODE_NO_DEPLOY delivery. **Production deletion acceptance is NOT covered
> by this ADR** — applying the flow against the Production Supabase project
> and its data remains a separate Owner-gated step (OWNER_DECISION_GATE +
> gateway environment). Legal retention carve-outs (jurisdiction-specific
> records that must survive account deletion) remain a TS-02 (legal review)
> requirement and are out of scope here.

## Context

TS-01 (privacy architecture) established user control and data
minimization as binding principles; account deletion is a trust surface and
a legal requirement in many jurisdictions. The app spans two data planes —
the Prisma/SQLite application data (profile, weight history, workouts,
quiz, generated programs) and the Supabase plane (auth identity, synced
offline workout logs, avatar storage). Deleting "the account" must be
defined precisely across both planes, must be irreversible and confirmed,
and must never delete shared content.

## Decision

1. **Deletion scope = user-owned data only.** Deleted: Prisma `User` +
   `WeightEntry`, `WorkoutSession` (+`WorkoutSessionExercise` via FK
   cascade), `QuizResponse`, `ProgramGenerationRequest`, `PhoneOtp` rows
   keyed by the account's verified phone (no FK — deleted by phone),
   Supabase `workout_exercise_logs` outbox rows (by `user_id`), the avatar
   object, and the Supabase auth identity (service-role
   `admin.auth.admin.deleteUser`). **Preserved:** shared content —
   `Program` rows are de-owned (`ownerId → null`) rather than deleted; the
   Exercise/Movement/MovementMedia catalog and admin identities are
   untouched.
2. **Irreversibility + explicit confirmation.** No soft-delete/undo. The
   API refuses to act unless the body carries the exact literal `DELETE`;
   the UI requires the user to type it. Irreversibility is stated in the
   UI before any deletion can begin.
3. **Ordering / atomicity (honest, cross-system).** Prisma user-owned data
   is deleted first inside ONE transaction (all-or-nothing on the Prisma
   side); then Supabase outbox rows and the avatar; the auth identity is
   deleted LAST (the point of no return). A failure before the auth
   identity leaves the identity alive so the user can sign in and retry —
   the retry is idempotent. Failures are surfaced as typed errors
   (`DATA_DELETE_FAILED` / `PROVIDER_DELETE_FAILED`); success is claimed
   only after every step completed. Cross-system deletion is documented as
   non-atomic by nature.
4. **Auth guard + method.** The route requires a valid session
   (401 otherwise) and is `DELETE` with a JSON body; the typed
   confirmation is the explicit-intent gate against CSRF/accidental
   deletion.
5. **Production apply remains gated.** The CODE_NO_DEPLOY delivery
   (service + route + UI + tests, all offline-validated) does not touch
   the Production Supabase project. Executing real deletion in Production,
   including Production acceptance of the deletion flow, requires a
   separate Owner decision and the gateway environment.

## Consequences

- Users get a clear, confirmed, irreversible deletion path that removes
  all personal data across both planes while shared content survives.
- The deletion surface is fail-closed: missing config (503), missing
  confirmation (400), unauthenticated (401), unknown account (404),
  provider/data failures (502) — never a silently-partial success.
- TS-02 legal review must reconcile jurisdiction-specific retention
  carve-outs (e.g. records that must survive deletion) with this flow.
- Production deletion acceptance remains a tracked Owner gate, not an
  automatic consequence of this ADR.