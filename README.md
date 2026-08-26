# Apex Home Fitness 🏠🚀

پلتفرم دوزبانه‌ی تولید برنامه‌ی تمرینی شخصی‌سازی‌شده برای تمرین در خانه، با پشتیبانی از برنامه‌ریزی مبتنی بر هوش مصنوعی، ثبت پیشرفت، PWA و تجربه‌ی RTL/LTR.

A bilingual home-fitness platform for personalized workout plans, progress tracking, AI-assisted programming, PWA support, and RTL/LTR experiences.

## وضعیت فعلی

- **Framework:** Next.js 15.5.23 App Router + next-intl 4.13.7
- **Runtime:** Node.js 22، React 18، TypeScript
- **UI:** Tailwind CSS، Design System چندپلتفرمی، فونت‌های self-hosted
- **Auth:** OTP با adapter قابل‌تعویض؛ SMS.ir برای حالت live و mock صریح برای توسعه/تست
- **Data:** Prisma 6 + SQLite در استقرار self-hosted؛ Supabase برای Identity/Session
- **AI:** Vercel AI SDK با resolver صریح (Groq یا OpenAI از طریق env) + fallback قطعی rules engine
- **Offline/PWA:** Dexie، service worker و fallback آفلاین
- **Deployment:** Docker Compose با image standalone و volume دیتابیس

> وضعیت فعلی auth: ورود با OTP (SMS.ir) پشت feature flag است؛ mock فقط dev/CI و با allowlist است و session جعلی نمی‌سازد؛ launch عمومی هنوز منوط به چک‌لیست Go/No-Go است (جزئیات و rollback در `docs/OTP_LAUNCH_READINESS.md`).

## شروع توسعه

پیش‌نیاز: Node.js 22 و npm.

```bash
npm ci
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run dev
```

سپس یکی از مسیرهای `/en` یا `/fa` را باز کنید. مقادیر واقعی secret را commit نکنید.

## دستورات استاندارد

```bash
npm run typecheck       # TypeScript بدون emit
npm run lint            # ESLint
npm test                # unit و contract tests
npm run build           # production build
npm run test:e2e:auth   # مسیر احراز هویت با mock
npm run test:e2e:smoke  # مسیر اصلی محصول
npm run test:e2e:full   # کل regression suite
```

ممیزی‌های مستقل:

```bash
npm run audit:assets
npm run audit:design
npm run audit:lottie
```

`audit:lottie` وقتی asset انیمیشن وجود نداشته باشد گزارش خالی تولید می‌کند؛ خروجی پیش‌فرض در `reports/` است و commit نمی‌شود.

## اجرای Docker

```bash
cp .env.example .env
# .env را فقط روی سرور/محیط محلی تنظیم کنید
docker compose up --build -d
```

سرویس `migrate` migrationهای Prisma را روی volume اجرا می‌کند و سرویس `app` روی پورت 3000 بالا می‌آید. برای production حتماً reverse proxy و HTTPS تنظیم کنید. راهنمای کامل در `docs/RELEASING.md` است.

## معماری پوشه‌ها

```text
src/app/                 صفحات، layoutها و Route Handlerهای API
src/components/          کامپوننت‌های رابط کاربری و موتور تمرین
src/lib/                 منطق زیرساختی auth، AI، offline و ابزارها
src/services/             سرویس‌های دامنه و persistence
prisma/                  schema، seed و migrationهای دیتابیس
infra/ai/prompts/        promptهای versioned تولید برنامه
scripts/                 auditهای بدون وابستگی
supabase/migrations/     migrationهای SQL مربوط به Supabase در صورت استفاده
tests/                   unit، contract و Playwright E2E
docs/                    مستندات عملیاتی و قراردادهای پروژه
```

## مستندات

قوانین agent توسعه: [`AGENTS.md`](AGENTS.md)

نقشه‌ی کامل و مرجع هر موضوع: [`docs/INDEX.md`](docs/INDEX.md)

- [`docs/TASKS.md`](docs/TASKS.md) — وضعیت batchها، اولویت‌ها و بدهی فنی
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — وضعیت فعلی و نکات تحویل
- [`docs/OTP_LAUNCH_READINESS.md`](docs/OTP_LAUNCH_READINESS.md) — Go/No-Go، envها و smoke test احراز هویت
- [`docs/RELEASING.md`](docs/RELEASING.md) — Docker، HTTPS، PWA/TWA و release
- [`docs/CI.md`](docs/CI.md) — سیاست CI، انتخاب E2E و طبقه‌بندی شکست
- [`docs/TRANSFORMATION_ROADMAP.md`](docs/TRANSFORMATION_ROADMAP.md) — سند تحول: ریسرچ رقبا و نقشه‌ی قابلیت‌های آینده
- [`docs/EXECUTION_ROADMAP.md`](docs/EXECUTION_ROADMAP.md) — آرشیو نقشه‌ی اجرایی قبلی
- [`docs/AI_API.md`](docs/AI_API.md) — قرارداد API تولید برنامه و analytics
- [`docs/AI_CHANGE_TEMPLATE.md`](docs/AI_CHANGE_TEMPLATE.md) — قالب گزارش تغییر و handoff
- [`docs/AI_DEVELOPMENT_SYSTEM.md`](docs/AI_DEVELOPMENT_SYSTEM.md) — سیستم توسعه‌ی خودکار اختصاصی Apex
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — توکن‌ها و قواعد UI
- [`docs/ASSETS.md`](docs/ASSETS.md) — asset pipeline، cache و offline
- [`docs/product/PRODUCT-VISION.md`](docs/product/PRODUCT-VISION.md) — ویژن سطح‌بالای محصول
- [`docs/product/WORKOUT-EXPERIENCE-V2.md`](docs/product/WORKOUT-EXPERIENCE-V2.md) — ویژن تجربه تمرین V2 (NOT YET IMPLEMENTED)
- [`docs/governance/DOCUMENTATION-GOVERNANCE.md`](docs/governance/DOCUMENTATION-GOVERNANCE.md) — قواعد governance مستندات + ترتیب مطالعه
- [`docs/adr/README.md`](docs/adr/README.md) — مکانیزم ثبت تصمیم‌های معماری (ADR)

## CI

Workflow اصلی در `.github/workflows/ci.yml` شامل install، Prisma، lint، typecheck، unit، build و E2Eهای هدفمند است. regression کامل در `.github/workflows/ci-full-e2e.yml` به‌صورت nightly یا دستی اجرا می‌شود.

هر تغییر auth، API، schema، env یا deployment باید مستندات مرتبط و تست مناسب خودش را هم‌زمان به‌روزرسانی کند.
