# نقشه‌ی مستندات

> **STATUS: CURRENT — AUTHORITATIVE DOCUMENTATION MAP**
>
> مرجع واحد «هر موضوع یک سند مرجع دارد». این فایل نقشه‌ی منبع حقیقت (Source of
> Truth) مستندات است؛ مدیریت محتوایی مستندات در
> [`governance/DOCUMENTATION-GOVERNANCE.md`](governance/DOCUMENTATION-GOVERNANCE.md)
> و ترتیب مطالعه‌ی agent همان‌جا تعریف شده است.

## ۱. نقشه‌ی موضوع‌ها → سند مرجع

| موضوع | سند مرجع | کاربرد / وضعیت |
|---|---|---|
| قوانین agent (رفتار و مرزها) | [`../AGENTS.md`](../AGENTS.md) | AUTHORITATIVE — اولویت منابع در §۱ همان فایل |
| سیاست انتشار (authoritative) | [`RELEASE_POLICY.md`](RELEASE_POLICY.md) | قوانین Task → Production، اولویت مستندات، قوانین ۱–۱۵ |
| چرخه Feature → Production | [`FEATURE_TO_PRODUCTION.md`](FEATURE_TO_PRODUCTION.md) | runbook اجرایی دقیق از تعریف تسک تا checkpoint تولید و CLOSED شدن |
| سیاست برنچ | [`BRANCHING_POLICY.md`](BRANCHING_POLICY.md) | چرخه‌ی عمر برنچ، closure، hotfix، مدل وضعیت تسک |
| وضعیت فعلی (manifest) | [`CURRENT_STATE.md`](CURRENT_STATE.md) | چک‌پوینت فعلی، برنچ فعال، تسک مجاز بعدی — قبل از شروع بخوان |
| قرارداد env | [`ENVIRONMENT_CONTRACT.md`](ENVIRONMENT_CONTRACT.md) | طبقه‌بندی BUILD/RUNTIME، PUBLIC/SECRET — بدون مقدار secret |
| چک‌پوینت‌های تولید | [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md) | ledger چک‌پوینت‌های تأییدشده‌ی Production |
| ledger حوادث Production | [`PRODUCTION_INCIDENT_LEDGER.md`](PRODUCTION_INCIDENT_LEDGER.md) | فهرست تاریخی حادثه → outcome → Pitfall؛ بدون تکرار گزارش کامل |
| درس‌های تکرارپذیر (Pitfalls) | [`PITFALLS/`](PITFALLS/) | درس‌های حوادث واقعی (build-time config، HTTP 200 و…) |
| سیستم توسعه‌ی خودکار (فرایند) | [`AI_DEVELOPMENT_SYSTEM.md`](AI_DEVELOPMENT_SYSTEM.md) | فرایند/workflow توسعه — مکمل AGENTS.md، نه جایگزین آن |
| قالب گزارش تغییر | [`AI_CHANGE_TEMPLATE.md`](AI_CHANGE_TEMPLATE.md) | AUTHORITATIVE قالب change report |
| محصول: ویژن سطح‌بالا | [`product/PRODUCT-VISION.md`](product/PRODUCT-VISION.md) | AUTHORITATIVE — CURRENT (تمایز CURRENT / DIRECTION / PLANNED) |
| محصول: تجربه تمرین V2 (ویژن) | [`product/WORKOUT-EXPERIENCE-V2.md`](product/WORKOUT-EXPERIENCE-V2.md) | وضعیت: PRODUCT / UX VISION — NOT YET IMPLEMENTED |
| محصول: سوالات باز تجربه تمرین V2 | [`product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md`](product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md) | سوالات باز محصول/معماری برای صاحب محصول |
| معماری (اصول کلی) | [`architecture/ARCHITECTURE-PRINCIPLES.md`](architecture/ARCHITECTURE-PRINCIPLES.md) | AUTHORITATIVE — CURRENT (extension `AGENTS.md`؛ پیشنهاد قبلی: [`ARCHITECTURE-PRINCIPLES-PROPOSAL.md`](architecture/ARCHITECTURE-PRINCIPLES-PROPOSAL.md) SUPERSEDED) |
| معماری (برنامه تثبیت) | [`architecture/ARCHITECTURE-STABILIZATION-PLAN.md`](architecture/ARCHITECTURE-STABILIZATION-PLAN.md) | S03 COMPLETE — SESSION CORE EXTRACTION CLOSED (S-01 و S02-A..D2 و S03-A..F کامل؛ S02-E و S-04..S-06 برنامه‌ریزی‌شده؛ گیت‌های A/B/C) |
| معماری (GATE A — هویت متعارف تمرین) | [`architecture/S02-EXERCISE-IDENTITY-GATE-A.md`](architecture/S02-EXERCISE-IDENTITY-GATE-A.md) | APPROVED (GA-01..GA-08, 2026-08-27) |
| معماری (S02-D1 — قرارداد انتشار هویت تمرین) | [`architecture/S02D1-EXERCISE-IDENTITY-PROPAGATION.md`](architecture/S02D1-EXERCISE-IDENTITY-PROPAGATION.md) | IMPLEMENTED CONTRACT FOUNDATION (S02-D1؛ adoption در S02-D2 شد) |
| معماری (S02-D2 — پذیرش هویت در پلن workout) | [`architecture/S02D2-CLIENT-IDENTITY-ADOPTION.md`](architecture/S02D2-CLIENT-IDENTITY-ADOPTION.md) | IMPLEMENTED — LOG/SNAPSHOT ADOPTION DEFERRED (S02-D2) |
| معماری (S-03 — GATE B هسته‌ی خالص Session) | [`architecture/S03-SESSION-CORE-GATE-B.md`](architecture/S03-SESSION-CORE-GATE-B.md) | APPROVED 2026-08-27 (GB-01..GB-10) |
| معماری (S03-A — پایه‌ی parity Session) | [`architecture/S03A-SESSION-PARITY-BASELINE.md`](architecture/S03A-SESSION-PARITY-BASELINE.md) | IMPLEMENTED TEST BASELINE — S03 COMPLETE |
| معماری (S03 — closure) | [`architecture/S03-SESSION-CORE-CLOSURE.md`](architecture/S03-SESSION-CORE-CLOSURE.md) | S03 COMPLETE — SESSION CORE EXTRACTION CLOSED; next: owner review → Production Release Preflight / Decision |
| معماری (S02-A — vocab تحلیل تمرین) | [`architecture/S02A-SOURCE-VOCABULARY.md`](architecture/S02A-SOURCE-VOCABULARY.md) | DEVELOPMENT-TIME ANALYSIS (S02-A) |
| Exercise domain (foundation) | [`../src/lib/exercise/index.ts`](../src/lib/exercise/index.ts) | PURE domain: contracts + catalog + resolver (S02-A) |
| معماری (ممیزی مدولاریتی) | [`architecture/MODULARITY-AUDIT.md`](architecture/MODULARITY-AUDIT.md) | AUDIT RECORD — NOT AN ARCHITECTURE DECISION |
| معماری (رجیستر ریسک کوپلینگ) | [`architecture/COUPLING-RISK-REGISTER.md`](architecture/COUPLING-RISK-REGISTER.md) | AUDIT RECORD — NOT AN IMPLEMENTATION BACKLOG |
| معماری (فهرست قابلیت‌ها) | [`architecture/CAPABILITY-INVENTORY-PROPOSAL.md`](architecture/CAPABILITY-INVENTORY-PROPOSAL.md) | PROPOSED — NOT AUTHORITATIVE (ورودی Registry آینده) |
| تصمیم‌های معماری (ADR) | [`adr/README.md`](adr/README.md) | مکانیزم فعال؛ رکوردهای پذیرفته‌شده: [`0001`](adr/0001-canonical-exercise-identity.md) · [`0002`](adr/0002-pure-workout-session-core.md) · [`0003`](adr/0003-quiz-onboarding-migration.md) (2026-08-27) |
| قرارداد APIهای AI و analytics | [`AI_API.md`](AI_API.md) | request/response، خطاها و محدودیت‌ها |
| asset و cache | [`ASSETS.md`](ASSETS.md) | PWA، service worker، font و media policy |
| UI و accessibility | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | tokenها، RTL، touch target و motion — Frontend source of truth |
| UI Kit چندپلتفرمی | [`../src/components/ui/platform/README.md`](../src/components/ui/platform/README.md) | کامپوننت‌های iOS/Android/Web |
| مدل داده | [`../prisma/schema.prisma`](../prisma/schema.prisma) (in-code) | AUTHORITATIVE داده‌ها؛ سند معماری داده‌ی جدا هنوز گپ است |
| آفلاین / همگام‌سازی | پیاده‌سازی: `src/lib/offline/`، `src/services/syncService.ts`، `supabase/migrations/0001_workout_exercise_logs.sql` | **NO CANONICAL ARCHITECTURE DOC YET** — ارجاع پیاده‌سازی؛ سند عمیق به Modularity Audit موکول شد |
| قرارداد محیط (env) | [`../.env.example`](../.env.example) | AUTHORITATIVE؛ توسط `tests/otp-launch-readiness.test.ts` بررسی می‌شود |
| CI و E2E | [`CI.md`](CI.md) | pipeline، retry و انتخاب تست هدفمند |
| انتشار، bootstrap و rollback | [`RELEASING.md`](RELEASING.md) | AUTHORITATIVE — Docker، npm mirror، Production rebuild, reverse proxy، PWA/TWA و release (روند release فعلی: `RELEASE_POLICY.md` + `FEATURE_TO_PRODUCTION.md`) |
| احراز هویت و launch | [`OTP_LAUNCH_READINESS.md`](OTP_LAUNCH_READINESS.md) | env، امنیت OTP، Go/No-Go و smoke test |
| وضعیت عملیاتی (Handoff) | [`HANDOFF.md`](HANDOFF.md) | snapshot وضعیت فعلی، Production context و قراردادهای حساس |
| وضعیت پروژه و backlog | [`TASKS.md`](TASKS.md) | batchها، اولویت‌ها و بدهی فنی |
| نقشه‌ی راه قابلیت‌ها | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) | ریسرچ رقبا، گپ‌ها و فهرست قابلیت‌های آینده (PROPOSED) |
| نقشه‌ی راه اجرا (آرشیو) | [`EXECUTION_ROADMAP.md`](EXECUTION_ROADMAP.md) | ARCHIVED — جانشین: `TASKS.md` و `TRANSFORMATION_ROADMAP.md` |
| مدیریت مستندات (Governance) | [`governance/DOCUMENTATION-GOVERNANCE.md`](governance/DOCUMENTATION-GOVERNANCE.md) | AUTHORITATIVE قواعد مستندات + ترتیب مطالعه + سلسله‌مراتب authority |
| شواهد ممیزی مستندات | [`governance/REPOSITORY-DOCUMENTATION-AUDIT.md`](governance/REPOSITORY-DOCUMENTATION-AUDIT.md) | HISTORICAL — رکورد ممیزی 2026-08-27 |
| ماتریس تعارض‌ها | [`governance/DOCUMENTATION-CONFLICT-MATRIX.md`](governance/DOCUMENTATION-CONFLICT-MATRIX.md) | رجیستر تعارض‌ها (حل‌شده/باز) |
| آرشیو پیشنهادهای governance | [`governance/DOCUMENTATION-GOVERNANCE-PROPOSAL.md`](governance/DOCUMENTATION-GOVERNANCE-PROPOSAL.md) · [`governance/DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md`](governance/DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md) | SUPERSEDED — رکورد پیشنهادهای قبلی |

## ۲. ترتیب مطالعه‌ی agent (خلاصه)

ترتیب کامل و الزامی در
[`governance/DOCUMENTATION-GOVERNANCE.md`](governance/DOCUMENTATION-GOVERNANCE.md) §۵
است (README → AGENTS.md → INDEX → سند دامنه → ADR → CI → HANDOFF → TASKS →
ویژن محصول → تاریخچه). این فایل فقط نقشه است؛ فهرست کامل عمداً این‌جا تکرار
نمی‌شود.

## ۳. قانون به‌روزرسانی

- **قبل از شروع هر تسک وابسته، حتماً `RELEASE_POLICY.md` و `PRODUCTION_CHECKPOINTS.md` (چک‌پوینت فعلی تولید) و `CURRENT_STATE.md` را بخوانید.**
- تغییر رفتار API، auth، env یا deployment باید سند مرجع همان ردیف را به‌روزرسانی کند.
- `README.md` فقط راهنمای شروع و نمای کلی است و محل ثبت جزئیات قرارداد نیست.
- `HANDOFF.md` snapshot عملیاتی است؛ تاریخچه‌ی کامل batchها فقط در `TASKS.md` ثبت می‌شود.
- `EXECUTION_ROADMAP.md` آرشیو است؛ نقشه‌ی آینده در `TRANSFORMATION_ROADMAP.md` و وضعیت در `TASKS.md`.
- قواعد ایجاد/به‌روزرسانی/جانشینی مستندات طبق
  [`governance/DOCUMENTATION-GOVERNANCE.md`](governance/DOCUMENTATION-GOVERNANCE.md)
  است: Find Before Create، Update Before Duplicate، Explicit Status، Explicit Supersession.
- `NEWER DOES NOT AUTOMATICALLY MEAN MORE AUTHORITATIVE` — جایگاه در نقشه و وضعیت
  اعلام‌شده‌ی سند تعیین‌کننده‌ی authority است.
- مقدار secret، شماره‌ی تست یا credential واقعی هرگز در مستندات commit نمی‌شود.
