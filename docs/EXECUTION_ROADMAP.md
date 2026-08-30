# نقشه راه اجرایی Apex Home Fitness

> ## 🗄️ ARCHIVED — آرشیو (فقط مرجع تاریخی)
> این سند از برنامه‌ریزی اجرایی قبلی (workstreamهای MUI/OTP/baseline) آرشیو شده است.
> **جانشین‌ها:** advisory محصول در
> [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) و تنها backlog اجرایی
> در [`TASKS.md`](TASKS.md) نگهداری می‌شود؛ تاریخچهٔ کامل در Git و گزارش‌های
> durable است. محتوای زیر فقط evidence تاریخی است و مرجع برنامه‌ریزی نیست.

> وضعیت: ARCHIVED · نسخه ۱ · این سند برنامه‌ریزی است و به‌تنهایی رفتار runtime را تغییر نمی‌دهد.

## هدف

پروژه باید قبل از بهبود گسترده‌ی UI، از نظر امنیت OTP، پایداری dependencyها، انتشار و baseline بصری به وضعیت قابل‌اندازه‌گیری برسد. هر workstream branch مستقل دارد و هیچ خروجی بدون verification وارد `main` نمی‌شود.

## ترتیب اولویت

### P0 — ایمنی و release

1. **تعیین تکلیف MUI**
   - **CURRENT:** MUI `9.3.1` و Emotion در dependency tree هستند و `MuiProvider` بدون `CssBaseline` در layout فعال است.
   - MUI فعلاً foundation آزمایشی است؛ صفحات legacy همچنان از Tailwind/CSS tokens استفاده می‌کنند و migration component واقعی انجام نشده است.
   - هر migration بعدی باید در branch مستقل و با یک primitive کم‌ریسک شروع شود؛ Dialog، Grid، Stepper و فرم auth فعلاً خارج از scope هستند.

2. **OTP production readiness**
   - کد mock فقط برای محیط آزمایشی و خارج از مستندات/لاگ مجاز است.
   - قبل از launch عمومی، mock خاموش، قالب `976440` و پارامتر `otp` تأیید، و smoke test واقعی با شماره‌ی رضایت‌دار اجرا شود.
   - plaintext OTP نباید در log، response عمومی یا گزارش‌ها ثبت شود.

3. **Branch protection**
   - جلوگیری از force-push و deletion روی `main`.
   - اجباری‌کردن CI سبز پیش از merge.
   - تنظیم approval برای تغییرات حساس.

### P1 — baseline و UI

4. **Baseline بصری**
   - صفحات: Landing، Quiz، Auth، Dashboard و Workout.
   - هر دو locale، viewport حداقل 360px، light/dark، loading/empty/error و keyboard.
   - مشکلات قبل از redesign ثبت شوند.

5. **Redesign محدود Landing و Quiz**
   - hierarchy، typography، spacing، CTA، progress، فرم‌ها و RTL.
   - حفظ مسیر Landing → Quiz → Auth.
   - تغییرات پراکنده یا redesign کل اپ ممنوع.

6. **MUI migration آزمایشی**
   - فقط پس از تصمیم task 1.
   - یک primitive کم‌ریسک، ترجیحاً Button یا Input.
   - Dialog، Grid، Stepper و auth form فعلاً خارج از scope.

### P2 — کیفیت و migrationهای بعدی

7. **Dependency hygiene**
   - audit خواندنی و دسته‌بندی vulnerabilityها.
   - عدم اجرای `npm audit fix --force`.
   - حذف dependency فقط پس از اثبات unused بودن.

8. **CI و lint quality**
   - رفع warningهای موجود بدون تغییر غیرمرتبط.
   - اضافه‌کردن بررسی docs/env/generated artifacts در صورت نیاز.

9. **Next.js 16**
   - بعد از تثبیت production و فقط در branch مستقل.
   - migration APIهای async، route/proxy، build و E2E کامل.

## مدل delegation

### Workstream A — dependency و SSR

- محدوده: `package.json`، lockfile، `src/components/providers/MuiProvider.tsx`، `src/lib/ui/` و layout فقط در صورت نیاز.
- خروجی: تصمیم نگه‌داری/حذف MUI، diff محدود، build و smoke report.
- وابستگی: هیچ‌کدام؛ اولویت بالا.

### Workstream B — auth و release

- محدوده: `src/lib/auth/`، `src/services/`، docs readiness و تست‌های auth.
- ممنوع: deploy یا تغییر secret بدون تأیید انسانی.
- خروجی: readiness report، rollback و تست regression.
- وابستگی: دسترسی و تأیید production برای تغییر environment.

### Workstream C — governance و CI

- محدوده: workflowها، مستندات release و تنظیمات repository.
- خروجی: branch protection proposal و CI matrix.
- وابستگی: دسترسی GitHub برای اعمال policy؛ کد runtime را تغییر ندهد.

### Workstream D — visual baseline

- محدوده: تست‌ها، گزارش baseline و در صورت تأیید، فایل‌های UI مسیر انتخاب‌شده.
- خروجی: before/after، فهرست مشکلات و بررسی RTL/responsive/accessibility.
- وابستگی: نتیجه‌ی MUI برای migration component.

### Workstream E — quality و docs

- محدوده: docs canonical، audit scripts، warningهای lint و تست‌های کم‌ریسک.
- خروجی: لینک‌های معتبر، docs consistency و validation report.
- وابستگی: می‌تواند موازی با A و D اجرا شود.

## قوانین ادغام

برای هر workstream:

1. branch مستقل از `main` به‌روز؛
2. scope و فایل‌های مجاز مشخص؛
3. حفظ تغییرات قبلی و عدم reset/clean؛
4. گزارش invariantها، ریسک و rollback؛
5. اجرای narrow validation توسط اجراکننده؛
6. اجرای validation مستقل توسط maintainer؛
7. بررسی diff و تداخل؛
8. PR و merge فقط بعد از CI سبز.

## ماتریس موازی‌سازی

| Workstream | قابل اجرا هم‌زمان با | نباید هم‌زمان merge شود با |
|---|---|---|
| A MUI | B، C، E | D migration component |
| B OTP | A، C، D baseline | deployهای نامرتبط روی همان سرور |
| C Governance | A، B، D، E | ندارد |
| D Baseline | A، B، C، E | migration گسترده MUI |
| E Quality/Docs | همه | تغییرات خارج از scope |

## Definition of Done

- رفتار موجود بدون regression حفظ شده؛
- typecheck، test، lint و build متناسب با scope سبز؛
- برای UI، هر دو locale و viewportهای اصلی بررسی شده؛
- برای auth/infra، rollback و اثر روی سرویس‌های همسایه مستند شده؛
- secrets در diff، log و docs نیستند؛
- docs index، handoff و task status هم‌راستا هستند؛
- تغییرات فقط پس از review وارد `main` شده‌اند.

## وضعیت فعلی

- `CURRENT`: Next.js 15.5.23، React 18، Prisma/SQLite، Supabase SSR، Tailwind/CSS tokens و MUI `9.3.1` به‌صورت foundation آزمایشی.
- `CONSTRAINT`: production فعلاً mock OTP با کد ثابت دارد و برای launch عمومی مناسب نیست؛ این task آن را تغییر نمی‌دهد.
- `CURRENT`: Landing و Quiz به‌صورت محدود polish شده‌اند و مسیر فعلی/منطق draft حفظ شده است.
- `TARGET`: baseline گسترده‌تر، migration آزمایشی یک primitive MUI و سپس تصمیم نهایی درباره‌ی ادامه‌ی استفاده.
- `DEBT`: اجرای E2E مرورگری محلی به نصب Chromium نیاز دارد؛ CI باید smoke مسیر Landing/Quiz را تأیید کند.
