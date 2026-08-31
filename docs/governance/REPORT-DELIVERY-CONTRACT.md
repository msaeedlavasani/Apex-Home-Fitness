# Report Delivery Contract

> **STATUS: CURRENT — ADOPTED 2026-09-01** via
> `GOVERNANCE-HARDENING-PROMOTION-01` (`GOVERNANCE-REPORT-DELIVERY-01`).
>
> Extends the canonical report contract
> ([`docs/AI_CHANGE_TEMPLATE.md`](../AI_CHANGE_TEMPLATE.md)) and the
> runtime ([`docs/GOVERNANCE_RUNTIME.md`](../GOVERNANCE_RUNTIME.md)) from
> "persistence proven" to "Owner receipt accounted for".

## 1. Problem

Governance previously proved a report was **persisted** (file on disk) and
**validated** (runtime pass), but did not ensure the Owner actually
**receives/surfaces** the artifact in the **established Owner-facing report
destination**. A chat summary or a repo-local file was implicitly accepted as
the deliverable, which is not sufficient for Analysis Gates and terminal
handoffs.

## 2. Owner report destination (canonical, change-protected)

- **Owner-facing report destination (canonical):**
  `/Users/msl/Documents/ApexHFAgentReports/`
  — every final / Analysis-Gate / terminal **Owner report** MUST be exported
  here with its exact filename.
- **Repo-local `reports/` is NOT an Owner destination.** It is a
  gitignored, runtime-only location for **temporary persistence** where a
  task needs a file inside the working tree (e.g. runtime `REPORT_PATH`
  validation mid-task). It must never replace the Owner report destination,
  and generated runtime reports must never enter Git (enforced by
  `.gitignore: /reports/`).
- **Changing the Owner report destination requires an explicit Governance
  decision** (documented decision + contract amendment). It cannot be
  changed by a task's incidental choice.

## 3. Contract fields

Every change report (JSON + markdown) MUST declare all fields:

| Field | Values | Meaning |
|---|---|---|
| `REPORT_PERSISTED` | `YES` / `NO` | The canonical report file exists (Owner destination and/or repo runtime path). |
| `REPORT_VALIDATED` | `YES` / `NO` | The report passed `governance-runtime.mjs report <file>` (or equivalent). |
| `REPORT_DELIVERED` | `YES` / `NO` / `N/A` | The actual report file was exported to the **Owner report destination** (an accessible, existing file at `OWNER_REPORT_PATH`). `YES` REQUIRES a successful Owner-path export. |
| `REPORT_PATH` | path / `N/A` | Repo-local runtime/temporary path of the report file, when one exists inside the repo (`N/A` when none — e.g. the report was written directly to the Owner destination). |
| `OWNER_REPORT_PATH` | absolute path / `N/A` | Absolute path of the report file exported to the Owner report destination. |

**Both `REPORT_PATH` and `OWNER_REPORT_PATH` are recorded where applicable.**

## 4. Obligations

**At every Analysis Gate and terminal handoff:**

1. The canonical Owner report path MUST be surfaced explicitly in the final
   response (absolute path), not only embedded in prose.
2. The **actual report file must be exported to the Owner report
   destination** (`/Users/msl/Documents/ApexHFAgentReports/`). A chat
   summary is NOT a substitute for the exported file.
3. Report **delivery failure must be distinguishable from persistence
   failure**:
   - persistence failure → `REPORT_PERSISTED=NO` (+ runtime fail on gate);
   - delivery failure (Owner-path export unavailable/declined) →
     `REPORT_DELIVERED=NO` with `OWNER_REPORT_PATH`/`REPORT_PATH` surfaced
     and the failed channel stated — NOT a
     `GOVERNANCE_RUNTIME_REPORT_PERSISTENCE_FAILURE` (reserved for
     persistence failures only).
4. **Repo-local `reports/` is temporary-only**: delete or export its
   contents on completion; never leave generated runtime reports as the
   final resting place, and never stage them.

## 5. Machine-enforced vs review-enforced

| Control | Enforcement | Mechanism |
|---|---|---|
| All five fields present on every report | **Machine** | `governance-runtime.mjs report` |
| `REPORT_PERSISTED=YES` ⇒ at least one of `REPORT_PATH` / `OWNER_REPORT_PATH` exists on disk | **Machine** | same report validation |
| `REPORT_PERSISTED=NO` ⇒ both paths `N/A` | **Machine** | same report validation |
| `REPORT_DELIVERED=YES` ⇒ persisted AND `OWNER_REPORT_PATH` exists (exported to the Owner destination) | **Machine** | same report validation |
| Absolute Owner path explicitly surfaced at Analysis Gate / terminal handoff | **Review (agent obligation)** | final-response review |
| Owner-destination change via explicit Governance decision | **Review** | requirement above; any drift fails review |

## 6. Failure taxonomy (delete nothing, mark clearly)

- `GOVERNANCE_RUNTIME_REPORT_PERSISTENCE_FAILURE` — persistence/validation
  failure only (file could not be written or did not validate).
- `REPORT_DELIVERY_FAILURE` — file persisted, but the Owner-path export
  could not be completed (destination inaccessible, export denied); record
  `REPORT_DELIVERED=NO`, surface both paths, state the channel gap.

## 7. Root cause — why reports drifted to repo-local `reports/`

During the 2026-08-31/2026-09-01 analysis-gate session, report artifacts
were persisted under the repository-local, gitignored `reports/` directory
instead of the established Owner report directory. Contributing causes,
in order:

1. **The Owner destination was not encoded in the report contract.** The
   pre-existing runtime validated `REPORT_PATH` against the repository
   working tree (`fs.existsSync(path.resolve())`), which biased report
   authors toward keeping artifacts inside the repo. The
   `/Users/msl/Documents/ApexHFAgentReports/` convention existed in
   practice (previous task reports referenced an external "AgentReports
   directory") but was not a machine-checkable contract field.
2. **The extended contract added delivery fields but still treated the
   repo-local path as the primary artifact location.** The 2026-09-01
   `REPORT_DELIVERY-CONTRACT` defined `REPORT_PATH` first and made
   `REPORT_DELIVERED=YES` depend on a repo-accessible path, so exporting
   outside the repo was neither required nor verifiable.
3. **Gitignored repo paths were the zero-friction runtime location.** The
   analysis gate required artifacts to remain LOCAL/UNCOMMITTED, and the
   gitignored `/reports/` directory satisfied runtime validation and
   review visibility together — until the Owner explicitly designated the
   external destination.

**Correction (this adoption):** dual-path contract (`REPORT_PATH` =
repo runtime, `OWNER_REPORT_PATH` = Owner destination), delivered-implies-
exported rule, and the change-protected Owner destination above.

## 8. Delivery channels in this environment

- Owner report destination: `/Users/msl/Documents/ApexHFAgentReports/`
  (canonical export target; absolute path; outside the repo).
- Repo-local `reports/` — temporary runtime copies only (gitignored;
  exported to the Owner destination before closure).
- Preview-tab HTML rendering can additionally surface a copy for review,
  but never replaces the Owner-path export.