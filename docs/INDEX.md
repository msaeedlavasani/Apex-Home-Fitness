# نقشه‌ی مستندات

برای جلوگیری از تکرار و تناقض، هر موضوع یک سند مرجع دارد:

| موضوع | سند مرجع | کاربرد |
|---|---|---|
| وضعیت پروژه و backlog | [`TASKS.md`](TASKS.md) | batchها، اولویت‌ها و بدهی فنی |
| وضعیت عملیاتی | [`HANDOFF.md`](HANDOFF.md) | وضعیت فعلی، قراردادهای حساس و handoff |
| انتشار و rollback | [`RELEASING.md`](RELEASING.md) | Docker، reverse proxy، PWA/TWA و release |
| احراز هویت و launch | [`OTP_LAUNCH_READINESS.md`](OTP_LAUNCH_READINESS.md) | env، امنیت OTP، Go/No-Go و smoke test |
| قرارداد APIهای AI و analytics | [`AI_API.md`](AI_API.md) | request/response، خطاها و محدودیت‌ها |
| CI و E2E | [`CI.md`](CI.md) | pipeline، retry و انتخاب تست هدفمند |
| UI و accessibility | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | tokenها، RTL، touch target و motion |
| asset و cache | [`ASSETS.md`](ASSETS.md) | PWA، service worker، font و media policy |
| توسعه‌ی خودکار | [`AI_DEVELOPMENT_SYSTEM.md`](AI_DEVELOPMENT_SYSTEM.md) | چرخه‌ی امن تغییر، validation و release |
| قوانین agent | [`../AGENTS.md`](../AGENTS.md) | رفتار و مرزهای agent توسعه |
| نقشه راه اجرا | [`EXECUTION_ROADMAP.md`](EXECUTION_ROADMAP.md) | اولویت‌ها، delegation، وابستگی‌ها و قرارداد ادغام |
| سند تحول و به‌روزرسانی | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) | ریسرچ رقبا، گپ‌ها و فهرست قابلیت‌های آینده (دونه‌دونه) |
| قالب گزارش تغییر | [`AI_CHANGE_TEMPLATE.md`](AI_CHANGE_TEMPLATE.md) | قالب PR و handoff برای agentها |

## قانون به‌روزرسانی

- تغییر رفتار API، auth، env یا deployment باید سند مرجع همان ردیف را به‌روزرسانی کند.
- `README.md` فقط راهنمای شروع و نمای کلی است و محل ثبت جزئیات قرارداد نیست.
- `HANDOFF.md` snapshot عملیاتی است؛ تاریخچه‌ی کامل batchها فقط در `TASKS.md` ثبت می‌شود.
- مقدار secret، شماره‌ی تست یا credential واقعی هرگز در مستندات commit نمی‌شود.
