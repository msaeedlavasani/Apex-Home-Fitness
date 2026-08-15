-- 0001_workout_exercise_logs.sql
-- Sync target for offline-completed workout exercises.
--
-- `src/services/syncService.ts` upserts rows here (on `id`) when the device
-- is back online. `user_id` matches the Supabase auth user id — the same id
-- that `src/services/userService.ts` persists as the Prisma `User.id`, so
-- server code can join these rows back to the app user.
--
-- Apply with:  supabase db push   (or paste into the Supabase SQL editor)

create table if not exists public.workout_exercise_logs (
  id               text primary key,          -- client-generated uuid
  user_id          text not null,              -- supabase auth user id
  session_id       text,                       -- groups sets of one workout
  exercise_id      text not null,
  exercise_name    text not null,
  exercise_order   integer not null default 0, -- 0-based position in workout
  set_number       integer not null default 1, -- 1-based set within exercise
  actual_sets      integer,
  actual_reps      integer,
  duration_seconds integer,
  completed_at     timestamptz not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists workout_exercise_logs_user_idx
  on public.workout_exercise_logs (user_id);

create index if not exists workout_exercise_logs_session_idx
  on public.workout_exercise_logs (session_id);

create index if not exists workout_exercise_logs_completed_at_idx
  on public.workout_exercise_logs (completed_at desc);

-- Row Level Security: users can only read / write their own logs.
alter table public.workout_exercise_logs enable row level security;

create policy "Users read own workout logs"
  on public.workout_exercise_logs
  for select
  using (auth.uid()::text = user_id);

create policy "Users insert own workout logs"
  on public.workout_exercise_logs
  for insert
  with check (auth.uid()::text = user_id);

create policy "Users update own workout logs"
  on public.workout_exercise_logs
  for update
  using (auth.uid()::text = user_id);
