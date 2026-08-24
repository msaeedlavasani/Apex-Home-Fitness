# مستند تحویل (Handoff) 🚀

## مختصات محیطی (Environment Context)
- **لینک ریپوزیتوری:** `https://github.com/msaeedlavasani/Apex-Home-Fitness.git`
- **مسیر پروژه:** `/Users/msl/Documents/GitHub/Apex-Home-Fitness`
- **دسترسی گیت:** کلید SSH روی سیستم نصب است؛ چون پورت 22 در این شبکه مسدود است، remote ریپو از `ssh://git@ssh.github.com:443/...` استفاده می‌کند.
- **مرجع env:** `.env.example`؛ سیاست CI/E2E در `docs/CI.md`؛ جزئیات API در `docs/AI_API.md`؛ آمادگی launch در `docs/OTP_LAUNCH_READINESS.md`؛ انتشار در `docs/RELEASING.md`.

## وضعیت CI (همیشه فعال) ✅
- **Build Blocker: حل شد** — علت ریشه‌ای شکست CI برای `77f721d`/`ea86ad8`/`dc5b002` یک تست واحد docs بود (لینک `OTP_LAUNCH_READINESS` در `TASKS.md`)؛ با `5516e90` اصلاح و build سبز ثبت شد؛ شکست e2e بعدی (تست قدیمی rest-days) با `4d27e7d` اصلاح شد.
- **هر کامیت (push روی main):** build + lint + typecheck + unit + E2E auth (با `AUTH_OTP_MODE=mock`) + E2E smoke — مجموعاً ~۳ دقیقه.
- **E2E کامل:** فقط شبانه (۲۲:۰۰ UTC) یا دستی برای release/high-risk — `ci-full-e2e.yml`.
- **سیاست دائمی** (طبقه‌بندی شکست، retry، نقشه تغییر→E2E، benchmark): `docs/CI.md`.

## پروتکل توسعه (Development Workflow) 🛠️
روال اجباری اجرای هر بچ:
1. **انتخاب بچ (Batching):** ۵ تسکِ باز با بالاترین اولویت از `docs/TASKS.md`؛ تا وقتی تسک اولویت‌دار باز هست، تسک کم‌اولویت وارد بچ نمی‌شود.
2. **تفویض موازی و ایزولاسیون:** هر تسک به یک ساب‌ایجنت دلیگیت می‌شود؛ هر ساب‌ایجنت در worktree/branch جدا (`batchXX/<task>`) کار می‌کند؛ بازنویسی فایل خارج از scope ممنوع؛ تغییر contractهای مشترک (auth/API/schema/env/routing) فقط با هماهنگی ایجنت اصلی.
3. **گزارش استاندارد ساب‌ایجنت:** هر ساب‌ایجنت هنگام تحویل گزارش می‌دهد: فایل‌های تغییرکرده، تأثیر بر ماژول‌ها، تغییرات API/DB/auth، نتیجه‌ی static/unit/integration، ریسک (LOW/MEDIUM/HIGH) و پیشنهاد E2E (NONE/TARGETED/FULL).
4. **هرم اعتبارسنجی و مرج:** `static → unit → integration/API → contract → targeted E2E → full E2E (فقط release/high-risk)`. ایجنت اصلی قبل از مرج، conflict/scope/contract drift را بررسی و فقط خروجی تأییدشده را مرج می‌کند. **تست درست، در لایه درست** — E2E هرگز حلقه دیباگ پیش‌فرض نیست.
5. **طبقه‌بندی شکست قبل از rerun:** Application Bug → regression ارزان + fix + targeted E2E؛ Test Bug → اصلاح همان spec؛ Env/Infra → ریست محیط؛ Flaky → ثبت + rerun محدود؛ Expected Behavior Change → به‌روزرسانی contract و تست. بعد از هر failure، full E2E خودکار تکرار نمی‌شود.
6. **به‌روزرسانی مستندات:** پس از مرج، `docs/TASKS.md` (تاریخچه بچ‌ها) و در صورت نیاز `HANDOFF.md` به‌روزرسانی می‌شوند.
7. **انتشار و توقف:** تغییرات بچ یک‌باره commit و push می‌شوند؛ سپس **توقف اجباری و تأیید صریح کاربر** قبل از بچ بعدی — بدون تأیید، هیچ تسک جدیدی شروع نمی‌شود.

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
- **استقرار سرور (self-hosted Docker):** Next 15.5.23 روی `85.198.16.251` (کد در `/opt/apexhomefit/app-new/`، پوشه‌ی قدیمی `/opt/apexhomefit/app-final-fixed/` برای rollback) بالا است. قالب SMS.ir: `SMS_IR_TEMPLATE_ID=976440`، پارامتر قالب: `otp` (`SMS_IR_CODE_PARAMETER=otp`). تأخیر تحویل SMS (~۴ دقیقه) سمت SMS.ir است — قالب باید در بخش «ارسال سریع» پنل تعریف شود.
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
