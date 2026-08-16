# مرجع اصلی وضعیت، تسک‌ها و تاریخچه بچ‌ها 📋

این فایل مرجع واحد وضعیت کارها، بدهی فنی و تاریخچه batchهاست. روند اجرای هر batch در `docs/HANDOFF.md` و چک‌لیست انتشار در `docs/RELEASING.md` نگهداری می‌شود.

## وضعیت batchها

- **Batch 8:** بهینه‌سازی بصری، Design System، پیشنهاد AI، TWA و SEO — تکمیل شد.
- **Batch 9:** Zod، محافظ‌های AI، Medical Disclaimer، تست امنیتی و CI سخت‌گیرانه — تکمیل شد.
- **Batch 10:** Workout Engine، تست‌های E2E، Design System audit، مستندات API و CI E2E — تکمیل شد.
- **Batch 11:** Rate Limit مشترک، idempotency، timeout persistence، تست gamification و conflict resolution آفلاین — تکمیل شد.
- **Batch 12:** چندهدفه‌کردن کوییز، انتخاب روزهای استراحت، رفع استایل localhost، responsive/RTL و سامان‌دهی asset pipeline — تکمیل شد.
- **Batch 13:** empty-state History/Analytics، فونت Vazirmatn، پوسته Profile، route دوزبانه FAQ و ترتیب روزهای فارسی — تکمیل شد.
- **Batch 14:** Auth/OTP با SMS.ir، اتصال Quiz به حساب، محافظت routeها و ابزار readiness — implementation تکمیل شد؛ launch واقعی هنوز به smoke test production وابسته است.
- **Batch 15:** زبان‌سوییچر سراسری EN/FA (حفظ مسیر، رادیو-گروپ اکسسبل، ۴۴px) و enforce قطعی روزهای استراحت در تولید برنامه (persistence-level + regression) — تکمیل شد.

## Batch 14: احراز هویت OTP و آمادگی لانچ 🔴 (Implementation تکمیل شد؛ Production Go مشروط)
> ترتیب محصول قطعی: **Landing → Quiz → Login / Sign up با OTP → Save quiz response → Generate program → Dashboard**.
> منبع provider: [SMS.ir REST API](https://sms.ir/rest-api/)؛ endpoint رسمی OTP: `POST https://api.sms.ir/v1/send/verify` با `X-API-KEY`، `mobile`، `templateId` و `parameters`.

1. **[x] ساخت adapter امن OTP با SMS.ir:** server-only، timeout، اعتبارسنجی شماره، redaction، مدیریت 401/429/5xx، cooldown/rate limit و تست provider.
2. **[x] پیاده‌سازی verify OTP و session حساب:** کد hash‌شده، expiry، single-use، attempt limit و اتصال fail-closed به Supabase Auth/SSR؛ بدون service-role در client.
3. **[x] اتصال Landing تا Dashboard با OTP:** Landing دوزبانه، draft کوییز با expiry، OTP handoff، save idempotent، generation idempotent و redirect به Dashboard.
4. **[x] افزودن auth UI و route protection:** routeهای دوزبانه OTP، refresh session، logout، public-route allowlist و محافظت dashboard/workout/history/analytics/challenges/profile.
5. **[x] آماده‌سازی production و smoke test OTP:** env contract، checklist، readiness guard، mock smoke و go/no-go مستند شد (مستند در `docs/OTP_LAUNCH_READINESS.md`). **Go نهایی production هنوز فقط پس از ثبت credentialهای واقعی، template فعال SMS.ir، تنظیم Supabase/domain و smoke test HTTPS با شماره رضایت‌دار صادر می‌شود.**

## Batch 13: داده، تایپوگرافی و navigation دوزبانه 🎯 (تکمیل شد)
1. **[x] empty-state data cards برای History و Analytics:** کارت‌های داده، skeleton و empty-state دوزبانه با fallback امن برای نبود داده/خطای backend.
2. **[x] اعمال فونت Vazirmatn:** فونت self-hosted با `next/font/local`، asset audit، CSP same-origin و سازگاری offline/PWA.
3. **[x] sidebar و back در Profile:** اتصال Profile به AppShell، sidebar/mobile navigation و Back قابل‌دسترسی در desktop/mobile و en/fa.
4. **[x] رفع ۴۰۴ FAQ:** route دوزبانه FAQ، metadata، محتوای ترجمه‌شده و اتصال navigation/Profile.
5. **[x] اصلاح ترتیب روزهای کوییز فارسی:** نمایش شنبه تا جمعه با حفظ canonical IDs و server contract.

## Batch 12: تجربه کوییز و کیفیت رابط کاربری 🎯 (تکمیل شد)
1. **[x] انتخاب چند هدف در کوییز:** پشتیبانی UI، schema، prompt و persistence از آرایه اهداف.
2. **[x] انتخاب روزهای استراحت:** انتخاب روزهای هفته در کوییز و enforce شدن در برنامه تولیدشده.
3. **[x] رفع استایل localhost:** انتقال پیکربندی PostCSS به ریشه و رفع نمایش HTML خام در dev.
4. **[x] responsive و RTL:** تثبیت layout، navigation، focus و touch target در viewportهای اصلی.
5. **[x] Unified Asset Pipeline:** یکدست‌سازی resolution، fallback و policy کش assetها (مستند در `docs/ASSETS.md`؛ SW precache اصلاح شد، `offline.html` اضافه شد، audit خودکار در `scripts/audit-assets.mjs` + `tests/asset-audit.test.ts`).

## تسک‌های پیشنهادی بعدی (بعد از Batch 14) 🧭
1. **[x] افزودن language switcher سراسری:** سوییچر EN/FA در sidebar دسکتاپ، هدر موبایل و Android AppBar با حفظ مسیر فعلی (`/en/workout` → `/fa/workout`)؛ رادیو-گروپ اکسسبل با focus ring و touch target ≥44px؛ messages دوزبانه و ۴ تست unit. — تکمیل شد (Batch 15).
2. **[x] enforce قطعی روزهای استراحت:** جلوگیری از قرارگرفتن تمرین در روزهای انتخابی در خروجی تولیدشده — enforce در `enforceRestDays` + لایه persistence (`programService`) + پین کردن قرارداد روز در پرامپت؛ پشتیبانی نام فارسی روزها (شنبه→جمعه) و fallback عددی ISO؛ ۱۲ تست regression + تست زنجیره retry/idempotency. — تکمیل شد (Batch 15).
3. **[ ] ارتقای Next.js به 16.3.1:** migration مستقل با codemod، async APIs، proxy/Turbopack و regression کامل — بعد از launch (طبق تصمیم هنداف).

## اولویت ۱: امنیت، اعتبار و ایمنی (MVP Ready) 💎 🔴
1. **[x] اعتبارسنجی API با Zod:** پیاده‌سازی Schema برای تمامی فیلدهای `generate-program`.
2. **[x] محافظ‌های AI و Rate Limit:** اعمال سقف درخواست روزانه و مدیریت هم‌زمانی (Concurrency).
3. **[x] ایمنی محتوا و سلب مسئولیت:** افزودن هشدارهای پزشکی برای شرایط پرخطر و Disclaimer.
4. **[x] سخت‌گیرانه کردن CI Pipeline:** حذف `continue-on-error` و یکپارچه‌سازی تست‌های E2E.
5. **[x] افزودن unit/API tests مستقل برای مسیرهای امنیتی.**
6. **[x] مقاوم‌سازی Workout Engine:** همگام‌سازی تایمر در Background و ذخیره‌سازی وضعیت در IndexedDB.

## اولویت ۲: پایداری و بهبود تجربه کاربری 🚀 🟡
1. **[x] گسترش پوشش تست:** افزودن تست‌های آفلاین، RTL، و ناوبری کیبورد.
2. **[x] یکپارچه‌سازی نهایی Design System:** بازبینی توکن‌های Semantic و تست Dynamic Type.
3. **[x] مستندسازی API:** تکمیل داکیومنت‌های داخلی برای Routeهای هوش مصنوعی.
4. **[x] اجرای کامل E2E در CI با secrets و runtime مستندشده.
5. **[x] مقاوم‌سازی Rate Limit برای محیط چنداینستنسی با storage مشترک.
6. **[x] اضافه‌کردن idempotency برای جلوگیری از ثبت برنامه تکراری.
7. **[x] پوشش timeout برای عملیات دیتابیس و persistence.

---

## تسک‌های انجام شده (Done) ✅
- [x] سیستم طراحی چندپلتفرمی v2.0 (iOS/Android/Web)
- [x] زیرساخت دوزبانه پیشرفته (RTL/LTR)
- [x] سیستم گیمیفیکیشن و پاداش (XP & Badges)
- [x] بخش چالش‌های اجتماعی و اشتراک‌گذاری
- [x] کتابخانه ویدئویی پیشرفته و پلیر HLS
- [x] بهینه‌سازی نهایی دیتابیس (Composite Indexes)
- [x] مانیتورینگ خطا و رویدادهای تحلیلی
- [x] موتور هوشمند تمرین و مدیریت آفلاین
- [x] زیرساخت PWA و TWA
- [x] بهینه‌سازی بصری و انیمیشن‌ها (Batch 8)
- [x] سیستم پیشنهاد هوشمند AI بر اساس تاریخچه (Batch 8)
- [x] بازبینی سیستم طراحی و توکن‌های UI (Batch 8)
- [x] تست تولید TWA و سئو (Batch 8)

## بدهی‌های فنی (Technical Debt) ⚠️
1. **[x] Unified Asset Pipeline:** مسیر asset، fallback آفلاین، CSP/cache policy و audit خودکار در `docs/ASSETS.md`.
2. **[x] Advanced Conflict Resolution:** policy قطعی تعارض، merge، retry و idempotency برای همگام‌سازی آفلاین.
3. **[x] Unit Test Coverage:** پوشش unit برای منطق‌های XP، level، streak، badge و reward در `gamificationService`.
