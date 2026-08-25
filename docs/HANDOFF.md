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
- **Deployment:** self-hosted Docker Compose؛ سرویس app روی پورت 3000
- **سرویس‌های همسایه روی سرور:** هنگام deploy فقط compose پروژه‌ی Apex را هدف بگیرید؛ از اجرای compose در مسیر پروژه‌های دیگر خودداری کنید.

## قراردادهای مهم

1. کدهای OTP در حالت live plaintext ذخیره یا log نمی‌شوند؛ فقط hash و metadata نگهداری می‌شود.
2. حالت mock production یک emergency/test mode است و برای کاربر واقعی ناامن است؛ هرکس کد ثابت را بداند می‌تواند با هر شماره‌ای وارد شود.
3. برای بازگشت به SMS واقعی، پس از تأیید قالب SMS.ir و اجرای smoke test رضایت‌دار، فلگ‌های mock را از environment production حذف کنید و کانتینر `app` را force-recreate کنید.
4. `SMS_IR_CODE_PARAMETER` باید با نام پارامتر قالب SMS.ir یکی باشد؛ مقدار فعلی `otp` است.
5. `SMS_IR_MONITOR_DELAY_MS` وضعیت تحویل را پس از ارسال بررسی می‌کند؛ مقدار صفر monitoring خودکار را خاموش می‌کند.

## مسیر توسعه

```text
Landing → Quiz → OTP login → Save quiz → Generate program → Dashboard
```

- صفحات در `src/app/[locale]` هستند.
- Route Handlerهای API در `src/app/api` هستند.
- منطق auth در `src/lib/auth` و `src/services/otpService.ts` قرار دارد.
- promptهای AI در `infra/ai/prompts` باید همراه build deploy شوند.
- migrationهای Prisma در `prisma/migrations` هستند؛ `prisma/ci.db` فایل تولیدی است و نباید commit شود.
- MUI فقط برای migration تدریجی در دسترس است؛ componentهای فعلی هنوز بازنویسی نشده‌اند.

## Validation قبل از merge

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e:auth
npm run test:e2e:smoke
```

برای تغییرات asset یا design، auditهای `npm run audit:assets` و `npm run audit:design` را هم اجرا کنید. regression کامل فقط برای release یا تغییرات پرریسک لازم است.

## استقرار سرور

1. از snapshot فعلی و environment production backup امن داشته باشید.
2. فقط در مسیر پروژه‌ی Apex، image را rebuild کنید.
3. migration را با compose همان پروژه اجرا کنید.
4. کانتینرهای Apex را recreate کنید؛ به compose پروژه‌های دیگر دست نزنید.
5. مسیرهای `/en`، `/fa`، `/manifest.json` و `/service-worker.js` را smoke کنید.
6. وضعیت کانتینرهای پروژه‌های دیگر را قبل و بعد مقایسه کنید.

روش و rollback کامل در [`RELEASING.md`](RELEASING.md) و چک‌لیست launch در [`OTP_LAUNCH_READINESS.md`](OTP_LAUNCH_READINESS.md) است.

## کارهای باز

- [ ] خاموش‌کردن mock OTP پیش از launch عمومی
- [ ] تأیید قالب 976440 در بخش ارسال سریع SMS.ir و smoke test واقعی با رضایت
- [ ] تنظیم دامنه و HTTPS و هماهنگ‌سازی `NEXT_PUBLIC_SITE_URL`
- [ ] جایگزینی fingerprint placeholder در `public/.well-known/assetlinks.json`
- [ ] تمرین rollback در staging
- [ ] اجرای smoke مرورگری Landing/Quiz در محیط دارای Chromium یا CI
- [ ] تصمیم نهایی درباره‌ی ادامه‌ی استفاده از MUI پس از migration آزمایشی یک primitive
- [ ] ارتقای مستقل به Next.js 16 بعد از launch، با regression کامل
