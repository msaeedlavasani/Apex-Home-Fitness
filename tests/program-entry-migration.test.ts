/**
 * WORKOUT-V2-PERSISTED-ENTRY-IDENTITY-CORRECTION migration proof.
 *
 * Builds a scratch database with the current schema, replaces only the
 * ProgramExercise table with its legacy composite-key shape, applies the
 * governed migration SQL, and verifies deterministic legacy identity plus
 * repeated canonical references with independent prescription data.
 */
import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PrismaClient} from '@prisma/client';

const tmpDir = mkdtempSync(join(tmpdir(), 'program-entry-migration-test-'));
const dbUrl = `file:${join(tmpDir, 'program-entry-migration.db')}`;
process.env.DATABASE_URL = dbUrl;

let client: PrismaClient;

before(async () => {
  const prismaCli = join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate'], {
    env: {...process.env, DATABASE_URL: dbUrl},
    stdio: 'pipe',
    timeout: 60_000,
  });
  client = new PrismaClient();
});

after(async () => {
  await client?.$disconnect();
  rmSync(tmpDir, {recursive: true, force: true});
});

test('legacy ProgramExercise rows migrate to independent Entry identity', async () => {
  const program = await client.program.create({
    data: {
      name: `Migration Program ${Date.now()}`,
      description: 'Migration fixture',
      level: 'BEGINNER',
      durationWeeks: 1,
      sessionsPerWeek: 1,
    },
  });
  const exercise = await client.exercise.create({
    data: {
      name: `Migration Exercise ${Date.now()}`,
      description: 'Migration fixture',
      category: 'CALISTHENICS',
      equipment: [],
      difficulty: 'BEGINNER',
      instructions: [],
    },
  });

  await client.$executeRawUnsafe('PRAGMA foreign_keys=OFF');
  await client.$executeRawUnsafe('DROP TABLE "ProgramExercise"');
  await client.$executeRawUnsafe(`
    CREATE TABLE "ProgramExercise" (
      "programId" TEXT NOT NULL,
      "exerciseId" TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      "sets" INTEGER,
      "reps" INTEGER,
      "restSeconds" INTEGER,
      PRIMARY KEY ("programId", "exerciseId"),
      FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.$executeRawUnsafe(
    'INSERT INTO "ProgramExercise" ("programId","exerciseId","order","sets","reps","restSeconds") VALUES (?,?,?,?,?,?)',
    program.id,
    exercise.id,
    1,
    2,
    8,
    30,
  );

  const migrationPath = join(
    process.cwd(),
    'prisma/migrations/20260921100000_allow_repeated_prescribed_entries/migration.sql',
  );
  const statements = readFileSync(migrationPath, 'utf8')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) await client.$executeRawUnsafe(statement);

  const migrated = await client.programExercise.findMany({
    where: {programId: program.id},
    orderBy: {order: 'asc'},
  });
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0]!.id, `legacy:${program.id}:${exercise.id}`);

  await client.programExercise.create({
    data: {
      programId: program.id,
      exerciseId: exercise.id,
      order: 2,
      sets: 4,
      reps: 12,
      restSeconds: 45,
    },
  });
  const entries = await client.programExercise.findMany({
    where: {programId: program.id},
    orderBy: {order: 'asc'},
  });
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map((entry) => entry.exerciseId), [exercise.id, exercise.id]);
  assert.deepEqual(entries.map((entry) => entry.sets), [2, 4]);
  assert.deepEqual(entries.map((entry) => entry.reps), [8, 12]);
  assert.notEqual(entries[0]!.id, entries[1]!.id);
});
