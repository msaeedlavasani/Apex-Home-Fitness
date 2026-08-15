# مستند تحویل (Handoff) 🚀

## مختصات محیطی (Environment Context)
- **مسیر محلی پروژه:** `/Users/msl/Documents/GitHub/Apex-Home-Fitness`
- **لینک ریپوزیتوری:** `https://github.com/msaeedlavasani/Apex-Home-Fitness.git`
- **دسترسی گیت:** کلید SSH روی سیستم نصب و فعال است.

## متغیرهای محیطی مورد نیاز (.env)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` (اتصال به SQLite یا Postgres)
- `OPENAI_API_KEY` (برای تعامل با GPT-4o-mini)

## استراتژی رابط کاربری و توزیع (UI & Distribution)
- **Multi-Platform Design System:** اپلیکیشن از یک سیستم طراحی واحد با خروجی‌های متفاوت برای **iOS (Apple HIG)**، **Android (Material 3)** و **Responsive Web** استفاده می‌کند.
- **AppShell:** تمامی صفحات باید در کامپوننت `<AppShell>` قرار گیرند تا ناوبری نیتیو هر پلتفرم را دریافت کنند.
- **توزیع ترکیبی (PWA + TWA):** پروژه علاوه بر قابلیت نصب وب، استانداردهای **Trusted Web Activity** را برای انتشار در گوگل‌پلی رعایت می‌کند.

## پروتکل توسعه (Development Workflow) 🛠️
این پروژه از یک رویه ثابت برای توسعه استفاده می‌کند:
1. **انتخاب بچ (Batching):** انتخاب ۵ تسک از لیست تسک‌ها.
2. **تفویض (Delegation):** واگذاری تسک‌ها به ساب-ایجنت‌ها (Sub-agents) جهت اجرا.
3. **بررسی و مرج (Review & Merge):** ایجنت اصلی تمام خروجی‌ها را بررسی، تست و در ساختار نهایی ادغام می‌کند.
4. **انتشار (Deployment):** پس از اتمام بچ و تایید کیفیت، کدها یک‌باره به گیت Push می‌شوند.

## نکات کلیدی برای ایجنت بعدی
1. **دسترسی به فایل‌ها:** ریشه اصلی پروژه `/Users/msl/Documents/GitHub/Apex-Home-Fitness` است.
2. **مستندات:** تمام فایل‌های راهنما در پوشه `docs/` هستند.
3. **هوش مصنوعی:** موتور AI در `src/app/api/generate-program/route.ts` قرار دارد.
