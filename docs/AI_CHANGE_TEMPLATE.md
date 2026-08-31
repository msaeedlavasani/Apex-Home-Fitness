# Apex Change Report Template

> **STATUS: CURRENT — AUTHORITATIVE CHANGE-REPORT TEMPLATE**
>
> برای هر تغییر غیرسطحی، این قالب canonical گزارش و handoff است. این فایل تنها مرجع contract است (A-04)؛ `docs/AI_DEVELOPMENT_SYSTEM.md` §۵ به آن ارجاع می‌دهد. پایدارترین قواعد از repository governance خوانده می‌شوند و در این قالب کپی نمی‌شوند.

```md
## Change report

> This is the canonical report/handoff contract. It combines change evidence
> with lifecycle state transfer; stable governance is referenced, not copied.

### Machine-readable handoff

```text
TASK_ID:
TASK_TYPE:
SOURCE_SHA:
CURRENT_STATE:
NEXT_STATE:
NEXT_ACTION:
NEXT_ACTION_AUTONOMOUS: YES|NO
HUMAN_DECISION_REQUIRED: YES|NO
BLOCKER:
PRODUCTION_BOUND: YES|NO
PRODUCTION_DEPLOYED: YES|NO|N/A
PRODUCTION_ACCEPTANCE: PASS|FAIL|N/A
MAIN_INTEGRATED: YES|NO|N/A
MAIN_CI: PASS|FAIL|PENDING|N/A
BRANCH_RETIRED: YES|NO|N/A
TASK_STATUS: ACTIVE|BLOCKED|CLOSED
UI_CHANGED: YES|NO
UI_CONFORMANCE: PASS|N/A
UI_CONFORMANCE_DECISION: REUSE|EXTEND|AUTHORIZED_PARALLEL|N/A
UI_CONFORMANCE_EVIDENCE: <path to existing evidence file>
REPORT_PERSISTED: YES|NO
REPORT_VALIDATED: YES|NO
REPORT_DELIVERED: YES|NO|N/A
REPORT_PATH: <repo runtime path | N/A>
OWNER_REPORT_PATH: <absolute path in the Owner report destination | N/A>
```

- Scope:
- Category: ui | domain | auth | ai | data | infra | docs
- User-visible effect:
- Files changed:
- Invariants checked:
- Tests run:
- Risks:
- Rollback:
- Docs updated:
- Follow-up:
```

### چک‌لیست سریع

- [ ] تغییرات قبلی کاربر حفظ شده‌اند
- [ ] secret یا OTP plaintext در diff، log یا response نیست
- [ ] تست مرتبط اضافه/به‌روزرسانی شده است
- [ ] مسیرهای `en` و `fa` در صورت اثرپذیری بررسی شده‌اند
- [ ] سند مرجع به‌روز شده است
- [ ] production یا سرویس همسایه بدون تأیید تغییر نمی‌کند
- [ ] `UI_CHANGED=YES` ⇒ UI Conformance Gate گذرانده شده است (کشف سیستم طراحی موجود، reuse، تصمیم REUSE/EXTEND، شواهد) — سند: `governance/UI-CONFORMANCE-GATE.md`
- [ ] گزارش نهایی/Analysis-Gate به Owner report destination صادر شده است (`/Users/msl/Documents/ApexHFAgentReports/`) و مسیر مطلق آن در پاسخ نهایی صریحاً ذکر شده است؛ `REPORT_DELIVERED=YES` فقط با export موفق به آن مقصد مجاز است — سند: `governance/REPORT-DELIVERY-CONTRACT.md`
