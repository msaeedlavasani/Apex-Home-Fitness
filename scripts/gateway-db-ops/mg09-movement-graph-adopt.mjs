#!/usr/bin/env node
/**
 * mg09-movement-graph-adopt.mjs — allowlisted gateway db-operation runner
 * for MG-09 Movement Graph adoption (governed Production migration).
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
 *     (adoption plan + verification + counts) on stdout;
 *   - apply writes ONLY the new Movement Graph tables (upsert Movement rows
 *     by slug; set `exerciseId` only for MAPPED rows and only when the link
 *     is still null) — it NEVER writes, alters, or deletes rows in the
 *     existing `Exercise` table or any other legacy table (every existing
 *     exercise reference is preserved);
 *   - AMBIGUOUS rows are surfaced with candidates and NEVER linked; UNRESOLVED
 *     rows are surfaced and NEVER mapped (the S02-E lesson: never guess);
 *   - apply prints the plan + per-row applied summary + post-apply
 *     verification (every planned Movement present; every MAPPED row carries
 *     its exact exerciseId link; no skipped row was mapped).
 *
 * stdout must be EXACTLY one JSON object — the gateway hashes it for dry-run
 * evidence and parses it for verification evidence.
 */

import { PrismaClient } from '@prisma/client';

import {
  buildAdoptionPlan,
  verifyAdoptionPlan,
  verifyAdoptionApplied,
} from './lib/mg09-adopt.mjs';

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
  const plan = buildAdoptionPlan(rows);

  if (mode === 'dry-run') {
    const verification = verifyAdoptionPlan(plan);
    console.log(JSON.stringify({
      operation: 'mg09-movement-graph-adopt',
      mode: 'dry-run',
      counts: plan.counts,
      catalog_collisions: plan.report.catalogCollisions,
      ambiguous: plan.ambiguous,
      unresolved: plan.unresolved,
      planned_movements: plan.movements.map((m) => ({
        slug: m.slug,
        nameEn: m.nameEn,
        source: m.source,
        exerciseId: m.exerciseId,
      })),
      verification,
    }));
    process.exitCode = verification.status === 'PASS' ? 0 : 1;
  } else {
    // apply — idempotent upsert of Movement rows only.
    const applied = [];
    for (const m of plan.movements) {
      const existing = await prisma.movement.findUnique({ where: { slug: m.slug } });
      if (existing) {
        // Idempotent: never clobber an existing link; only backfill when null.
        const link = m.exerciseId !== null && existing.exerciseId === null ? m.exerciseId : existing.exerciseId;
        if (link !== existing.exerciseId || existing.nameEn !== m.nameEn) {
          await prisma.movement.update({
            where: { slug: m.slug },
            data: {
              nameEn: m.nameEn,
              ...(m.aliases.length > 0 ? { aliases: m.aliases } : { aliases: null }),
              ...(link !== null ? { exerciseId: link } : {}),
            },
          });
        }
        applied.push({ slug: m.slug, nameEn: existing.nameEn, exerciseId: link ?? null, created: false });
      } else {
        const created = await prisma.movement.create({
          data: {
            slug: m.slug,
            nameEn: m.nameEn,
            ...(m.aliases.length > 0 ? { aliases: m.aliases } : {}),
            // Link only MAPPED rows (exerciseId !== null).
            ...(m.exerciseId !== null ? { exerciseId: m.exerciseId } : {}),
            provenance: {
              sourceKind: 'SOURCE_CONTROLLED',
              sourceRef: 'src/lib/exercise/catalog.ts (S-06 CANONICAL_CATALOG)',
              confidence: 1,
            },
            versioning: { catalogVersion: 1, entryVersion: 1, changeNote: 'MG-09 governed adoption' },
          },
        });
        applied.push({ slug: created.slug, nameEn: created.nameEn, exerciseId: created.exerciseId ?? null, created: true });
      }
    }

    const after = await prisma.movement.findMany({
      select: { slug: true, nameEn: true, exerciseId: true },
      orderBy: { slug: 'asc' },
    });
    const verification = verifyAdoptionApplied(plan, after);
    console.log(JSON.stringify({
      operation: 'mg09-movement-graph-adopt',
      mode: 'apply',
      counts: plan.counts,
      applied,
      applied_count: applied.length,
      created_count: applied.filter((a) => a.created).length,
      linked_count: applied.filter((a) => a.exerciseId !== null).length,
      legacy_tables_untouched: 'Exercise and all pre-existing tables were not written by this operation',
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