/**
 * MG-04 — governed ingestion pipeline DRY-RUN runner (evidence only).
 *
 * Usage:
 *   node --import tsx scripts/mg04-ingest-dry-run.ts
 *     [--source <url|path>]   default: the pinned free-exercise-db snapshot URL
 *     [--limit <n>]           process only the first n source records
 *     [--out <path>]          write the JSON evidence report to <path>
 *
 * ALWAYS DRY-RUN: this script NEVER writes to any database, never touches
 * Production, and never adds media. Output is a JSON ingestion report
 * (ambiguities surfaced fail-closed, taxonomy unknowns reported, media
 * stage deferred to MG-07). License of the fetched source must be re-verified
 * at ingest time (MG-03 rule: never import on an unknown license).
 */

import { readFileSync, writeFileSync } from 'node:fs';

import {
  FREE_EXERCISE_DB_SNAPSHOT,
  loadSnapshotDocument,
  parseFreeExerciseDbDocument,
  runIngestion,
  type SourceDocument,
} from '../src/lib/movement/ingest';

function argValue(args: string[], flag: string): string | undefined {
  const withEquals = args.find((a) => a.startsWith(`--${flag}=`));
  if (withEquals !== undefined) return withEquals.slice(`--${flag}=`.length);
  const index = args.indexOf(`--${flag}`);
  if (index !== -1 && args[index + 1] !== undefined && !args[index + 1].startsWith('--')) {
    return args[index + 1];
  }
  return undefined;
}

async function loadDocument(source: string | undefined): Promise<SourceDocument> {
  if (!source) {
    // Pinned snapshot (network) — the default evidence run.
    return loadSnapshotDocument();
  }
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return loadSnapshotDocument(fetch, source);
  }
  const jsonText = readFileSync(source, 'utf8');
  // Accept both the raw array (pinned snapshot shape) and the fixture
  // wrapper shape `{ _fixture: {...}, exercises: [...] }`.
  const raw: unknown = JSON.parse(jsonText);
  const exercisesArray =
    Array.isArray(raw) ? raw : Array.isArray((raw as { exercises?: unknown })?.exercises) ? (raw as { exercises: unknown[] }).exercises : null;
  if (!exercisesArray) throw new Error('parse failed: expected an array of exercise records (or { exercises: [...] })');
  const { document, errors } = parseFreeExerciseDbDocument(JSON.stringify(exercisesArray));
  if (!document) throw new Error(`parse failed: ${errors.join('; ')}`);
  return document;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const limitRaw = argValue(args, 'limit');
  const out = argValue(args, 'out');
  const source = argValue(args, 'source');

  let document = await loadDocument(source);
  if (limitRaw) {
    const limit = Number(limitRaw);
    if (!Number.isInteger(limit) || limit <= 0) throw new Error(`invalid --limit: ${limitRaw}`);
    document = { ...document, exercises: document.exercises.slice(0, limit) };
  }

  const report = runIngestion(document);
  if (out) writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`SOURCE: ${report.source.name}@${report.source.pinnedCommit} (license ${report.source.license})`);
  console.log(`ENTRIES: ${report.entriesInput} (snapshot has ${report.source.entryCountAtSnapshot})`);
  console.log(`RESOLVED: ${report.counts.resolved} · AMBIGUOUS: ${report.counts.ambiguous} · UNRESOLVED: ${report.counts.unresolved}`);
  if (report.issues.ambiguous.length > 0) {
    console.log('AMBIGUOUS (fail-closed — never guessed):');
    for (const a of report.issues.ambiguous) {
      console.log(`  - "${a.upstreamName}" → candidates: ${a.candidates.join(', ')}`);
    }
  }
  if (report.issues.unknownTaxonomyTerms.length > 0) {
    console.log(`UNMAPPED TAXONOMY TERMS (surfaced, not guessed): ${report.issues.unknownTaxonomyTerms.length}`);
  }
  console.log(`IMAGES SKIPPED (data-only posture, media → MG-07): ${report.counts.imagesSkipped}`);
  console.log(`DEFERRED STAGES: relationships=${report.deferredStages.relationshipEnrichment} localization=${report.deferredStages.localizationModel} media=${report.deferredStages.mediaManagement}`);
  console.log(out ? `REPORT WRITTEN: ${out}` : 'NO REPORT WRITTEN (add --out <path>)');
}

main().catch((error: unknown) => {
  console.error(`MG-04 dry-run FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});