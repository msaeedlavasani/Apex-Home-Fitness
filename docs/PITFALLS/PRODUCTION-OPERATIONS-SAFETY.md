# Pitfall: Keep Temporary Release Operations Separate From Protected Production State

- **STATUS:** CLOSED / documented lesson
- **RELATED INCIDENT:** POST-RESET-UI-01

## Lessons

- Use `/tmp` or another explicitly writable temporary location for image archives; do not broaden protected deployment-directory permissions for SCP.
- Keep `/opt/apex-home-fit/.env` protected/root-owned. Use narrowly scoped owner-approved privileged operations when Compose must read it; never print, copy, or weaken its permissions.
- Distinguish Docker socket permission, filesystem permission, and local tool-policy rejection of remote `sudo`; each requires a different diagnosis.
- Before path-sensitive or privileged commands, verify the execution context and hostname. Commands intended for the VPS can accidentally run on the local Mac.
- Docker-group membership is effectively privileged/root-equivalent access; grant it only to the actual deployment operator.
- Preserve rollback configuration and the previous immutable image before mutation; never remove rollback evidence during temporary artifact cleanup.
- Record mandatory incident reports on every termination path, including hard blockers and recoverable command failures.

## Acceptance and tooling

HTTP 200 and a stable container are not feature acceptance. Correlate browser/network behavior with server logs and validate the real user journey. A missing Playwright browser executable is a test-harness blocker, not evidence of a Production application failure.
