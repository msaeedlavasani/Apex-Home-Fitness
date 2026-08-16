# مستند تحویل (Handoff) 🚀

## مختصات محیطی (Environment Context)
- **لینک ریپوزیتوری:** `https://github.com/msaeedlavasani/Apex-Home-Fitness.git`
- **مسیر workspace:* مسیر پروژه روی سیستم لوکال: /Users/msl/Documents/GitHub/Apex-Home-Fitness/docs
- **دسترسی گیت:** کلید SSH روی سیستم نصب و فعال است.
- **مرجع env:** `.env.example`؛ جزئیات API در `docs/AI_API.md` و انتشار در `docs/RELEASING.md` است.

## Blocker فوری قبل از هر Batch: شکست CI در مرحله Build 🔴

> **دستور قطعی برای ایجنت بعدی:** قبل از اجرای Workflow Repair Gate، انتخاب Batch یا شروع هر تسک محصولی، شکست build را بررسی و رفع کن. این blocker هنوز حل‌شده فرض نمی‌شود.

### وضعیت ثبت‌شده

- اجرای CI مربوط به commit `ea86ad8` (`Document workflow repair gate and E2E policy`) در job `build` با `exit code 1` شکست خورده است.
- طبق گزارش کاربر، commit قبلی `77f721d` (`Implement SMS.ir OTP authentication flow`) نیز در مرحله‌ی build شکست داشته است؛ لاگ دقیق هر دو اجرا باید از GitHub Actions خوانده شود.
- در اجرای `ea86ad8`، job `e2e` به‌دلیل وابستگی `needs: build` اصلاً اجرا نشده است.
- علت واقعی build failure هنوز مشخص نیست؛ از روی status screenshot نمی‌توان آن را به اصلاحات Workflow Repair، auth، Next.js یا dependency خاصی نسبت داد.

### معیار پذیرش blocker build

- [ ] لاگ کامل job `build` برای `77f721d` و `ea86ad8` بررسی و علت ریشه‌ای هر دو مشخص شود.
- [ ] مشخص شود شکست‌ها یک علت مشترک دارند یا دو failure مستقل هستند.
- [ ] build در محیط مشابه CI با Node 22، `DATABASE_URL=file:./ci.db` و migrationهای Prisma بازتولید یا ردگیری شود.
- [ ] علت ریشه‌ای با کمترین تغییر امن اصلاح شود؛ اصلاحات حدسی یا upgrade غیرمرتبط انجام نشود.
- [ ] `npm ci`، Prisma generate/migrate، lint، typecheck، unit tests و `npm run build` در محیط CI-like سبز شوند.
- [ ] پس از اصلاح، یک push آزمایشی/commit اصلاحی CI را تا پایان job `build` اجرا کند؛ فقط بعد از PASS شدن build وارد Workflow Repair Gate شو.
- [ ] اگر علت به external secret، GitHub Actions configuration یا production environment وابسته است، blocker و مقدار/تنظیم لازم دقیق مستند شود و secret واقعی در repo قرار نگیرد.

### رابطه با اصلاحات Workflow Repair

اصلاحات قبلی Workflow Repair فقط isolation، validation policy، targeted E2E و auth coverage را هدف می‌گیرند و **به‌تنهایی ثابت نمی‌کنند build سالم است**. تا زمانی که build هر دو commit بررسی و یک build سبز روی commit اصلاحی ثبت نشده، هیچ Batch جدیدی شروع نشود.

## پروتکل توسعه (Development Workflow) 🛠️
روال اجباری اجرای هر بچ به این شکل است:
1. **انتخاب بچ (Batching):** دقیقاً ۵ تسکِ باز با بالاترین اولویت از `docs/TASKS.md` انتخاب می‌شود؛ تسک‌های تکمیل‌شده یا کم‌اولویت تا زمانی که تسک اولویت‌دار باز وجود دارد وارد بچ نمی‌شوند.
2. **تفویض موازی (Parallel Delegation):** هر ۵ تسک به ساب‌ایجنت‌ها (Sub-agents) دلیگیت می‌شود و ساب‌ایجنت‌ها باید تا جای ممکن کارها را موازی پیش ببرند؛ فقط وابستگی واقعی بین تسک‌ها می‌تواند اجرا را ترتیبی کند. شرح تسک، محدوده، معیار پذیرش و مسیر خروجی باید به‌صورت مستقل در اختیار هر ساب‌ایجنت قرار گیرد.
3. **بررسی، وریفای و مرج (Verify & Merge):** خروجی هر ساب‌ایجنت توسط ایجنت اصلی بررسی می‌شود، تست‌های مرتبط اجرا می‌شود، و فقط خروجی تأییدشده در شاخه اصلی مرج می‌شود. در صورت ریسک یا تغییر چندفایلی، وریفای مستقل نیز انجام می‌شود.
4. **به‌روزرسانی مستندات:** پس از مرج موفق، `docs/TASKS.md` و در صورت نیاز همین `HANDOFF.md` با وضعیت واقعی بچ به‌روزرسانی می‌شوند؛ تاریخچه batchها در `TASKS.md` است.
5. **انتشار (Deployment):** بعد از تکمیل هر ۵ تسک، وریفای نهایی و به‌روزرسانی مستندات، تغییرات به‌صورت یک‌باره commit و به گیت Push می‌شوند.
6. **تأیید قبل از بچ بعدی:** پس از تکمیل، وریفای، مستندسازی و Push هر بچ، ایجنت اصلی باید قبل از شروع بچ بعدی از کاربر تأیید بگیرد؛ تا قبل از تأیید، هیچ تسک جدیدی شروع یا دلیگیت نمی‌شود.
7. **شروع بچ بعدی:** فقط پس از تأیید صریح کاربر، ۵ تسک باز بعدی با بالاترین اولویت انتخاب و با همین چرخه موازی تکرار می‌شود.
8. **Validation مرحله‌ای:** sub-agent قبل از تحویل، typecheck/lint و تست‌های affected را اجرا می‌کند؛ main agent قبل از E2E، scope/conflict/contract را بررسی می‌کند؛ ترتیب استاندارد `static → unit → integration/API → targeted E2E → full E2E` است.
9. **E2E policy:** full E2E برای release و تغییرات high-risk اجباری است؛ برای debugging عادی فقط targeted E2E اجرا می‌شود و بعد از failure، قبل از rerun failure classification انجام می‌شود.
10. **Isolation policy:** sub-agentهای موازی نباید workspace مشترک یا فایل مشترک را هم‌زمان بازنویسی کنند؛ worktree/branch جدا یا اجرای ترتیبی گروه‌های دارای overlap الزامی است.
11. **CI auth coverage:** مسیر auth mock باید در CI فعال و از silent skip جلوگیری شود؛ provider واقعی فقط در staging/manual/nightly با secretهای محافظت‌شده اجرا می‌شود.

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
- **Batch 15 (Completed):** زبان‌سوییچر سراسری EN/FA (حفظ مسیر، رادیو-گروپ اکسسبل، ۴۴px؛ sidebar + هدر موبایل + Android AppBar) و enforce قطعی روزهای استراحت در تولید برنامه (persistence-level + fallback عددی ISO + پشتیبانی نام فارسی روزها).
- **Batch 15 Verification:** unit suite با نتیجه 336/336، typecheck، lint و production build سبز؛ E2E هدفمند affected (rest-days، quiz-contrast، responsive-layout ۲۴/۲۴، keyboard-focus) سبز. ساب‌ایجنت‌ها در worktree/branch جدا کار کردند و بدون تداخل مرج شدند.
- **Build Blocker: حل شد ✅** — علت ریشه‌ای شکست CI هر سه run (`77f721d`، `ea86ad8`، `dc5b002`) یک تست واحد docs بود (`TASKS.md` به `OTP_LAUNCH_READINESS.md` لینک نداشت)؛ با کامیت `5516e90` اصلاح و job build سبز ثبت شد. شکست بعدی e2e (تست قدیمی rest-days) با کامیت `4d27e7d` اصلاح شد.
- **Workflow Repair Gate completed — isolated agents, staged validation, targeted E2E policy and CI auth coverage are active.** (سیاست دائمی در `docs/CI.md` ثبت شد: طبقه‌بندی شکست، سیاست retry، نقشه تغییر→E2E، benchmark و observability.)
- **CI جدید:** هر کامیت فقط build + lint/typecheck + unit + E2E auth (mock) + smoke اجرا می‌شود (~۳ دقیقه)؛ full E2E به شبانه/دستی منتقل شد (`ci-full-e2e.yml`).
- **Production Go مشروط:** قبل از لانچ باید `SMS_IR_API_KEY`، `SMS_IR_TEMPLATE_ID`، Supabase URL/anon/service-role، دامنه HTTPS، redirectها و template فعال تنظیم شوند و smoke test واقعی با شماره رضایت‌دار اجرا شود.
- **تصمیم Next.js:** ارتقای Next.js به 16.3.1 به‌عنوان migration مستقل و بعد از launch در backlog ثبت شده.
- **تمرکز بعدی:** production smoke و go/no-go لانچ (نیازمند env واقعی از کاربر)؛ سپس تسک‌های باز بعدی از backlog (Next.js بعد از launch). بچ جدید فقط با تأیید صریح کاربر شروع می‌شود.

## نکات کلیدی برای ایجنت بعدی
1. **دسترسی به فایل‌ها:** ریشه اصلی پروژه `/Users/msl/Documents/GitHub/Apex-Home-Fitness` است.
2. **مستندات:** تمام فایل‌های راهنما در پوشه `docs/` هستند.
3. **هوش مصنوعی:** موتور AI در `src/app/api/generate-program/route.ts` قرار دارد.
4. **توصیه‌های Batch 9:** اولویت با اعتبارسنجی Zod، اعمال Rate Limit برای AI و ایمنی محتوا (Medical Disclaimer) است.
