# UI Conformance Gate — Project-wide Governance Contract

> **STATUS: CURRENT — ADOPTED 2026-09-01** via
> `GOVERNANCE-HARDENING-PROMOTION-01` (task `GOVERNANCE-UI-GATE-01`,
> CLOSED / CODE_NO_DEPLOY).
>
> Authority: complements `AGENTS.md` §6, `docs/DESIGN_SYSTEM.md`, and
> `docs/AI_CHANGE_TEMPLATE.md`. It does NOT override them; it makes the UI
> obligations explicit and machine-checkable where practical.

## 1. Trigger

Every task whose report declares **`UI_CHANGED = YES`** (any change to
`src/app/**`, `src/components/**`, `globals.css`, tailwind config, fonts,
or UI-adjacent assets) MUST pass this gate **before acceptance**.
**Functional correctness alone is NOT sufficient acceptance for UI-changing
work.**

## 2. Mandatory steps (evidence/review-based)

1. **Discover before implement** — read `docs/DESIGN_SYSTEM.md`, scan
   `src/components/ui/platform` (and `src/components/**`) for existing
   providers, tokens, typography, primitives, and shared components before
   writing any UI. Record what was found.
2. **Reuse first** — apply `reuse → extend → compose → create`
   (`AGENTS.md` §3); reuse existing providers, tokens, typography,
   primitives, and shared components wherever applicable. KIT-FIRST is the
   standing rule: the Apex platform kit
   (`src/components/ui/platform`) and shared primitives are the default
   building blocks.
3. **Preserve architecture** — keep the theme/dark-mode architecture
   (`.dark` class + `ThemeScript`/`ThemeProvider`), the
   localization/RTL architecture (next-intl, `dir`, Vazirmatn), and the
   platform resolution architecture (`data-platform`) intact.
4. **Follow conventions** — responsive (360px min contract),
   accessibility (focus rings, aria, contrast), reduced motion, and
   loading/empty/error state conventions as defined in
   `docs/DESIGN_SYSTEM.md` §8.
5. **Justify new patterns** — any new visual primitive, pattern, hard-coded
   color, or component-layer class must be justified in the task evidence.
6. **Explicit REUSE vs EXTEND decision** — when the existing system is
   insufficient, declare the decision explicitly:
   - `REUSE` — existing system covered it; state what was reused;
   - `EXTEND` — existing system needed a bounded extension; state the
     extension and why REUSE was insufficient;
   - `AUTHORIZED_PARALLEL` — only via explicit owner authorization;
     creating a parallel/competing visual system without it **fails
     closed**.
7. **Record evidence** — the report must carry
   `UI_CONFORMANCE_EVIDENCE` pointing to an existing on-disk evidence file
   (the task change report or a dedicated conformance record naming the
   discovered/reused/extended pieces).

## 3. Machine-enforced vs review-enforced

| Control | Enforcement | Mechanism |
|---|---|---|
| `UI_CHANGED` declared on every report | **Machine** | `governance-runtime.mjs report` requires the field |
| `UI_CHANGED=YES` ⇒ `UI_CONFORMANCE=PASS` + REUSE/EXTEND/AUTHORIZED_PARALLEL decision + existing evidence file | **Machine** | same report validation |
| `UI_CHANGED=NO` ⇒ `UI_CONFORMANCE=N/A`, decision `N/A` | **Machine** | same report validation |
| KIT-FIRST — no `@mui/material` imports outside the registered allowlist (`MuiProvider`, `muiTheme`) | **Machine** | `governance-runtime.mjs ui` source scan (allowlist change is an authorized, review-visible diff) |
| No unregistered parallel UI kit dirs under `src/components/ui` | **Machine** | `governance-runtime.mjs ui` directory scan (fails closed) |
| Governance contract docs exist + are INDEX-routed | **Machine** | `governance-runtime.mjs ui` + `docs` |
| Actual successful reuse / dark-mode & RTL preservation / a11y & responsive conformance / justification quality | **Review (evidence)** | Owner/CI review of the recorded evidence; browser specs where available |
| Discovery happened before implementation | **Review (evidence)** | recorded in the evidence file |

## 4. Fail-closed rules

- A report declaring `UI_CHANGED=YES` without PASS + decision +
  evidence **fails governance validation** (no lifecycle continuation).
- An MUI import or new UI kit directory outside the allowlists **fails
  `governance:check`** (the `ui` scan) until authorized and allowlisted in
  review.
- No runtime bypass exists; the only escape hatch is an explicit,
  review-visible allowlist/contract change approved by the Owner.

## 5. Relationship to existing policy

- Does not replace `DESIGN_SYSTEM.md` (visual source of truth) or
  `AGENTS.md` §6 (UI rules) — it operationalizes them.
- `FEATURE_TO_PRODUCTION.md` §P (feature acceptance contracts) gains an
  explicit UI-gate prerequisite for UI-changing tasks.
- Machine enforcement lives in `scripts/governance-runtime.mjs` (report
  contract + `ui` scan) and is executed by `npm run governance:check` /
  `governance:test`.