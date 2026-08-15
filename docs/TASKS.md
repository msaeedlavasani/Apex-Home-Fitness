# مرجع اصلی وضعیت، تسک‌ها و تاریخچه بچ‌ها 📋

این فایل مرجع واحد وضعیت کارها، بدهی فنی و تاریخچه batchهاست. روند اجرای هر batch در `docs/HANDOFF.md` و چک‌لیست انتشار در `docs/RELEASING.md` نگهداری می‌شود.

## وضعیت batchها

- **Batch 8:** بهینه‌سازی بصری، Design System، پیشنهاد AI، TWA و SEO — تکمیل شد.
- **Batch 9:** Zod، محافظ‌های AI، Medical Disclaimer، تست امنیتی و CI سخت‌گیرانه — تکمیل شد.
- **Batch 10:** Workout Engine، تست‌های E2E، Design System audit، مستندات API و CI E2E — تکمیل شد.
- **Batch 11:** Rate Limit مشترک، idempotency، timeout persistence، تست gamification و conflict resolution آفلاین — تکمیل شد.
- **Batch 12:** چندهدفه‌کردن کوییز، انتخاب روزهای استراحت، رفع استایل localhost، responsive/RTL و سامان‌دهی asset pipeline — تکمیل شد.

## Batch 12: تجربه کوییز و کیفیت رابط کاربری 🎯 (تکمیل شد)
1. **[x] انتخاب چند هدف در کوییز:** پشتیبانی UI، schema، prompt و persistence از آرایه اهداف.
2. **[x] انتخاب روزهای استراحت:** انتخاب روزهای هفته در کوییز و enforce شدن در برنامه تولیدشده.
3. **[x] رفع استایل localhost:** انتقال پیکربندی PostCSS به ریشه و رفع نمایش HTML خام در dev.
4. **[x] responsive و RTL:** تثبیت layout، navigation، focus و touch target در viewportهای اصلی.
5. **[x] Unified Asset Pipeline:** یکدست‌سازی resolution، fallback و policy کش assetها (مستند در `docs/ASSETS.md`؛ SW precache اصلاح شد، `offline.html` اضافه شد، audit خودکار در `scripts/audit-assets.mjs` + `tests/asset-audit.test.ts`).

## تسک‌های پیشنهادی بعدی (Batch 13 candidates) 🧭
1. **[ ] ساخت empty-state data cards برای History و Analytics:** نمایش باکس‌های داده، skeleton و empty-state دوزبانه حتی بدون داده.
2. **[ ] اعمال فونت Vazirmatn:** استفاده از فونت وزیر در تمام صفحات فارسی با حفظ stack انگلیسی.
3. **[ ] افزودن sidebar و back به Profile:** یکپارچه‌سازی پوسته پروفایل در en/fa و desktop/mobile.
4. **[ ] رفع ۴۰۴ FAQ:** ساخت route دوزبانه FAQ و اتصال لینک Profile.
5. **[ ] اصلاح ترتیب روزهای کوییز فارسی:** شنبه، یکشنبه، دوشنبه، سه‌شنبه، چهارشنبه، پنجشنبه، جمعه.
6. **[ ] افزودن language switcher سراسری:** نمایش آیکون/دو پرچم کوچک در همه صفحات با حفظ مسیر locale.
7. **[ ] enforce قطعی روزهای استراحت:** جلوگیری از قرارگرفتن تمرین در روزهای انتخابی، با regression پنجشنبه/جمعه در هر دو locale.

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
