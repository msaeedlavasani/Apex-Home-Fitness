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
- **Batch 18:** بهبود ناوبری موبایل (تب «ترجیحات تمرین» در تب‌بارها، حذف دکمه بازگشت از صفحات تب، هدر مینیمال دسکتاپ در iOS)، یکپارچگی صفحه پروفایل، اصلاح نام برند فارسی «اپکس هوم فیتنس» + سند تحول (ریسرچ رقبا) — تکمیل شد.

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

## Batch 16: آمادگی استقرار روی سرور (Server-build readiness) 🧭
1. **[x] Feature flag OTP_AUTH_ENABLED (rollback یکفرمانی):** kill-switch برای ورود OTP و route protection (`src/lib/auth/mode.ts`) + ۸ تست unit + مستندسازی در `.env.example`. — تکمیل شد.
2. **[x] کاملکردن قرارداد env:** اسکن `process.env.*` کد در مقابل `.env.example`؛ مستندسازی `NEXT_PUBLIC_RELEASE`؛ تست enforce جدید در `otp-launch-readiness.test.ts` (۹ تست). — تکمیل شد.
3. **[x] Docker self-hosted deployment:** Dockerfile چندمرحلهای (deps→build→runner با standalone output + prisma engines) + docker-compose (SQLite volume + migrate service) + .dockerignore + بخش استقرار در `docs/RELEASING.md`؛ `output: 'standalone'` در next.config. — تکمیل شد.
4. **[x] production build با full env:** build با placeholder کامل envها (site URL، Supabase، SMS، release) سبز (۳۴/۳۴ صفحه). — تکمیل شد.
5. **[x] ممیزی Supabase و بهروزرسانی readiness:** وضعیت real در `OTP_LAUNCH_READINESS.md` ثبت شد (Prisma/SQLite برای دیتابیس، Supabase فقط Identity Provider).

## Batch 17: پروفایل، تاریخچه/آمار و بازتولید درجای برنامه 🎯 (تکمیل شد)
1. **[x] پروفایل کاربری کامل:** نمایش شماره موبایل ورود (با فرمت `+98 …`) در کارت پروفایل و بخش اطلاعات کاربری؛ آپلود/حذف آواتار؛ آخرین آیتم منوی کناری شدن پروفایل؛ خروج → لندینگ (نه کوییز)؛ هدر مستقل برای صفحه کوییز (خانه + تغییر زبان).
2. **[x] آواتار با Supabase Storage:** بایت‌ها در bucket خصوصی `avatars` با مسیر `<userId>.<ext>` (upsert)؛ `User.avatarUrl` مسیر شیء را نگه می‌دارد و خواندن‌ها signed URL کوتاه‌مدت (۷ روز) برمی‌گردانند؛ ردیف‌های قدیمی data URL بدون تغییر برگردانده می‌شوند؛ بدون env استوریج fallback به ذخیره‌ی data URL در DB (mock/dev). سرویس: `src/services/avatarStorage.ts` + ۱۳ تست.
3. **[x] چیدمان سایدبار و سربرگ:** حذف لوگوی بریده‌شده، دکمه «شروع تمرین» در پایین سایدبار، انتقال دکمه‌های زبان/تم به گوشه بالا (چپ در فارسی، راست در انگلیسی).
4. **[x] OTP TTL به ۱۵ دقیقه:** افزایش `OTP_CODE_TTL_MS` به ۹۰۰٬۰۰۰ms و همگام‌سازی `.env.example`، `docs/OTP_LAUNCH_READINESS.md` و تست‌ها.
5. **[x] تاریخچه و آمار:** تقویم ماهانه تعاملی (تیک سبز تمرین / نقطه خاکستری استراحت / نقطه قرمز جاافتاده؛ شمسی با شروع از شنبه در فارسی، میلادی در انگلیسی) و چارت‌های SVG دستی روند BMI و حجم هفتگی بدون وابستگی جدید.
6. **[x] بازتولید درجای برنامه:** `persistProgramForUser` به‌جای ردیف جدید، همان `Program` را به‌روزرسانی می‌کند (تاریخچه‌ی `WorkoutSession` و ارجاع‌ها حفظ می‌شوند، ردیف یتیم نمی‌ماند)؛ ویرایش روزهای استراحت (۱–۳ روز) در صفحه «ترجیحات تمرین»؛ ۳ تست regression در `tests/program-inplace-regeneration.test.ts`.
7. **[x] تست E2E پروفایل:** `tests/profile-features.spec.ts` — نمایش شماره + آپلود/حذف آواتار (مسیر full-auth با `E2E_REQUIRES_AUTH=1`) + گیتینگ signed-out همیشه‌اجرا.

## Batch 18: ناوبری موبایل، برند و سند تحول 🎯 (تکمیل شد)
1. **[x] دسترسی «ترجیحات تمرین» در موبایل:** افزودن Preferences به `APP_NAV` مشترک؛ تب‌بار iOS و اندروید به ۵ ستون، نوار پیلی موبایل و سایدبار دسکتاپ همگی ۵ آیتم مشترک دارند.
2. **[x] حذف دکمه بازگشت بی‌معنی:** صفحات تب (پروفایل، ترجیحات) دیگر `backHref` ندارند؛ دکمه بازگشت فقط برای صفحه‌های pushشده (FAQ، تمرین) می‌ماند.
3. **[x] هدر مینیمال دسکتاپ در موبایل:** دکمه‌های زبان/تم به بالای صفحه در iOS اضافه شد (مثل اندروید و وب موبایل).
4. **[x] یکپارچگی صفحه پروفایل:** حذف wrapper تمام‌عرض با پس‌زمینه جدا — عنوان و کارت‌ها روی یک سطح پیوسته.
5. **[x] اصلاح نام برند فارسی:** «اپکس فیتنس خانگی» → «اپکس هوم فیتنس» در سراسر `fa.json` (footer بدون نسخه، متادیتا، FAQ، اشتراک‌گذاری).
6. **[x] سند تحول (`docs/TRANSFORMATION_ROADMAP.md`):** ریسرچ رقبا (Hevy، Strong، Fitbod، Freeletics، MyFitnessPal، NTC، Strava و…) + جدول مقایسه امکانات + گپ‌ها + نقشه راه ۹ آیتمی. **آیتم ۱ (P0): ثبت پیشرفت (Progress Check-in)** — پاسخ مستقیم به درخواست «۳ روز تمرین کردم و ۱ کیلو کم کردم کجا وارد کنم؟»

## تسک‌های پیشنهادی بعدی (بعد از Batch 14) 🧭
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
