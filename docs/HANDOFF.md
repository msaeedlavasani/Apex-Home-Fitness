# Handoff عملیاتی Apex Home Fitness

> این فایل snapshot عملیاتی پروژه است؛ قراردادهای جزئی در سند تخصصی خودشان نگهداری می‌شوند.

## وضعیت فعلی

- **Branch اصلی:** `main`
- **Framework:** Next.js 15.5.23 + next-intl 4.13.7
- **UI foundation:** Tailwind CSS و semantic CSS tokens؛ MUI `9.3.1` با Emotion به‌صورت foundation آزمایشی در layout فعال است و `CssBaseline` ندارد.
- **Node:** 22
- **Database:** Prisma 6 + SQLite؛ در Docker روی volume به نام `db-data`
- **Identity/session:** Supabase SSR
- **OTP live provider:** SMS.ir، endpoint `v1/send/verify`
- **OTP فعلی production:** موقتاً mock؛ ارسال SMS واقعی خاموش است و کد نمایشی `123456` است.
- **SMS template live:** شناسه `976440` با نام پارامتر `otp`
- **Deployment:** self-hosted Docker Compose؛ سرویس app روی پورت 3000. DNS کانتینر app صراحتاً به `1.1.1.1` و `8.8.8.8` تنظیم شده تا lookup ناپایدار Supabase (`EAI_AGAIN`) باعث شکست OTP نشود.
- **Program generation:** explicit resolver in `src/lib/ai/provider.ts`; production can use `Groq → rules` or `OpenAI → rules` through env only. Recommended current env: `PROGRAM_GENERATOR=ai`, `AI_PROVIDER=groq`, `AI_GENERATION_FALLBACK=rules`, `GROQ_MODEL=openai/gpt-oss-120b`. `@ai-sdk/groq` is pinned to compatible `1.2.9`; `@ai-sdk/openai` remains `1.3.24`. Both keys are server-only and never logged.
- **Profile/workout tracking:** profile contact email is editable separately from the synthetic auth email; verified phone stays immutable. Weight changes update the current profile and append `WeightEntry` history. Starting and completing a generated workout creates/finishes an owned `WorkoutSession`, which feeds dashboard completion markers, History and Analytics.

## وضعیت فعلی پروژه (Current Status) 🟢
- **Batch 8:** بهینه‌سازی بصری، Design System، پیشنهاد AI، TWA و SEO — تکمیل.
- **Batch 9:** Zod، محافظ‌های AI، Medical Disclaimer، تست امنیتی و CI سخت‌گیرانه — تکمیل.
- **Batch 10:** Workout Engine، E2E آفلاین/RTL/کیبورد/ARIA، audit طراحی، API docs و pipeline کامل E2E — تکمیل.
- **Batch 11:** Rate Limit چنداینستنسی، idempotency، timeout persistence، gamification tests و conflict resolution آفلاین — تکمیل.
- **Batch 12:** چندهدفه‌کردن کوییز، روزهای استراحت، رفع PostCSS، responsive/RTL و asset pipeline — تکمیل.
- **Batch 13:** empty-stateها، فونت Vazirmatn، Profile با sidebar/back، FAQ دوزبانه، ترتیب روزهای فارسی — تکمیل (unit 207/207؛ E2E متمرکز 51/51).
- **Batch 14:** adapter امن SMS.ir، OTP lifecycle/session، Landing→Quiz→OTP→save→generate→Dashboard، auth UI/route protection و readiness checklist — تکمیل (unit 319/319؛ auth mock E2E 12/12؛ main-flows 8/8).
- **Batch 15:** زبان‌سوییچر سراسری EN/FA و enforce قطعی روزهای استراحت — تکمیل (unit 336/336؛ E2E هدفمند affected سبز).
- **Workflow Repair Gate completed — isolated agents, staged validation, targeted E2E policy and CI auth coverage are active.**
- **Production Go مشروط:** قبل از لانچ باید `SMS_IR_API_KEY`، `SMS_IR_TEMPLATE_ID`، Supabase URL/anon، دامنه HTTPS، redirectها و template فعال تنظیم شوند و smoke test واقعی با شماره رضایت‌دار اجرا شود (چک‌لیست کامل: `docs/OTP_LAUNCH_READINESS.md` §11).
- **استقرار سرور (self-hosted Docker):** Next 15.5.23 روی `85.198.16.251` (کد در `/opt/apexhomefit/app-new/`، پوشه‌ی قدیمی `/opt/apexhomefit/app-final-fixed/` برای rollback) بالا است. قالب SMS.ir: `SMS_IR_TEMPLATE_ID=976440`، پارامتر قالب: `otp` (`SMS_IR_CODE_PARAMETER=otp`). OTP mock allowlist با `123456`، session Supabase و مسیر HTTPS تا dashboard در 2026-08-26 smoke-test شد. تأخیر تحویل SMS (~۴ دقیقه) سمت SMS.ir است — قالب باید در بخش «ارسال سریع» پنل تعریف شود.
- **OTP mock override (production test harness):** برای اینکه توسعه/تست روی سرور به SMS وابسته نباشد، `getOtpService()` در حالت `AUTH_OTP_MODE=mock` + `AUTH_OTP_MOCK_IN_PRODUCTION=true` یک سرویس HYBRID برمی‌گرداند: شماره‌های `AUTH_OTP_MOCK_PHONES` کد موکاپ فوری (`devCode=123456`) + session واقعی Supabase می‌گیرند؛ بقیه به SMS.ir واقعی route می‌شوند (امن: پیش‌فرض OFF، فقط allowlist). جزئیات: `src/lib/auth/otpService.ts` + `tests/otp-mock-production.test.ts`. بعد از رفع SMS، `AUTH_OTP_MODE=mock` حذف شود.
- **تصمیم Next.js:** ارتقای امنیتی به 15.5.23 (به‌همراه next-intl 4.13.7) روی برنچ `migration/next-15` انجام و typecheck/lint/unit (345/345) سبز شد؛ 14.x دیگر پچ امنیتی نمی‌گیرد، پس این ارتقا قبل از launch الزامی است. ارتقای نهایی به 16.x همچنان به‌عنوان migration مستقل و **بعد از launch** باقی می‌ماند.
- **تمرکز بعدی:** آمادگی بیلد/استقرار روی سرور (بچ ۱۶) → production smoke و go/no-go لانچ (نیازمند env واقعی از کاربر). بچ جدید فقط با تأیید صریح کاربر.

## نکات کلیدی برای ایجنت بعدی
1. **ریشه پروژه:** `/Users/msl/Documents/GitHub/Apex-Home-Fitness` — مستندات در `docs/`.
2. **سیاست تست:** `docs/CI.md` (اسکریپت‌ها: `test:e2e:smoke`/`auth`/`quiz`/`full`).
3. **قرارداد launch:** `docs/OTP_LAUNCH_READINESS.md` (Go/No-Go، envها، smoke test).
4. **هوش مصنوعی:** موتور AI در `src/app/api/generate-program/route.ts`.
5. **کارهای blocked روی کاربر:** env واقعی SMS.ir/Supabase، دامنه HTTPS، اکانت Vercel (فعلاً به تعویق افتاده).
6. **حالت mock پروداکشن:** اگر `AUTH_OTP_MODE=mock` روی سرور فعال است، حتماً `AUTH_OTP_MOCK_IN_PRODUCTION=true` و `AUTH_OTP_MOCK_PHONES` (allowlist تست) را هم دیده و بعد از رفع SMS حذفش کن.
