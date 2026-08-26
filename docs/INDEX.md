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
| سیستم توسعه‌ی خودکار (فرایند) | [`AI_DEVELOPMENT_SYSTEM.md`](AI_DEVELOPMENT_SYSTEM.md) | فرایند/workflow توسعه — مکمل AGENTS.md، نه جایگزین آن |
| قالب گزارش تغییر | [`AI_CHANGE_TEMPLATE.md`](AI_CHANGE_TEMPLATE.md) | AUTHORITATIVE قالب change report |
| محصول: ویژن سطح‌بالا | [`product/PRODUCT-VISION.md`](product/PRODUCT-VISION.md) | AUTHORITATIVE — CURRENT (تمایز CURRENT / DIRECTION / PLANNED) |
| محصول: تجربه تمرین V2 (ویژن) | [`product/WORKOUT-EXPERIENCE-V2.md`](product/WORKOUT-EXPERIENCE-V2.md) | وضعیت: PRODUCT / UX VISION — NOT YET IMPLEMENTED |
| محصول: سوالات باز تجربه تمرین V2 | [`product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md`](product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md) | سوالات باز محصول/معماری برای صاحب محصول |
| معماری (اصول کلی) | **NO CANONICAL SOURCE YET** | بخشی در `AGENTS.md` §۴، `DESIGN_SYSTEM.md`، `ASSETS.md`، `AI_API.md`؛ اصول پیشنهادی: [`architecture/ARCHITECTURE-PRINCIPLES-PROPOSAL.md`](architecture/ARCHITECTURE-PRINCIPLES-PROPOSAL.md) (PROPOSED — نیازمند تأیید owner)؛ سند معماری واحد پس از پذیرش اصول ایجاد شود |
| معماری (ممیزی مدولاریتی) | [`architecture/MODULARITY-AUDIT.md`](architecture/MODULARITY-AUDIT.md) | AUDIT RECORD — NOT AN ARCHITECTURE DECISION |
| معماری (رجیستر ریسک کوپلینگ) | [`architecture/COUPLING-RISK-REGISTER.md`](architecture/COUPLING-RISK-REGISTER.md) | AUDIT RECORD — NOT AN IMPLEMENTATION BACKLOG |
| معماری (فهرست قابلیت‌ها) | [`architecture/CAPABILITY-INVENTORY-PROPOSAL.md`](architecture/CAPABILITY-INVENTORY-PROPOSAL.md) | PROPOSED — NOT AUTHORITATIVE (ورودی Registry آینده) |
| تصمیم‌های معماری (ADR) | [`adr/README.md`](adr/README.md) | مکانیزم فعال؛ هنوز هیچ ADR پذیرفته‌ای وجود ندارد |
| قرارداد APIهای AI و analytics | [`AI_API.md`](AI_API.md) | request/response، خطاها و محدودیت‌ها |
| asset و cache | [`ASSETS.md`](ASSETS.md) | PWA، service worker، font و media policy |
| UI و accessibility | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | tokenها، RTL، touch target و motion — Frontend source of truth |
| UI Kit چندپلتفرمی | [`../src/components/ui/platform/README.md`](../src/components/ui/platform/README.md) | کامپوننت‌های iOS/Android/Web |
| مدل داده | [`../prisma/schema.prisma`](../prisma/schema.prisma) (in-code) | AUTHORITATIVE داده‌ها؛ سند معماری داده‌ی جدا هنوز گپ است |
| آفلاین / همگام‌سازی | پیاده‌سازی: `src/lib/offline/`، `src/services/syncService.ts`، `supabase/migrations/0001_workout_exercise_logs.sql` | **NO CANONICAL ARCHITECTURE DOC YET** — ارجاع پیاده‌سازی؛ سند عمیق به Modularity Audit موکول شد |
| قرارداد محیط (env) | [`../.env.example`](../.env.example) | AUTHORITATIVE؛ توسط `tests/otp-launch-readiness.test.ts` بررسی می‌شود |
| CI و E2E | [`CI.md`](CI.md) | pipeline، retry و انتخاب تست هدفمند |
| انتشار و rollback | [`RELEASING.md`](RELEASING.md) | Docker، reverse proxy، PWA/TWA و release |
| احراز هویت و launch | [`OTP_LAUNCH_READINESS.md`](OTP_LAUNCH_READINESS.md) | env، امنیت OTP، Go/No-Go و smoke test |
| وضعیت عملیاتی (Handoff) | [`HANDOFF.md`](HANDOFF.md) | snapshot وضعیت فعلی و قراردادهای حساس |
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
