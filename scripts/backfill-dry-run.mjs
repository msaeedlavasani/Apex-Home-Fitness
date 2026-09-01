#!/usr/bin/env node
/**
 * backfill-dry-run.mjs — S02-E Exercise Identity Backfill: READ-ONLY dry-run
 * CLI (GATE A GA-07) for LOCAL databases only.
 *
 * The Production-side dry-run/apply is executed ONLY by the Production
 * Deployment Gateway via `scripts/gateway-db-ops/s02e-exercise-identity-
 * backfill.mjs` (dry-run evidence is gated before any apply). This CLI is the
 * local, out-of-band counterpart: classify every `Exercise` row of a local
 * SQLite file and verify the GA-07 invariants. It NEVER writes.
 *
 * SAFETY / BOUNDARY
 *   - The DB path must be passed explicitly (`--db <path>`); there is NO
 *     default, so it can never silently point at a Production database.
 *   - Only `findMany` (SELECT) calls are issued.
 *   - The apply phase of S02-E is NOT implemented here. The apply must go
 *     through the governed gateway db-operation capability
 *     (`docs/PRODUCTION_DEPLOYMENT_GATEWAY.md` §db-operation) with dry-run
 *     evidence, a mandatory pre-mutation backup, and post-mutation
 *     verification.
 *
 * USAGE
 *   node --import tsx scripts/backfill-dry-run.mjs --db ./dev.db [--verify]
 *
 *   --db <path>   local SQLite file (required; relative paths resolve the way
 *                 the repo resolves DATABASE_URL — against the schema
 *                 directory `prisma/`).
 *   --verify      also run the verification pass (deterministic decisions,
 *                 fail-closed invariants).
 */

import { PrismaClient } from '@prisma/client';

import { buildReport, verifyPlan } from './gateway-db-ops/lib/classify.mjs';

function usage() {
  console.error('usage: node --import tsx scripts/backfill-dry-run.mjs --db <local.sqlite> [--verify]');
  process.exit(2);
}

const args = process.argv.slice(2);
const dbIdx = args.indexOf('--db');
if (dbIdx === -1 || !args[dbIdx + 1]) usage();
const dbPath = args[dbIdx + 1];
const verify = args.includes('--verify');

process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient();
try {
  const rows = await prisma.exercise.findMany({
    select: { id: true, name: true, slug: true, faName: true },
    orderBy: { name: 'asc' },
  });
  const report = buildReport(rows);
  delete report.claimOrder;
  if (verify) report.verification = verifyPlan(report);
  console.log(JSON.stringify(report, null, 2));
  if (verify && report.verification.status !== 'PASS') process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
