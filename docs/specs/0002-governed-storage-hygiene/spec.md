# Governed Server Storage Hygiene

```yaml
SPEC_READINESS: READY
BLOCKING_OWNER_DECISIONS: NONE
```

`IMPLEMENTATION_AUTHORIZATION: OWNER_AUTHORIZED`

## Purpose

Extend the existing root-owned AHF Deployment Gateway so server-storage
hygiene is a governed release checkpoint, not an ad-hoc Docker cleanup.

## Contract

- Production and Beta current/rollback identities come from canonical gateway
  proof, running-container identity, Compose rollback evidence, and explicit
  release authority; age, `latest`, and tag recency are never authority.
- Every AHF image, migration/dbop image, failed candidate, stopped AHF
  container, dangling artifact, and builder cache entry is assigned exactly one
  operational class: `RETAIN_CURRENT`, `RETAIN_ROLLBACK`,
  `RETAIN_ACTIVE_TRANSACTION`, `SAFE_TO_DELETE`, or
  `AMBIGUOUS_DO_NOT_DELETE`.
- Cleanup deletes only gateway-classified safe container/image IDs. Volumes,
  unrelated services, ambiguous artifacts, and direct Docker storage files are
  outside scope.
- Application release status and storage hygiene status are persisted and
  reported separately.
- Build, migration-image creation, and deployment fail closed unless measured
  headroom covers current/rollback retention, candidate peaks, database backup
  reserve, temporary Docker overhead, bounded cache growth, and emergency
  headroom.
- Evidence is sanitized and records filesystem state before/after, cache
  state, release identities, artifact classes, removals, and final budget.

## Non-goals

No Production deployment or Production database mutation, no PR #72 merge, no
volume deletion, no `docker system prune -a`, and no parallel deployment
authority. Beta schema-changing deployment remains a separately gated
extension of the existing Beta gateway.

## Acceptance

The gateway self-test and focused tests prove request validation, exact
classification vocabulary, namespace recognition, and fail-closed behavior.
Host execution is accepted only when current/rollback authority and the
host-calibrated storage policy are present; otherwise the hygiene checkpoint
reports `BLOCKED` without deleting anything.
