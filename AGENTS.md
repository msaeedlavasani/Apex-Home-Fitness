# Apex Home Fitness — AI Engineering Standard

> نسخه ۱ — قوانین رفتار agentهای توسعه در این ریپو

این فایل روش کار agent را تعیین می‌کند؛ معماری کامل، قوانین بصری و قراردادهای عملیاتی در اسناد تخصصی `docs/` قرار دارند.

## 1. اولویت منابع

در تعارض اطلاعات، این ترتیب را رعایت کن:

1. کد و configuration فعلی
2. `package.json` و manifestها
3. `AGENTS.md`
4. `docs/DESIGN_SYSTEM.md` برای کارهای frontend
5. مستندات عملیاتی و معماری مرتبط
6. manifest، backlog اجرایی و handoff
7. فرضیات عمومی یا مستندات تاریخی

وضعیت هر ادعا را با یکی از این برچسب‌ها مشخص کن: `CURRENT`، `TARGET`، `CONSTRAINT`، `DEBT` یا `UNKNOWN`.

## 2. حالت‌های کار

### PLAN

برای feature چندفایلی، refactor، تغییر معماری، dependency، auth، database، AI یا redesign بزرگ، ابتدا repository را بررسی و یک plan کوتاه ارائه کن.

### EXECUTE

فقط وقتی کاربر صریحاً اجرای تغییر را خواسته باشد. حتی در این حالت نیز تغییر را محدود نگه دار و از redesign یا dependency غیرضروری خودداری کن.

## 3. اصل کمترین تغییر

همیشه این ترتیب را دنبال کن:

```text
reuse → extend → compose → create
```

قبل از ساخت component، hook، service، utility یا abstraction، نمونه‌ی موجود را جست‌وجو کن. تغییرات قبلی کاربر را حفظ کن و فایل نامرتبط را دست‌کاری نکن.

## 4. مرزهای معماری Apex

- UI در `src/app` و `src/components` است.
- منطق reusable در `src/lib` و سرویس‌های domain در `src/services` است.
- persistence از Prisma/SQLite استفاده می‌کند.
- Identity/session با Supabase SSR انجام می‌شود.
- promptهای AI در `infra/ai/prompts` versioned هستند.
- کد server-only نباید به Client Component یا middleware نشت کند.
- routeهای `en` و `fa` باید هر دو حفظ شوند.

هر تغییر در auth، schema، env، AI safety، deployment یا package boundary نیازمند توجه معماری و rollback است.

## 5. قوانین امنیتی

- secretها را نخوان، چاپ نکن و commit نکن.
- OTP plaintext را log، response عمومی یا مستند نکن.
- ورودی کاربر را untrusted فرض کن و validation موجود را reuse کن.
- mock OTP production فقط emergency mode است و بدون تأیید انسانی نباید برای launch عمومی باقی بماند.
- هر deployment فقط compose پروژه‌ی Apex را هدف بگیرد؛ سرویس‌های همسایه نباید لمس شوند.

## 6. قواعد UI

برای frontend از `docs/DESIGN_SYSTEM.md` پیروی کن:

- tokenهای semantic موجود را به رنگ hard-coded ترجیح بده.
- RTL و LTR، حداقل viewport 360px، contrast و keyboard را حفظ کن.
- برای loading، empty، error، disabled، focus و success state تصمیم مشخص داشته باش.
- آیکون‌های موجود و componentهای shared را reuse کن.
- reduced motion را رعایت کن.
- هر redesign باید دامنه‌ی محدود و baseline قابل مقایسه داشته باشد.

## 7. Validation

ابتدا narrowest validation مربوط به تغییر را اجرا کن و سپس در صورت نیاز گسترده‌تر کن:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

برای تغییرات UI یا asset، auditها و E2E مرتبط را نیز اجرا کن. هرگز موفقیت validation را بدون اجرای واقعی اعلام نکن.

## 8. مستندات

- `AGENTS.md`: رفتار و workflow agent — AUTHORITATIVE
- `docs/AI_DEVELOPMENT_SYSTEM.md`: فرایند/workflow سیستم توسعه‌ی خودکار (مکمل؛ در تعارض AGENTS.md مقدم است)
- `docs/governance/DOCUMENTATION-GOVERNANCE.md`: قواعد governance مستندات + ترتیب مطالعه‌ی الزامی agent (§۵)
- `docs/INDEX.md`: نقشه‌ی منبع حقیقت مستندات
- `docs/DESIGN_SYSTEM.md`: قوانین بصری
- `README.md`: onboarding و نمای کلی
- `docs/`: دانش پایدار، عملیات و قراردادها
- `docs/TASKS.md`: تنها backlog اجرایی canonical؛ تاریخچه در Git/اسناد historical
- `docs/adr/`: تصمیم‌های معماری (مکانیزم)

قبل از تغییر، ترتیب مطالعه‌ی §۵ `docs/governance/DOCUMENTATION-GOVERNANCE.md` را دنبال کن و از ایجاد سند موازی خودداری کن؛ ابتدا canonical home موجود را پیدا کن و فقط اطلاعات durable را مستند کن.

## 9. گزارش پایان کار

هر پاسخ نهایی باید خلاصه کند:

- Changed — فایل‌ها و تغییرات
- Validation — تست‌هایی که واقعاً اجرا شدند
- Risks / Limitations — موارد تأییدنشده یا بدهی باقی‌مانده
- Follow-up — فقط کار واقعاً لازم

قاعده‌ی نهایی:

```text
Inspect first. Reuse before creating. Plan before changing. Verify before claiming.
```
