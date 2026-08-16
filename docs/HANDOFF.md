# مستند تحویل (Handoff) 🚀

## مختصات محیطی (Environment Context)
- **لینک ریپوزیتوری:** `https://github.com/msaeedlavasani/Apex-Home-Fitness.git`
- **مسیر workspace:* مسیر پروژه روی سیستم لوکال: /Users/msl/Documents/GitHub/Apex-Home-Fitness/docs
- **دسترسی گیت:** کلید SSH روی سیستم نصب و فعال است.
- **مرجع env:** `.env.example`؛ جزئیات API در `docs/AI_API.md` و انتشار در `docs/RELEASING.md` است.

## پروتکل توسعه (Development Workflow) 🛠️
روال اجباری اجرای هر بچ به این شکل است:
1. **انتخاب بچ (Batching):** دقیقاً ۵ تسکِ باز با بالاترین اولویت از `docs/TASKS.md` انتخاب می‌شود؛ تسک‌های تکمیل‌شده یا کم‌اولویت تا زمانی که تسک اولویت‌دار باز وجود دارد وارد بچ نمی‌شوند.
2. **تفویض موازی (Parallel Delegation):** هر ۵ تسک به ساب‌ایجنت‌ها (Sub-agents) دلیگیت می‌شود و ساب‌ایجنت‌ها باید تا جای ممکن کارها را موازی پیش ببرند؛ فقط وابستگی واقعی بین تسک‌ها می‌تواند اجرا را ترتیبی کند. شرح تسک، محدوده، معیار پذیرش و مسیر خروجی باید به‌صورت مستقل در اختیار هر ساب‌ایجنت قرار گیرد.
3. **بررسی، وریفای و مرج (Verify & Merge):** خروجی هر ساب‌ایجنت توسط ایجنت اصلی بررسی می‌شود، تست‌های مرتبط اجرا می‌شود، و فقط خروجی تأییدشده در شاخه اصلی مرج می‌شود. در صورت ریسک یا تغییر چندفایلی، وریفای مستقل نیز انجام می‌شود.
4. **به‌روزرسانی مستندات:** پس از مرج موفق، `docs/TASKS.md` و در صورت نیاز همین `HANDOFF.md` با وضعیت واقعی بچ به‌روزرسانی می‌شوند؛ تاریخچه batchها در `TASKS.md` است.
5. **انتشار (Deployment):** بعد از تکمیل هر ۵ تسک، وریفای نهایی و به‌روزرسانی مستندات، تغییرات به‌صورت یک‌باره commit و به گیت Push می‌شوند.
6. **تأیید قبل از بچ بعدی:** پس از تکمیل، وریفای، مستندسازی و Push هر بچ، ایجنت اصلی باید قبل از شروع بچ بعدی از کاربر تأیید بگیرد؛ تا قبل از تأیید، هیچ تسک جدیدی شروع یا دلیگیت نمی‌شود.
7. **شروع بچ بعدی:** فقط پس از تأیید صریح کاربر، ۵ تسک باز بعدی با بالاترین اولویت انتخاب و با همین چرخه موازی تکرار می‌شود.

## وضعیت فعلی پروژه (Current Status) 🟢
- **Batch 8 (Completed):** بهینه‌سازی عملکرد بصری، بازبینی سیستم طراحی (Audit)، سیستم پیشنهاد AI، بازبینی تولید TWA و SEO.
- **Batch 9 (Completed):** اعتبارسنجی Zod، محافظ‌های AI، Medical Disclaimer، تست‌های امنیتی و CI سخت‌گیرانه.
- **Batch 10 (Completed):** مقاوم‌سازی Workout Engine، تست‌های E2E آفلاین/RTL/کیبورد/ARIA، audit سیستم طراحی، مستندات API و pipeline کامل E2E در CI.
- **Batch 11 (Completed):** Rate Limit چنداینستنسی، idempotency، timeout persistence، تست gamification و conflict resolution آفلاین.
- **Batch 12 (Completed):** چندهدفه‌کردن کوییز، انتخاب روزهای استراحت، رفع PostCSS localhost، responsive/RTL و asset pipeline آفلاین.
- **Batch 13 (Completed):** empty-stateهای History/Analytics، فونت self-hosted Vazirmatn، یکپارچه‌سازی Profile با sidebar/back، route دوزبانه FAQ و ترتیب روزهای فارسی.
- **Runtime:** Node.js `>=22.0.0` در `package.json` و `.nvmrc` ثبت شده؛ verification با Node `v24.18.0` موفق بوده است.
- **Verification Batch 13:** full unit suite با نتیجه 207/207 و E2Eهای متمرکز با نتیجه 51/51 موفق شدند؛ typecheck و asset audit نیز PASS هستند.
- **Batch 14 (Implementation Completed):** adapter امن SMS.ir، OTP lifecycle/session، Landing→Quiz→OTP→save→generate→Dashboard، auth UI/route protection و readiness checklist تکمیل شدند.
- **Batch 14 Verification:** full unit suite با نتیجه 319/319، typecheck، production build، asset audit، auth mock E2E با نتیجه 12/12 و main-flows E2E با نتیجه 8/8 موفق شدند؛ keyboard/RTL نیز standalone با نتیجه 17/17 موفق است.
- **Production Go مشروط:** هیچ SMS واقعی یا external system در این batch لمس نشده است. قبل از لانچ باید `SMS_IR_API_KEY`، `SMS_IR_TEMPLATE_ID`، Supabase URL/anon/service-role، دامنه HTTPS، redirectها و template فعال تنظیم شوند و smoke test واقعی با شماره رضایت‌دار اجرا شود.
- **تصمیم Next.js:** ارتقای Next.js به 16.3.1 به‌عنوان migration مستقل و بعد از launch در backlog ثبت شده؛ برای این batch انجام نمی‌شود.
- **تمرکز بعدی:** ابتدا production smoke و go/no-go لانچ؛ سپس انتخاب تسک‌های بعدی از backlog. هیچ migration Next.js یا بچ جدیدی بدون تأیید شروع نمی‌شود.

## نکات کلیدی برای ایجنت بعدی
1. **دسترسی به فایل‌ها:** ریشه اصلی پروژه `/Users/msl/Documents/GitHub/Apex-Home-Fitness` است.
2. **مستندات:** تمام فایل‌های راهنما در پوشه `docs/` هستند.
3. **هوش مصنوعی:** موتور AI در `src/app/api/generate-program/route.ts` قرار دارد.
4. **توصیه‌های Batch 9:** اولویت با اعتبارسنجی Zod، اعمال Rate Limit برای AI و ایمنی محتوا (Medical Disclaimer) است.
