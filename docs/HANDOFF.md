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

## گیت اصلاح Workflow — فقط یک‌بار و بعد از رفع Build Blocker 🔴

> **دستور قطعی برای ایجنت بعدی:** بعد از PASS شدن blocker build و قبل از انتخاب/اجرای هر Batch یا شروع هر تسک محصولی، این گیت را کامل کن. در این مرحله فقط Workflow، isolation ساب‌ایجنت‌ها و validation/CI اصلاح می‌شود؛ هیچ feature جدیدی شروع نشود.

### مسئله‌ای که باید رفع شود

در Batch 14 مشخص شد که E2E در چند نوبت وارد حلقه‌ی debugging شد، اما ریشه‌ی مهم‌تر این‌ها بود:

1. چند sub-agent هم‌زمان روی یک workspace مشترک کار کردند و conflict/overwrite/contract drift ساختند.
2. validation ارزان و affected قبل از E2E به‌صورت اجباری و مرحله‌ای نبود.
3. failureهای application، test و environment قبل از rerun به‌طور رسمی طبقه‌بندی نمی‌شدند.
4. CI مسیر auth جدید را اجرا نمی‌کرد؛ چون `AUTH_OTP_MODE=mock` تنظیم نشده بود و `auth-flow.spec.ts` skip می‌شد.
5. Playwright در CI با `workers: 1` و `retries: 2` کل ۱۰۴ تست را اجرا می‌کند؛ full E2E برای gate خوب است، اما برای debugging محلی نباید حلقه‌ی پیش‌فرض باشد.

### راه‌حل اجرایی یک‌باره

ایجنت بعدی باید این موارد را به‌ترتیب انجام دهد:

1. **ایزوله‌سازی sub-agentها**
   - برای taskهای موازی از worktree/branch جدا استفاده کن؛ اگر host امکان worktree جدا ندارد، taskهای دارای فایل/contract مشترک را گروه‌بندی و ترتیبی اجرا کن.
   - هیچ sub-agentی اجازه ندارد فایل خارج از scope خود را بازنویسی کند.
   - contractهای مشترک auth، env، API، schema و routing باید قبل از implementation مشخص و به یک owner سپرده شوند.
   - یک workspace مشترک برای پنج implementation هم‌زمان ممنوع است.

2. **validation مرحله‌ای اجباری**
   - هر sub-agent حداقل typecheck/lint مرتبط و unit/API/integration تست‌های affected را اجرا و گزارش کند.
   - main agent قبل از هر E2E باید conflict، scope و contract drift را بررسی کند.
   - ترتیب validation:

   ```text
   scope/conflict check
      ↓
   typecheck + lint
      ↓
   affected unit tests
      ↓
   affected integration/API/contract tests
      ↓
   targeted E2E در صورت نیاز
      ↓
   full E2E فقط برای high-risk/release
   ```

3. **طبقه‌بندی failure قبل از rerun**
   - Application bug → regression ارزان در همان module → fix → targeted E2E
   - Test bug → اصلاح همان spec → rerun همان spec
   - Environment failure → reset server/cache/port/env → rerun targeted suite
   - Flaky test → ثبت flake و حداکثر rerun محدود؛ retry نامحدود ممنوع
   - Expected behavior change → update contract و تست مرتبط
   - بعد از هر failure، full E2E به‌صورت خودکار تکرار نشود.

4. **فعال‌سازی auth coverage در CI**
   - در job E2E مقدار `AUTH_OTP_MODE=mock` تنظیم شود.
   - این mock نباید session یا SMS جعلی production بسازد؛ فقط route protection و UI OTP را بدون external credentials اجرا کند.
   - full provider journey با SMS.ir/Supabase فقط در staging/manual/nightly و با GitHub Environment secrets اجرا شود.

5. **انتخاب هدفمند E2E بدون حذف coverage**
   - script/projectهای زیر را اضافه یا مستند کن:
     - `test:e2e:smoke`
     - `test:e2e:auth`
     - `test:e2e:quiz`
     - `test:e2e:full`
   - mapping تغییر به تست:
     - auth/session/middleware → `auth-flow.spec.ts`
     - Landing/Quiz/draft/generation → `main-flows.spec.ts`
     - RTL/responsive → `rtl-layout.spec.ts`, `responsive-layout.spec.ts`
     - keyboard/ARIA → `keyboard-focus.spec.ts`, `accessibility-aria.spec.ts`
     - Profile → `profile-shell.spec.ts`
     - FAQ → `faq.spec.ts`
     - rest-days/calendar → `rest-days.spec.ts`, `week-calendar-order.spec.ts`
     - workout/offline → `workout-route.spec.ts`, `offline-pwa.spec.ts`
   - full E2E همچنان یک gate کامل CI باقی بماند؛ فقط local debugging باید targeted باشد.

6. **benchmark قبل از parallelization**
   - زمان baseline برای unit، typecheck، build، smoke E2E، full E2E و setup ثبت شود.
   - `workers=1`، `workers=2` و در صورت نیاز `workers=3` مقایسه شوند.
   - فقط اگر flake و contention افزایش نیافت، worker/shard تغییر کند؛ افزایش کورکورانه ممنوع.

### معیار پذیرش گیت Workflow Repair

این گیت فقط وقتی کامل است که همه‌ی موارد زیر PASS باشند:

- [ ] sub-agentهای موازی در worktree/branch جدا یا گروه‌های ترتیبی بدون overlap اجرا شوند.
- [ ] هر sub-agent گزارش استاندارد شامل changed files، impact، validation و risk بدهد.
- [ ] `AUTH_OTP_MODE=mock` در CI فعال باشد و auth suite دیگر silently skip نشود.
- [ ] script یا project انتخاب targeted E2E و smoke وجود داشته باشد.
- [ ] full E2E در CI حفظ شده باشد و حذف coverage رخ نداده باشد.
- [ ] failure classification و policy rerun در docs/CI ثبت شده باشد.
- [ ] benchmark اولیه‌ی test duration ثبت شده باشد.
- [ ] typecheck، unit، build و smoke/targeted E2E بعد از اصلاح Workflow سبز باشند.

### الزام پاک‌سازی بعد از موفقیت

پس از PASS شدن تمام معیارهای بالا:

1. تغییرات Workflow را commit/push کن.
2. همین بخش `## گیت اصلاح Workflow — فقط یک‌بار و بعد از رفع Build Blocker` را از این فایل حذف کن.
3. در بخش Current Status فقط یک خط دائمی باقی بگذار: `Workflow Repair Gate completed — isolated agents, staged validation, targeted E2E policy and CI auth coverage are active.`
4. سپس، و فقط سپس، روال عادی انتخاب Batch و اجرای taskهای محصولی را ادامه بده.
5. گزارش کامل ممیزی E2E را نگه دار؛ حذف این بخش موقت به معنی حذف policy دائمی یا کاهش coverage نیست.

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
- **Production Go مشروط:** هیچ SMS واقعی یا external system در این batch لمس نشده است. قبل از لانچ باید `SMS_IR_API_KEY`، `SMS_IR_TEMPLATE_ID`، Supabase URL/anon/service-role، دامنه HTTPS، redirectها و template فعال تنظیم شوند و smoke test واقعی با شماره رضایت‌دار اجرا شود.
- **تصمیم Next.js:** ارتقای Next.js به 16.3.1 به‌عنوان migration مستقل و بعد از launch در backlog ثبت شده؛ برای این batch انجام نمی‌شود.
- **Build Blocker:** CI برای commitهای `77f721d` و `ea86ad8` طبق گزارش موجود در مرحله `build` شکست خورده؛ قبل از Workflow Repair Gate و هر Batch جدید باید علت هر دو run بررسی و یک build سبز CI-like/CI ثبت شود.
- **Workflow Repair Gate:** برای رفع shared-workspace conflict، staged validation، failure classification، targeted E2E و فعال‌سازی auth coverage در CI آماده شده و فقط بعد از رفع Build Blocker باید اجرا و پس از PASS از همین فایل پاک شود.
- **تمرکز بعدی:** ابتدا رفع Build Blocker، سپس Workflow Repair Gate، بعد production smoke و go/no-go لانچ؛ بعد از آن انتخاب تسک‌های بعدی از backlog. هیچ migration Next.js یا بچ جدیدی بدون تأیید شروع نمی‌شود.

## نکات کلیدی برای ایجنت بعدی
1. **دسترسی به فایل‌ها:** ریشه اصلی پروژه `/Users/msl/Documents/GitHub/Apex-Home-Fitness` است.
2. **مستندات:** تمام فایل‌های راهنما در پوشه `docs/` هستند.
3. **هوش مصنوعی:** موتور AI در `src/app/api/generate-program/route.ts` قرار دارد.
4. **توصیه‌های Batch 9:** اولویت با اعتبارسنجی Zod، اعمال Rate Limit برای AI و ایمنی محتوا (Medical Disclaimer) است.
