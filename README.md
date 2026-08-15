# Apex Home Fitness 🏠🚀

پلتفرم هوشمند تولید برنامه‌های تمرینی شخصی‌سازی‌شده در خانه با حداقل تجهیزات.

## 🌟 ویژگی‌های کلیدی
- **هوش مصنوعی هوشمند:** تولید برنامه بر اساس اهداف، سطح و تجهیزات کاربر (GPT-4o-mini / Gemini).
- **سیستم طراحی چندپلتفرمی:** رابط کاربری Native برای iOS (Apple HIG)، Android (Material 3) و Web.
- **موتور تمرین پیشرفته:** مدیریت زنده تمرین با تایمر، شمارنده ست و انیمیشن‌های Lottie/Video.
- **تحلیل پیشرفت:** نمودارهای پیشرفت، استریک‌های تمرینی و تاریخچه کامل.
- **قابلیت PWA و TWA:** قابل نصب روی تمام دستگاه‌ها و آماده انتشار در گوگل‌پلی.
- **دوزبانه (Bilingual):** پشتیبانی کامل از فارسی (RTL) و انگلیسی (LTR).

## 🛠️ استک فنی
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Design:** Apple System Design & Material Design 3
- **Animations:** Framer Motion, lottie-react
- **Backend/DB:** Supabase (Auth + Postgres + Storage), Prisma ORM
- **AI Engine:** Vercel AI SDK (OpenAI/Gemini)
- **Offline:** Dexie (IndexedDB) & Sync Service

## 🚀 شروع به کار
1. `npm install`
2. تنظیم فایل `.env` (مشابه `.env.example`)
3. `npx prisma db push`
4. `npm run dev`

## 🤖 CI و E2E
Pipeline در `.github/workflows/ci.yml` به‌ترتیب و fail-fast اجرا می‌شود:

1. **`build`**: `npm ci` → `npx prisma generate` → lint → type check → unit tests → `next build`
2. **`e2e`** (فقط بعد از موفقیت `build`): `npm ci` → نصب browserهای Playwright (`npx playwright install --with-deps chromium`) → `npm run test:e2e`؛ در صورت failure گزارش در artifact آپلود می‌شود.

نکته‌های مهم:
- CI فقط envهای placeholder (بدون secrets واقعی) می‌دهد؛ `DATABASE_URL="file:./ci.db"` کافی است چون E2E فعلی UI-only است و به auth/DB واقعی نیاز ندارد (داشبورد، کوییز، تم، کیبورد، ARIA و آفلاین).
- E2E روی dev server اجرا می‌شود چون `tests/offline-pwa.spec.ts` رفتار dev-mode (عدم ثبت service worker) را پین کرده است؛ build پروداکشن جداگانه در job اول اعتبارسنجی می‌شود.
- جریان‌های نیازمند creds واقعی (مثلاً `POST /api/generate-program` با Supabase auth + کلید OpenAI) جزو E2E نیستند — جزئیات در `.env.example` مستند شده است.
- تست‌ها به‌صورت محلی: `npx playwright install chromium && npm run test:e2e`

## 📂 مستندات
تمامی مستندات فنی، نقشه راه و استراتژی‌ها در پوشه `docs/` قرار دارند.
