# نقشه‌ی مستندات

برای جلوگیری از تکرار و تناقض، هر موضوع یک سند مرجع دارد:

| موضوع | سند مرجع | کاربرد |
|---|---|---|
| قوانین agent | [`../AGENTS.md`](../AGENTS.md) | رفتار و مرزهای agent توسعه |
| سیاست انتشار | [`RELEASE_POLICY.md`](RELEASE_POLICY.md) | قوانین Task → Production و checkpoint هر تسک |
| چرخه Feature → Production | [`FEATURE_TO_PRODUCTION.md`](FEATURE_TO_PRODUCTION.md) | runbook اجرایی دقیق از تعریف تسک تا checkpoint تولید |
| چک‌پوینت‌های تولید | [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md) | ledger چک‌پوینت‌های تأییدشده‌ی Production |
| درس‌های تکرارپذیر (Pitfalls) | [`PITFALLS/`](PITFALLS/) | درس‌های حوادث واقعی (build-time config، HTTP 200 و…) |
| قرارداد APIهای AI و analytics | [`AI_API.md`](AI_API.md) | request/response، خطاها و محدودیت‌ها |
| قالب گزارش تغییر | [`AI_CHANGE_TEMPLATE.md`](AI_CHANGE_TEMPLATE.md) | قالب PR و handoff برای agentها |
| توسعه‌ی خودکار | [`AI_DEVELOPMENT_SYSTEM.md`](AI_DEVELOPMENT_SYSTEM.md) | چرخه‌ی امن تغییر، validation و release |
| asset و cache | [`ASSETS.md`](ASSETS.md) | PWA، service worker، font و media policy |
| CI و E2E | [`CI.md`](CI.md) | pipeline، retry و انتخاب تست هدفمند |
| UI و accessibility | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | tokenها، RTL، touch target و motion |
| نقشه راه اجرا (آرشیو) | [`EXECUTION_ROADMAP.md`](EXECUTION_ROADMAP.md) | آرشیو برنامه‌ی اجرایی قبلی — جانشین: `TASKS.md` و `TRANSFORMATION_ROADMAP.md` |
| وضعیت عملیاتی | [`HANDOFF.md`](HANDOFF.md) | وضعیت فعلی، قراردادهای حساس و handoff |
| احراز هویت و launch | [`OTP_LAUNCH_READINESS.md`](OTP_LAUNCH_READINESS.md) | env، امنیت OTP، Go/No-Go و smoke test |
| انتشار و rollback | [`RELEASING.md`](RELEASING.md) | Docker، reverse proxy، PWA/TWA و release |
| وضعیت پروژه و backlog | [`TASKS.md`](TASKS.md) | batchها، اولویت‌ها و بدهی فنی |
| سند تحول و به‌روزرسانی | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) | ریسرچ رقبا، گپ‌ها و فهرست قابلیت‌های آینده (دونه‌دونه) |

## قانون به‌روزرسانی

- **قبل از شروع هر تسک وابسته، حتماً `RELEASE_POLICY.md` و `PRODUCTION_CHECKPOINTS.md` (چک‌پوینت فعلی تولید) را بخوانید.**
- تغییر رفتار API، auth، env یا deployment باید سند مرجع همان ردیف را به‌روزرسانی کند.
- `README.md` فقط راهنمای شروع و نمای کلی است و محل ثبت جزئیات قرارداد نیست.
- `HANDOFF.md` snapshot عملیاتی است؛ تاریخچه‌ی کامل batchها فقط در `TASKS.md` ثبت می‌شود.
- `EXECUTION_ROADMAP.md` آرشیو است؛ نقشه‌ی آینده در `TRANSFORMATION_ROADMAP.md` و وضعیت در `TASKS.md` نگهداری می‌شود.
- مقدار secret، شماره‌ی تست یا credential واقعی هرگز در مستندات commit نمی‌شود.
