# Production Incident Ledger

Concise index of verified historical Production incidents. Detailed evidence remains in the external AgentReports directory; this ledger records only durable outcomes and canonical lessons.

| Incident | Verified outcome | Durable lesson | Canonical references | Confidence |
|---|---|---|---|---|
| S02 site URL / RSC failure | PASS after safe site-URL resolver and clean immutable build | Build-time public configuration can differ from runtime env; HTTP 200 is not browser acceptance | `PITFALLS/NEXTJS-BUILDTIME-PUBLIC-URL-RSC-FAILURE.md`, `PITFALLS/CLEAN-IMMUTABLE-BUILDS.md`, `PITFALLS/HTTP-200-IS-NOT-BROWSER-ACCEPTANCE.md` | CONFIRMED |
| AUTH-FIX-01 database write failure | PASS after preserving the DB volume and correcting volume ownership; startup preflight added | Application container identity and SQLite volume writability must be verified before release | `RELEASE_POLICY.md` Rule 11, `FEATURE_TO_PRODUCTION.md` §J/§M, `PRODUCTION_CHECKPOINTS.md` AUTH-FIX-01 | CONFIRMED |
| POST-RESET-UI-01 Login/configuration incident | PASS after corrected immutable build and owner-verified real Production login | Runtime `process.env` may look correct while compiled `NEXT_PUBLIC_*` values are missing; verify build-time args and the real auth journey | `PITFALLS/NEXTJS-BUILDTIME-PUBLIC-CONFIG-DRIFT.md`, `PITFALLS/PRODUCTION-OPERATIONS-SAFETY.md` | CONFIRMED for later session-exchange failure; earlier `invalid_code` distinction preserved |

## Interpretation rules

Historical reports are evidence, not current policy. `PARTIAL` or `INSUFFICIENT_EVIDENCE` findings are not promoted to definitive root causes. Related mechanisms are consolidated into reusable Pitfalls rather than duplicated per report. Infrastructure identifiers and secrets are excluded unless already required by canonical operational documentation; secret values, test credentials, and private keys never belong here.

## Report references

- `AHF-FB-20260830-POST-RESET-UI-01-QUIZ-RTL.md`
- `AHF-FB-20260830-DOCUMENTATION-PITFALL-SYNC.md`
- `AHF-FB-20260830-DOCUMENTATION-BRANCH-INTEGRATION.md`

## Scope note

This ledger is a backfill of the accessible historical reports and does not claim that unlisted incidents never occurred. A broader report/archive inventory should be repeated if additional AgentReports become available.
