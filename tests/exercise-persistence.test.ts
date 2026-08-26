/**
 * S02-C — canonical exercise resolution during program persistence.
 *
 * Integrates the approved Exercise resolver (`src/lib/exercise/resolver.ts`)
 * + system catalog into `persistProgramTransaction` so newly persisted
 * exercises adopt canonical identity (slug) only when safe, while preserving
 * the exact legacy name-based path for unresolved/ambiguous input.
 *
 * The central invariant: a Program that persists today keeps persisting —
 * resolver/slug work is additive and best-effort. No backfill, no production
 * data, offline.
 *
 * Verified against a REAL scratch SQLite database (temp dir via `prisma db
 * push`, same pattern as `tests/program-inplace-regeneration.test.ts`).
 */
import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PrismaClient} from '@prisma/client';

import type {
  AiGeneratedProgram,
  SaveGeneratedProgramInput,
} from '../src/services/programService';

// ---------------------------------------------------------------------------
// Scratch database setup
// ---------------------------------------------------------------------------

const tmpDir = mkdtempSync(join(tmpdir(), 'exercise-persistence-test-'));
const dbUrl = `file:${join(tmpDir, 'exercise-persistence-test.db')}`;

// Must be set BEFORE any module that constructs a PrismaClient is imported.
process.env.DATABASE_URL = dbUrl;

let client: PrismaClient;
let programService: typeof import('../src/services/programService');
let userId: string;

before(async () => {
  const prismaCli = join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate'], {
    env: {...process.env, DATABASE_URL: dbUrl},
    stdio: 'pipe',
    timeout: 60_000,
  });

  programService = await import('../src/services/programService');
  client = new PrismaClient();

  const user = await client.user.create({
    data: {
      email: `s02c-${Date.now()}@test.local`,
      name: 'S02-C Tester',
      passwordHash: 'test-only',
    },
  });
  userId = user.id;
});

after(async () => {
  await client?.$disconnect();
  rmSync(tmpDir, {recursive: true, force: true});
});

// ---------------------------------------------------------------------------
// Fixtures — exercises injected into an otherwise valid program
// ---------------------------------------------------------------------------

interface ExerciseSeed {
  name: string;
  method?: string;
  equipment?: string;
  reps?: string | null;
}

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function exercise(name: string, overrides: Partial<ExerciseSeed> = {}): AiGeneratedProgram['weekly_schedule'][number]['exercises'][number] {
  return {
    id: `ex_${Math.random().toString(36).slice(2)}`,
    name,
    method: (overrides.method ?? 'bodyweight') as AiGeneratedProgram['weekly_schedule'][number]['exercises'][number]['method'],
    equipment: (overrides.equipment ?? 'none') as AiGeneratedProgram['weekly_schedule'][number]['exercises'][number]['equipment'],
    sets: 3,
    reps: overrides.reps ?? '10',
    rest_seconds: 60,
    tempo: null,
    rpe: null,
    instruction_cue: `Cue for ${name}.`,
    alternatives: [],
    contraindicated_for: [],
  };
}

function programWith(names: string[]): SaveGeneratedProgramInput {
  const schedules = names.map((name, index) => ({
    day: index + 1,
    day_name: WEEKDAYS[index % WEEKDAYS.length]!,
    focus: `Focus ${name}`,
    warmup: [],
    exercises: [exercise(name)],
    cooldown: [],
  }));
  return {
    program: {
      mode: 'general',
      program_id: `prog-${Math.random().toString(36).slice(2)}`,
      method_mix: {
        strength_pct: 40,
        hypertrophy_pct: 20,
        cardio_pct: 15,
        mobility_pct: 10,
        pilates_pct: 0,
        bodyweight_pct: 15,
        isometric_pct: 0,
      },
      weekly_schedule: schedules,
      progression_plan: {weeks_1_2: 'x', weeks_3_5: 'y', week_6: 'z', overload_variables: ['sets']},
      warnings: [],
      notes: 'S02-C test.',
      disclaimer: 'Test.',
    },
    level: 'beginner',
    goal: 'strength',
  };
}

async function persistExercise(name: string): Promise<{id: string; slug: string | null}> {
  const program = await programService.persistProgramForUser(userId, programWith([name]));
  const link = await client.programExercise.findFirstOrThrow({
    where: {programId: program.id},
    include: {exercise: {select: {id: true, slug: true}}},
  });
  return {id: link.exercise.id, slug: link.exercise.slug};
}

// ---------------------------------------------------------------------------
// buildProgramDraft — slug assignment policy
// ---------------------------------------------------------------------------

test('buildProgramDraft attaches the canonical slug for a resolved name and leaves NULL otherwise', () => {
  // "Push-Up" is a canonical seed-catalog entry (slug `push-up`).
  const resolved = programService.buildProgramDraft(programWith(['Push-Up']));
  const exercise = resolved.exercises.find((e) => e.name === 'Push-Up');
  assert.ok(exercise);
  assert.equal(exercise.slug, 'push-up');

  // Unresolved names carry no slug.
  const unknown = programService.buildProgramDraft(programWith(['Totally-Unknown-Movement']));
  const unknownEx = unknown.exercises.find((e) => e.name === 'Totally-Unknown-Movement');
  assert.ok(unknownEx);
  assert.equal(unknownEx.slug, undefined);

  // faName is never populated (no Persian corpus — Step 5 policy).
  assert.ok(!('faName' in resolved.exercises[0]!));
});

// ---------------------------------------------------------------------------
// Persistence — RESOLVED
// ---------------------------------------------------------------------------

test('resolved canonical exercise persists a new row WITH the canonical slug', async () => {
  const {slug} = await persistExercise('Push-Up');
  assert.equal(slug, 'push-up');
});

test('a resolved alias ("pushups" -> Push-Up) reuses the same canonical row by slug', async () => {
  // Persist the alias first — row "pushups" is created with slug `push-up`.
  const viaAlias = await persistExercise('pushups');
  assert.equal(viaAlias.slug, 'push-up');

  // Persist the canonical display name — must reuse the SAME row (by slug),
  // not create a duplicate.
  const viaCanonical = await persistExercise('Push-Up');
  assert.equal(viaCanonical.slug, 'push-up');
  assert.equal(viaCanonical.id, viaAlias.id, 'canonical alias must reuse the same row');
});

test('legacy NULL-slug exact-name row is reused and gains the slug', async () => {
  // Pre-create a legacy row keyed by the exact name, slug NULL.
  const legacy = await client.exercise.create({
    data: {
      name: 'Wall Sit',
      description: 'Legacy seed row.',
      category: 'ISOMETRIC',
      difficulty: 'BEGINNER',
      instructions: [],
      equipment: [],
      slug: null,
    },
  });

  const {id, slug} = await persistExercise('Wall Sit');
  assert.equal(slug, 'wall-sit');
  assert.equal(id, legacy.id, 'legacy row must be reused, not duplicated');
});

test('repeat persistence of the same resolved exercise is idempotent — one row, same slug', async () => {
  const first = await persistExercise('Dead Bug');
  assert.equal(first.slug, 'dead-bug');
  const second = await persistExercise('Dead Bug');
  assert.equal(second.slug, 'dead-bug');
  assert.equal(second.id, first.id, 'repeat persistence must not create a duplicate row');
});

// ---------------------------------------------------------------------------
// Persistence — UNRESOLVED / AMBIGUOUS (fallback must keep persisting)
// ---------------------------------------------------------------------------

test('unknown exercise persists by name with slug NULL (legacy behavior)', async () => {
  const {id, slug} = await persistExercise('Ex-Never-Heard-Of-It');
  assert.equal(slug, null);
  const row = await client.exercise.findUniqueOrThrow({where: {id}});
  assert.equal(row.name, 'Ex-Never-Heard-Of-It');
});

test('unknown exercise repeated twice stays one idempotent name-keyed row', async () => {
  const first = await persistExercise('Zany-Unknown-X');
  const second = await persistExercise('Zany-Unknown-X');
  assert.equal(first.slug, null);
  assert.equal(second.slug, null);
  assert.equal(second.id, first.id, 'name-upsert must remain idempotent');
});

test('an alias reuses the already-slugged canonical row and links to it (no duplicate)', async () => {
  // An existing canonical row already owns slug `plank-hold` under the display
  // name "Plank Hold" (e.g. created by a prior program or seed).
  const canonical = await client.exercise.create({
    data: {
      name: 'Plank Hold',
      description: 'Canonical row.',
      category: 'ISOMETRIC',
      difficulty: 'BEGINNER',
      instructions: [],
      equipment: [],
      slug: 'plank-hold',
    },
  });

  // "Plank" is an alias of Plank Hold → resolves to slug `plank-hold`. The
  // program link must reuse the canonical row — no duplicate row, correct
  // `ProgramExercise.exerciseId`.
  const program = await programService.persistProgramForUser(
    userId,
    programWith(['Plank']),
  );
  const link = await client.programExercise.findFirstOrThrow({
    where: {programId: program.id},
    include: {exercise: {select: {id: true, slug: true}}},
  });
  assert.equal(link.exercise.id, canonical.id, 'alias must link to the canonical row');
  assert.equal(link.exercise.slug, 'plank-hold');
  // No duplicate "Plank" row was created.
  assert.equal(await client.exercise.count({where: {slug: 'plank-hold'}}), 1);
});