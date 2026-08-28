# Task-by-Task Production Checkpoint Policy

Every independently deployable task must pass, in order:

1. Source validation
2. Focused tests
3. Production build
4. Local runtime smoke
5. Production readiness
6. Production deployment
7. Production post-deploy smoke

A task is authoritative only after Production deployment and post-deploy smoke pass. A dependent task must not begin before that checkpoint.

If deployment or post-deploy smoke fails, stop the next task and either fix only the attributable task or roll back to the previous verified checkpoint. Before any mutation, capture the current image, source/build marker, configuration, environment shape, mounts, database identity, verified database backup, and executable rollback procedure.

Intentionally incomplete work that cannot operate independently must be explicitly classified as `NON_DEPLOYABLE` and grouped only with the minimum inseparable work required for an atomic release.

Record every successful Production checkpoint with the source SHA, immutable image ID, deployment time, database identity/hash, and mount topology. Never deploy or migrate a database without explicit approval and a verified rollback plan. For a newly authorized empty Production database, apply the checked-in migrations explicitly before serving traffic; never copy a diagnostic fixture into Production.
