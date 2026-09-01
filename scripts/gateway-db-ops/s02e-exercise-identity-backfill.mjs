#!/usr/bin/env node
/**
 * s02e-exercise-identity-backfill.mjs — allowlisted gateway db-operation runner
 * for S02-E Exercise Identity Backfill (GATE A GA-07).
 *
 * Executed ONLY by the Production Deployment Gateway inside the built
 * `build`-stage image (which ships the repo, node_modules, tsx, and the
 * generated Prisma client), with the Production SQLite volume mounted:
 *
 *   dry-run:  -v <volume>:/data:ro   DB_OPERATION_MODE=dry-run
 *             DATABASE_URL=file:/data/app.db          → READ-ONLY report
 *   apply:    -v <volume>:/data      DB_OPERATION_MODE=apply
 *             DATABASE_URL=file:/data/app.db          → idempotent apply
 *
 * Contract (must hold; the gateway enforces the surrounding gates — dry-run
 * evidence before apply, mandatory pre-mutation backup, exclusive lock):
 *   - dry-run performs SELECTs only and prints a canonical JSON report
 *     (classes/counts/apply decisions/collisions) on stdout;
 *   - apply writes ONLY `Exercise.slug` for APPLY rows (`updateMany` with
 *     `slug: null` — idempotent, never overwrites, never touches `name` or
 *     any other column, never maps BLOCKED_COLLISION/AMBIGUOUS/UNRESOLVED);
 *   - `faName` stays untouched: GATE A found no Persian corpus, so nothing is
 *     invented (GA-05);
 *   - apply prints the plan + per-row applied count + post-apply verification
 *     (re-classification; every APPLY row now carries its exact slug; no
 *     skipped row was mapped).
 *
 * stdout must be EXACTLY one JSON object — the gateway hashes it for dry-run
 * evidence and parses it for verification evidence.
 */

import { PrismaClient } from '@prisma/client';

import { buildReport, verifyPlan, verifyApplied } from './lib/classify.mjs';

const mode = process.env.DB_OPERATION_MODE;
if (!['dry-run', 'apply'].includes(mode)) {
  console.error('DB_OPERATION_MODE must be dry-run or apply');
  process.exit(2);
}

const prisma = new PrismaClient();

async function selectRows() {
  return prisma.exercise.findMany({
    select: { id: true, name: true, slug: true, faName: true },
    orderBy: { name: 'asc' },
  });
}

try {
  const rows = await selectRows();
  const report = buildReport(rows);

  if (mode === 'dry-run') {
    const verification = verifyPlan(report);
    // Drop internal claimOrder (not part of the report contract).
    const { claimOrder, ...dry } = report;
    console.log(JSON.stringify({ operation: 's02e-exercise-identity-backfill', mode: 'dry-run', ...dry, verification }));
    process.exitCode = 0;
  } else {
    // apply
    const applied = [];
    for (const d of report.apply) {
      if (d.decision !== 'APPLY') continue;
      const row = rows.find((r) => r.name === d.name);
      // Idempotent: only touches rows whose slug is still null.
      await prisma.exercise.updateMany({
        where: { id: row.id, slug: null },
        data: { slug: d.slug },
      });
      applied.push({ id: row.id, name: row.name, slug: d.slug });
    }
    const after = await selectRows();
    const verification = verifyApplied(rows, after, report);
    const { claimOrder, ...plan } = report;
    console.log(JSON.stringify({
      operation: 's02e-exercise-identity-backfill',
      mode: 'apply',
      plan,
      applied,
      applied_count: applied.length,
      faName_untouched_reason: 'GATE A found no Persian corpus; no names invented (GA-05)',
      verification,
    }));
    process.exitCode = verification.status === 'PASS' ? 0 : 1;
  }
} catch (error) {
  console.error(String(error?.message ?? error));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
