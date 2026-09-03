/**
 * MG-09 — Movement Graph runtime store switchover.
 *
 * Verified against a REAL scratch SQLite database (temp dir via `prisma db
 * push`, same pattern as `tests/exercise-persistence.test.ts`). Proves the
 * fail-safe adoption gate: an empty/missing Movement table reads as NOT
 * adopted (legacy path unchanged), and once Movement rows exist with linked
 * Exercise rows, canonical names resolve through the graph while unknown
 * names (e.g. AI-generated exercises) still fall back to the legacy lookup.
 */
import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PrismaClient, DifficultyLevel, ExerciseCategory} from '@prisma/client';

const tmpDir = mkdtempSync(join(tmpdir(), 'movement-graph-store-test-'));
const dbUrl = `file:${join(tmpDir, 'movement-graph-store-test.db')}`;

process.env.DATABASE_URL = dbUrl;

let client: PrismaClient;
let store: typeof import('../src/services/movementGraphStore');

before(async () => {
  const prismaCli = join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate'], {
    env: {...process.env, DATABASE_URL: dbUrl},
    stdio: 'pipe',
    timeout: 60_000,
  });

  store = await import('../src/services/movementGraphStore');
  client = new PrismaClient();
});

after(async () => {
  await client?.$disconnect();
  rmSync(tmpDir, {recursive: true, force: true});
});

async function createExercise(name: string, opts: {programId?: string} = {}) {
  const exercise = await client.exercise.create({
    data: {
      name,
      description: `${name} description`,
      category: ExerciseCategory.CALISTHENICS,
      equipment: [],
      difficulty: DifficultyLevel.BEGINNER,
      durationSeconds: 60,
      instructions: [],
    },
  });
  if (opts.programId) {
    await client.programExercise.create({
      data: {programId: opts.programId, exerciseId: exercise.id, order: 0},
    });
  }
  return exercise;
}

async function createProgram() {
  return client.program.create({
    data: {name: `prog-${Date.now()}`, description: 'test program', level: DifficultyLevel.BEGINNER, durationWeeks: 4},
  });
}

test('not adopted (empty Movement table) → legacy path, no graph involved', async () => {
  assert.equal(await store.isMovementGraphAdopted(), false);

  const pushUp = await createExercise('Push-Up');
  const result = await store.resolveWorkoutExercises(['Push-Up', 'Missing-Movement'], null);
  assert.deepEqual(
    result.map((r) => ({id: r.id, name: r.name})),
    [{id: pushUp.id, name: 'Push-Up'}],
  );
});

test('adopted → canonical names resolve through the graph (linked Exercise id)', async () => {
  const squats = await createExercise('Bodyweight Squat');
  await client.movement.create({
    data: {
      slug: 'bodyweight-squat',
      nameEn: 'Bodyweight Squat',
      provenance: {sourceKind: 'SOURCE_CONTROLLED', confidence: 1},
      versioning: {catalogVersion: 1, entryVersion: 1},
      exerciseId: squats.id,
    },
  });

  assert.equal(await store.isMovementGraphAdopted(), true);
  const result = await store.resolveWorkoutExercises(['Bodyweight Squat'], null);
  assert.deepEqual(
    result.map((r) => ({id: r.id, name: r.name})),
    [{id: squats.id, name: 'Bodyweight Squat'}],
  );
});

test('adopted → unknown names still fall back to the legacy lookup', async () => {
  const aiGenerated = await createExercise('Ex-AI-Move');
  const result = await store.resolveWorkoutExercises(['Ex-AI-Move'], null);
  assert.deepEqual(
    result.map((r) => ({id: r.id, name: r.name})),
    [{id: aiGenerated.id, name: 'Ex-AI-Move'}],
  );
});

test('adopted → program-membership filter applies to graph rows too', async () => {
  const program = await createProgram();
  const inProgram = await createExercise('Plank', {programId: program.id});
  const notInProgram = await createExercise('Dead Bug');
  await client.movement.create({
    data: {
      slug: 'plank',
      nameEn: 'Plank',
      provenance: {sourceKind: 'SOURCE_CONTROLLED', confidence: 1},
      versioning: {catalogVersion: 1, entryVersion: 1},
      exerciseId: inProgram.id,
    },
  });
  await client.movement.create({
    data: {
      slug: 'dead-bug',
      nameEn: 'Dead Bug',
      provenance: {sourceKind: 'SOURCE_CONTROLLED', confidence: 1},
      versioning: {catalogVersion: 1, entryVersion: 1},
      exerciseId: notInProgram.id,
    },
  });

  const result = await store.resolveWorkoutExercises(['Plank', 'Dead Bug'], program.id);
  // Only the program member survives the filter.
  assert.deepEqual(
    result.map((r) => ({id: r.id, name: r.name})),
    [{id: inProgram.id, name: 'Plank'}],
  );
});

test('adopted → graph-resolved rows that are not program members are dropped (legacy parity)', async () => {
  // Same exercise resolved via the graph but not part of the program: with a
  // program filter it must behave exactly like the legacy path (excluded).
  const orphan = await createExercise('Glute Bridge');
  await client.movement.create({
    data: {
      slug: 'glute-bridge',
      nameEn: 'Glute Bridge',
      provenance: {sourceKind: 'SOURCE_CONTROLLED', confidence: 1},
      versioning: {catalogVersion: 1, entryVersion: 1},
      exerciseId: orphan.id,
    },
  });

  const program = await createProgram();
  const result = await store.resolveWorkoutExercises(['Glute Bridge'], program.id);
  assert.deepEqual(result, []);
});