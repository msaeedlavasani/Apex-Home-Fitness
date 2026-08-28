# Handoff عملیاتی Apex Home Fitness

> این فایل snapshot عملیاتی پروژه است؛ قراردادهای جزئی در سند تخصصی خودشان نگهداری می‌شوند.

## چک‌پوینت تولید فعلی (Verified Production Checkpoint)

- **R6 — PASS** (جاری): source `aee28d12e2368206e2d9f788afc2ecd19983e5f6`، image `apex-home-fit:r6-aee28d1` (`sha256:6aabafe1…`)؛ روت‌های عمومی/auth/protected در مرورگر واقعی ۹/۹ + re-check تأخیری PASS؛ RestartCount 0.
- **S02 — PASS** (قبلی): source `60abb2d373983fa781665a0b6301f1ca1f46b357`، image `apex-home-fit:s02-60abb2d-r1` (`sha256:d0483ad7…`).
- **DB:** SQLite روی volume `apexhomefit_prod_db:/data`، `DATABASE_URL=file:/data/app.db`، ۱۲ migration، integrity ok؛ R6 هیچ تغییری در DB نداد.
- قوانین: [`RELEASE_POLICY.md`](RELEASE_POLICY.md) · runbook: [`FEATURE_TO_PRODUCTION.md`](FEATURE_TO_PRODUCTION.md) · ledger: [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md) · درس‌ها: [`PITFALLS/`](PITFALLS/)
- **R7 هنوز شروع نشده است.** تسک وابسته‌ی بعدی (R7) فقط پس از تأیید Owner می‌تواند شروع شود.

## وضعیت فعلی

- **Branch اصلی:** `main`
- **Framework:** Next.js 15.5.23 + next-intl 4.13.7
- **UI foundation:** Tailwind CSS و semantic CSS tokens؛ MUI `9.3.1` با Emotion به‌صورت foundation آزمایشی در layout فعال است و `CssBaseline` ندارد.
- **Node:** 22
- **Database:** Prisma 6 + SQLite؛ در Docker روی volume به نام `db-data`
- **Identity/session:** Supabase SSR
- **OTP live provider:** SMS.ir، endpoint `v1/send/verify`
- **OTP فعلی production:** موقتاً mock و فقط برای شماره‌های allowlist تست؛ کد توسعه در مستندات نگهداری نمی‌شود. این حالت قبل از public launch باید خاموش شود.
- **SMS template live:** شناسه `976440` با نام پارامتر `otp`
- **Deployment:** self-hosted Docker Compose؛ سرویس app روی پورت 3000. DNS کانتینر app صراحتاً به `1.1.1.1` و `8.8.8.8` تنظیم شده تا lookup ناپایدار Supabase (`EAI_AGAIN`) باعث شکست OTP نشود.
- **Program generation:** AI-first explicit resolver in `src/lib/ai/provider.ts`; production can use `Groq → rules-v2` or `OpenAI → rules-v2` through env only. Rules-v2 respects independent weekly frequency, hard rest-day constraints, exact equipment ids, limitation exclusions and recent adherence. Both keys are server-only and never logged.
- **Profile/workout tracking:** profile contact email is editable separately from the synthetic auth email; verified phone stays immutable. Weight changes update the current profile and append `WeightEntry` history. Starting and completing a generated workout creates/finishes an owned `WorkoutSession`, which feeds dashboard completion markers, History and Analytics.
- **Avatar storage:** production uses Supabase Storage — create a PRIVATE bucket named `avatars` (objects `<userId>.<ext>`, served via short-lived signed URLs; no RLS needed, service-role writes/signs). `User.avatarUrl` stores the object path; legacy data-URL rows keep working. Without `SUPABASE_SERVICE_ROLE_KEY` the app falls back to storing the data URL in the DB (dev/mock).
- **Program regeneration:** regenerating (quiz re-run or preferences save, incl. rest-day changes) updates the user's existing `Program` IN PLACE (same id) — workout history stays attached and no orphaned program rows accumulate.

## وضعیت فعلی پروژه (Current Status) 🟢
- **Batch 8:** بهینه‌سازی بصری، Design System، پیشنهاد AI، TWA و SEO — تکمیل.
- **Batch 9:** Zod، محافظ‌های AI، Medical Disclaimer، تست امنیتی و CI سخت‌گیرانه — تکمیل.
- **Batch 10:** Workout Engine، E2E آفلاین/RTL/کیبورد/ARIA، audit طراحی، API docs و pipeline کامل E2E — تکمیل.
- **Batch 11:** Rate Limit چنداینستنسی، idempotency، timeout persistence، gamification tests و conflict resolution آفلاین — تکمیل.
- **Batch 12:** چندهدفه‌کردن کوییز، روزهای استراحت، رفع PostCSS، responsive/RTL و asset pipeline — تکمیل.
- **Batch 13:** empty-stateها، فونت Vazirmatn، Profile با sidebar/back، FAQ دوزبانه، ترتیب روزهای فارسی — تکمیل (unit 207/207؛ E2E متمرکز 51/51).
- **Batch 14:** adapter امن SMS.ir، OTP lifecycle/session، Landing→Quiz→OTP→save→generate→Dashboard، auth UI/route protection و readiness checklist — تکمیل (unit 319/319؛ auth mock E2E 12/12؛ main-flows 8/8).
- **Batch 15:** زبان‌سوییچر سراسری EN/FA و enforce قطعی روزهای استراحت — تکمیل (unit 336/336؛ E2E هدفمند affected سبز).
- **Batch 17:** پروفایل کامل (شماره موبایل، آواتار با Supabase Storage + signed URL، ترتیب سایدبار، خروج→لندینگ)، تقویم ماهانه تاریخچه، چارت‌های آمار، OTP TTL=۱۵ دقیقه و بازتولید درجای برنامه + ویرایش روزهای استراحت در ترجیحات — تکمیل (unit 387/387).
- **Batch 18:** تب «ترجیحات تمرین» در تب‌بارهای موبایل (۵ ستون iOS/اندروید + پیلی وب)، حذف بازگشت از صفحات تب، هدر زبان/تم در iOS، یکپارچگی صفحه پروفایل، اصلاح برند «اپکس هوم فیتنس» و سند تحول (`docs/TRANSFORMATION_ROADMAP.md`) — تکمیل (unit 387/387؛ دیپلوی‌شده: `aa2b1db`).
- **Batch 19:** صفحه «تنظیمات تمرین» با ۳ کارت مستقل و نام فارسی بهتر، آیکون برند Apex در هدر همه پلتفرم‌ها (`BrandIcon`)، و به‌روزرسانی سند تحول با پروفایل ۶ رقیب — تکمیل (unit 387/387).
- **Batch 20:** قرارداد frequency مستقل، rules-v2 ایمن و history-aware، تجهیزات دقیق، method mix نرمال، کوییز/تنظیمات ۸مرحله‌ای و رجیستر شواهد رقبا — آماده validation نهایی؛ CI خارج از این batch است.
- **Workflow Repair Gate completed — isolated agents, staged validation, targeted E2E policy and CI auth coverage are active.**
- **Production Go مشروط:** قبل از لانچ باید `SMS_IR_API_KEY`، `SMS_IR_TEMPLATE_ID`، Supabase URL/anon، دامنه HTTPS، redirectها و template فعال تنظیم شوند و smoke test واقعی با شماره رضایت‌دار اجرا شود (چک‌لیست کامل: `docs/OTP_LAUNCH_READINESS.md` §11).
- **استقرار سرور (self-hosted Docker):** Next 15.5.23 روی `85.198.16.251`، کد در `/opt/apexhomefit/app-new/` (بدون git؛ سینک دستی با rsync + `docker compose up --build -d`؛ `.deployed-commit` رکورد کامیت دیپلوی‌شده است). *(روند release فعلی: تصویر immutable از کامیت دقیق — `docs/FEATURE_TO_PRODUCTION.md`؛ این پاراگراف روند تاریخی است.)* **Rollback:** git (checkout کامیت قبلی + rebuild) یا بکاپ‌های `app-new/backups/` (اسنپ‌شات تازه دیتابیس + `current.env`). `/opt/apexhomefit` پاکسازی شد — فقط `app-new`، `backups/` و اسکریپت‌های acme (`acme-auth.sh`/`acme-cleanup.sh` که **برای تمدید گواهی certbot ضروری‌اند**) باقی مانده‌اند. قالب SMS.ir: `SMS_IR_TEMPLATE_ID=976440`، پارامتر قالب: `otp` (`SMS_IR_CODE_PARAMETER=otp`). OTP mock allowlist، session Supabase و مسیر HTTPS تا dashboard در 2026-08-26 smoke-test شد؛ کد mock عمداً مستند نمی‌شود. تأخیر تحویل SMS (~۴ دقیقه) سمت SMS.ir است — قالب باید در بخش «ارسال سریع» پنل تعریف شود.
- **OTP mock override (production test harness):** برای توسعه/تست سرور، `AUTH_OTP_MODE=mock` + `AUTH_OTP_MOCK_IN_PRODUCTION=true` فقط شماره‌های `AUTH_OTP_MOCK_PHONES` را به session تست می‌رساند؛ مقدار کد توسعه secret-like است و نباید log/document شود. بقیه به SMS.ir واقعی route می‌شوند (پیش‌فرض OFF). بعد از رفع SMS، حالت mock حذف شود.
- **تصمیم Next.js:** ارتقای امنیتی به 15.5.23 (به‌همراه next-intl 4.13.7) روی برنچ `migration/next-15` انجام و typecheck/lint/unit (345/345) سبز شد؛ 14.x دیگر پچ امنیتی نمی‌گیرد، پس این ارتقا قبل از launch الزامی است. ارتقای نهایی به 16.x همچنان به‌عنوان migration مستقل و **بعد از launch** باقی می‌ماند.
- **تمرکز بعدی:** اجرای آیتم‌های `docs/TRANSFORMATION_ROADMAP.md` دونه‌دونه — **اولویت اول: آیتم ۱ «ثبت پیشرفت (Progress Check-in)»** (ثبت روزهای تمرین + وزن + یادداشت، نمایش در تاریخچه/آمار، ورود به تولید برنامه). بچ جدید فقط با تأیید صریح کاربر.

## نکات کلیدی برای ایجنت بعدی
0. **قبل از شروع هر تسک وابسته:** `RELEASE_POLICY.md` + `PRODUCTION_CHECKPOINTS.md` را بخوان؛ چک‌پوینت فعلی تولید R6 است و R7 شروع نشده.
1. **ریشه پروژه:** `/Users/msl/Documents/GitHub/Apex-Home-Fitness` — مستندات در `docs/`.
2. **سیاست تست:** `docs/CI.md` (اسکریپت‌ها: `test:e2e:smoke`/`auth`/`quiz`/`full`).
3. **قرارداد launch:** `docs/OTP_LAUNCH_READINESS.md` (Go/No-Go، envها، smoke test).
4. **هوش مصنوعی:** موتور AI در `src/app/api/generate-program/route.ts`.
5. **کارهای blocked روی کاربر:** env واقعی SMS.ir/Supabase، دامنه HTTPS، اکانت Vercel (فعلاً به تعویق افتاده).
6. **حالت mock پروداکشن:** اگر `AUTH_OTP_MODE=mock` روی سرور فعال است، حتماً `AUTH_OTP_MOCK_IN_PRODUCTION=true` و `AUTH_OTP_MOCK_PHONES` (allowlist تست) را هم دیده و بعد از رفع SMS حذفش کن.
