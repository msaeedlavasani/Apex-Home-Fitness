# مرجع اصلی وضعیت، تسک‌ها و تاریخچه بچ‌ها 📋

این فایل مرجع واحد وضعیت کارها، بدهی فنی و تاریخچه batchهاست. روند اجرای هر batch در `docs/HANDOFF.md` و چک‌لیست انتشار در `docs/RELEASING.md` نگهداری می‌شود.

## چک‌پوینت‌های تولید (S02 / R6)

- **S02 — PASS** (`60abb2d373983fa781665a0b6301f1ca1f46b357`، image `s02-60abb2d-r1`): رفع site URL با fallback امن (درس: Pitfall build-time config).
- **R6 — PASS** (`aee28d12e2368206e2d9f788afc2ecd19983e5f6`، image `r6-aee28d1`): session contracts — لایه‌ی قرارداد pure/type-only برای موتور session آینده.
- **CURRENT VERIFIED PRODUCTION CHECKPOINT: AUTH-FIX-01** — PASS / CLOSED; DB بدون تغییر (۱۲ migration، integrity ok).
- **Governance v2:** قوانین برنچ/CI یکپارچه‌سازی با `main` در حال تکمیل است؛ پس از آن `fix/s02-rsc-render` RETIRED می‌شود (بدون تغییر چک‌پوینت Production).
- **تسک بعدی مجاز:** `AUTH-PERF-01` (برنچ پیشنهادی `fix/auth-perf-production-degradation`) — بررسی evidence-backed افت performance، persistence و parity زبان؛ بدون فرض root cause. R7 شروع نشده و مجاز نیست.
- قوانین/runbook/ledger/وضعیت: `docs/RELEASE_POLICY.md`، `docs/FEATURE_TO_PRODUCTION.md`، `docs/BRANCHING_POLICY.md`، `docs/PRODUCTION_CHECKPOINTS.md`، `docs/CURRENT_STATE.md`.

## وضعیت batchها

- **Batch 8:** بهینه‌سازی بصری، Design System، پیشنهاد AI، TWA و SEO — تکمیل شد.
- **Batch 9:** Zod، محافظ‌های AI، Medical Disclaimer، تست امنیتی و CI سخت‌گیرانه — تکمیل شد.
- **Batch 10:** Workout Engine، تست‌های E2E، Design System audit، مستندات API و CI E2E — تکمیل شد.
- **Batch 11:** Rate Limit مشترک، idempotency، timeout persistence، تست gamification و conflict resolution آفلاین — تکمیل شد.
- **Batch 12:** چندهدفه‌کردن کوییز، انتخاب روزهای استراحت، رفع استایل localhost، responsive/RTL و سامان‌دهی asset pipeline — تکمیل شد.
- **Batch 13:** empty-state History/Analytics، فونت Vazirmatn، پوسته Profile، route دوزبانه FAQ و ترتیب روزهای فارسی — تکمیل شد.
- **Batch 14:** Auth/OTP با SMS.ir، اتصال Quiz به حساب، محافظت routeها و ابزار readiness — implementation تکمیل شد؛ launch واقعی هنوز به smoke test production وابسته است.
- **Batch 15:** زبان‌سوییچر سراسری EN/FA (حفظ مسیر، رادیو-گروپ اکسسبل، ۴۴px) و enforce قطعی روزهای استراحت در تولید برنامه (persistence-level + regression) — تکمیل شد.
- **Batch 16:** آمادگی استقرار روی سرور (feature flag OTP، تکمیل قرارداد env، Docker self-hosted، production build، ممیزی Supabase) — تکمیل شد.
- **Batch 17:** پروفایل کامل (شماره، آواتار با Supabase Storage، خروج→لندینگ)، تقویم ماهانه و چارت‌های آمار، OTP TTL=۱۵ دقیقه و بازتولید درجای برنامه — تکمیل شد.
- **Batch 18:** بهبود ناوبری موبایل (تب «ترجیحات تمرین» در تب‌بارها، حذف دکمه بازگشت از صفحات تب، هدر مینیمال دسکتاپ در iOS)، یکپارچگی صفحه پروفایل، اصلاح نام برند فارسی «اپکس هوم فیتنس» + سند تحول (ریسرچ رقبا) — تکمیل شد.
- **Batch 19:** بازطراحی صفحه «تنظیمات تمرین» (۳ کارت جدا، نام فارسی بهتر)، آیکون برند در هدر همه پلتفرم‌ها، و به‌روزرسانی سند تحول با پروفایل تفصیلی ۶ رقیب — تکمیل شد.
- **Batch 20:** AI-first + rules-v2 (frequency مستقل، safety filtering، history adaptation، تجهیزات دقیق)، کوییز/تنظیمات ۸مرحله‌ای و اصلاح سند رقبا — آماده validation نهایی؛ CI عمداً خارج از scope این batch است.

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

## Batch 19: تنظیمات تمرین، آیکون برند و ریسرش عمیق‌تر رقبا 🎯 (تکمیل شد)
1. **[x] نام فارسی بهتر:** «ترجیحات تمرین» → «تنظیمات تمرین» در سراسر ناوبری، عنوان صفحه و پیام‌های ویرایشگر (`fa.json`).
2. **[x] سه کارت جدا:** `PreferencesEditor` به ۳ کارت مستقل (سبک‌های تمرین / تجهیزات / روزهای استراحت) + کارت دکمه ذخیره تقسیم شد.
3. **[x] آیکون برند در هدر:** کامپوننت مشترک `BrandIcon` ساخته شد و به گوشه بالای دسکتاپ، ردیف بالای iOS، اپبار اندروید و نوار بالای موبایل وب اضافه شد.
4. **[x] ریسرچ عمیق‌تر سند تحول:** پروفایل تفصیلی Hevy، Strong، Fitbod، Freeletics، MyFitnessPal، NTC (+ Boostcamp، Strava) با صفحات، امکانات و مدل درآمد؛ جدول امکانات ۸ ستونه و ۶ نکته‌ی کلیدی جدید.

## اولویت فعلی و تسک‌های بعدی (تصمیم D-01، 2026-08-27) 🧭

ترتیب الزامی کارها (مشروح در `docs/HANDOFF.md`):

```text
Documentation / Governance Reconciliation  ← تکمیل شد
        ↓
Full Codebase Modularity, Coupling & Reusability Audit ← تکمیل شد
        ↓
Architecture Stabilization / Approved Modularization ← S03 COMPLETE (2026-08-27)
        ↓
Owner Review → Production Release Preflight / Decision
```

> نقشه‌ی قابلیت‌های محصول دونه‌دونه در [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) است؛ این بخش backlog فنی را نگه می‌دارد. آیتم‌های زیر deferred/planned هستند و تا تثبیت baseline معماری شروع نمی‌شوند (حذف نشده‌اند).

1. **[~] Full Codebase Modularity, Coupling & Reusability Audit** — تکمیل شد (`docs/architecture/MODULARITY-AUDIT.md` + `COUPLING-RISK-REGISTER.md`، رکورد ممیزی).
2. **[~] Execute Architecture Stabilization Plan (فازهای S-01..S-06)** — تصمیمات AD-1..AD-5 پذیرفته شدند (`docs/adr/0001..0003`)؛ اصول معماری AUTHORITATIVE شد (`ARCHITECTURE-PRINCIPLES.md`)؛ برنامه و گیت‌های A/B/C در `ARCHITECTURE-STABILIZATION-PLAN.md` — **S03 COMPLETE — SESSION CORE EXTRACTION CLOSED**؛ فاز S-01 (Shared Contract Ownership) تکمیل شد (2026-08-27؛ contracts در `src/lib/quiz/contracts.ts` و `src/lib/ai/contracts.ts`؛ typecheck/lint/unit 394 سبز). S-02 (هویت متعارف تمرین) — GATE A **تأیید شد** (2026-08-27، GA-01..GA-08) و فازهای S02-A (پایه‌ی دامنه‌ی تمرین: `src/lib/exercise/` — contracts/catalog/resolver + ۱۶ تست) و S02-B (schema افزودنی: `Exercise.slug String? @unique` + `Exercise.faName String?` + مهاجرت `20260827011500_add_exercise_canonical_identity_fields` روی dev DB؛ تصمیم `aliases` در DB = **DEFER**) **تکمیل شدند**؛ S02-C (یکپارچه‌سازی resolver در زمان persistence در `src/services/programService.ts` — انتساب slug برای نام‌های resolve شده + fallback کامل name برای unresolved/ambiguous + حل لینک‌های ProgramExercise به‌صورت slug-first) نیز **تکمیل شد** (2026-08-27؛ typecheck/lint/validate سبز، unit **418/418** + ۸ تست جدید `tests/exercise-persistence.test.ts`؛ و S02-D1 (قرارداد انتشار هویت متعارف تمرین در `src/lib/programSchedule.ts` — منبع حقیقت = `Exercise.id` رابطه‌ای؛ seam خالص `enrichExerciseIdentity`/`enrichScheduleExercises`؛ بدون تغییر API/player) **تکمیل شد** (2026-08-27؛ typecheck/lint سبز، unit **427/427** + ۹ تست جدید `tests/identity-propagation.test.ts`))؛ و S02-D2 (پذیرش هویت متعارف در پلن workout: در `src/components/workout/useWorkoutEngine.ts` فیلدهای اختیاری `exerciseId`/`slug` به `WorkoutExercise` اضافه شد و در `src/app/[locale]/workout/page.tsx` پلن از طریق seam S02-D1 غنی شد؛ `id` همچنان هویت step-local است؛ `SNAPSHOT_PAYLOAD_UNCHANGED` و `WORKOUT_LOG_ID_SEMANTICS_CHANGED: NO`) **تکمیل شد** (2026-08-27؛ typecheck/lint سبز، unit **434/434** + ۷ تست جدید `tests/workout-plan-identity.test.ts`)). برای **S-03 (Pure Workout Session Core)** پکیج **GATE B** آماده شد (2026-08-27): `docs/architecture/S03-SESSION-CORE-GATE-B.md` با GB-01..GB-10 همه `PENDING OWNER APPROVAL` — نقشه‌ی مسئولیت‌ها، مرز core/Adapter، مدل زمان (wallClock دست‌نخورده؛ core فقط elapsed-seconds ورودی می‌گیرد)، قرارداد SessionState (همان `WorkoutEngineState`، سازگار با snapshot)، قراردادهای Command/Effect، طرح parity (golden trace) و توالی S03-A..F. **GATE B تأیید شد** (GB-01..GB-10) و فاز **S03-A** (پایه‌ی parity پیش از استخراج) **تکمیل شد** (2026-08-27): contracts خالص در `src/lib/workout/sessionContracts.ts`؛ harness تست‌محور golden-trace در `tests/helpers/goldenTrace.tsx`؛ ۱۷ تست GT-01..GT-12 در `tests/session-golden-trace.test.tsx` که state و **ترتیب دقیق callback** را فریز می‌کند؛ سند `docs/architecture/S03A-SESSION-PARITY-BASELINE.md`؛ typecheck/lint سبز و unit **451/451** (+17). `sessionCore.ts` ساخته نشده بود و `useWorkoutEngine` بدون تغییر بود. S03-A تا S03-F تکمیل شدند و S03 بسته شد (2026-08-27؛ Session Core runtime-active، hook = React adapter، unit 464/464). S04+ شروع نشده‌اند. S02-E و S-04..S-06 باقی‌مانده قبل از هر کدام checkpoint owner لازم است؛ بدون شروع Workout V2. اقدام فوری: Owner Review → Production Release Preflight / Decision.
3. **[ ] ارتقای Next.js به 16.x:** migration مستقل با codemod، async APIs، proxy/Turbopack و regression کامل — بعد از launch (طبق تصمیم هنداف؛ deferred).
4. **[ ] Progress Check-in (`TRANSFORMATION_ROADMAP.md` آیتم ۱):** deferred — بعد از معماری پایدار.
5. **[ ] سایر آیتم‌های `TRANSFORMATION_ROADMAP.md`:** deferred؛ آیتم‌های مربوط به logging تمرین (PR/ثبت ست‌به‌ست) باید با Technical Spec تمرین V2 هماهنگ شوند (D-02).
6. **[ ] Workout Experience V2:** NOT YET IMPLEMENTED — عمداً paused تا معماری پایدار شود (جزئیات در `docs/product/`).

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
> سطح بلوغ: `INTEGRATED` یعنی UI و backend واقعی به هم متصل‌اند؛ `DEMO` یعنی فقط
> نمایش/نمونه است و نباید feature production تلقی شود.
- [x] سیستم طراحی چندپلتفرمی v2.0 (iOS/Android/Web)
- [x] زیرساخت دوزبانه پیشرفته (RTL/LTR)
- [x] سیستم گیمیفیکیشن و پاداش (XP & Badges)
- [ ] بخش چالش‌های اجتماعی و اشتراک‌گذاری — `DEMO`؛ feed فعلی استاب و بدون مدل/پایداری واقعی است.
- [ ] کتابخانه ویدئویی پیشرفته — `DEMO`؛ player وجود دارد اما کاتالوگ production و pipeline محتوا کامل نیست.
- [x] بهینه‌سازی نهایی دیتابیس (Composite Indexes)
- [x] مانیتورینگ خطا و رویدادهای تحلیلی
- [x] موتور هوشمند تمرین و مدیریت آفلاین
- [x] زیرساخت PWA و TWA
- [x] بهینه‌سازی بصری و انیمیشن‌ها (Batch 8)
- [x] سیستم پیشنهاد AI-first + rules-v2 fallback بر اساس تاریخچه — `INTEGRATED`؛ موتور rules محدودیت، تجهیزات، frequency و adherence را اعمال می‌کند.
- [x] بازبینی سیستم طراحی و توکن‌های UI (Batch 8)
- [x] تست تولید TWA و سئو (Batch 8)

## معماری و تاب‌آوری (Architecture / Resilience) 🧭

### Reduce International Service Dependency / Supabase Resilience
**وضعیت:** BACKLOG — خارج از دامنه‌ی تثبیت S02.

هدف: Apex Home Fitness تا حد امکان در صورت قطع یا محدودیت اینترنت بین‌المللی عملیاتی بماند.

در یک کار معماری مستقل، همه‌ی وابستگی‌های Supabase باید inventory و طبقه‌بندی شوند:
Authentication، Database، Storage، Realtime، Edge Functions، API access، استفاده‌ی client/server از SDK؛ هرکدام به‌عنوان `SELF_HOSTABLE`، `REPLACEABLE_WITH_LOCAL_SERVICE`، `REQUIRES_EXTERNAL_ACCESS` یا `NOT_USED`.

گزینه‌های آینده شامل self-hosted Supabase، PostgreSQL بومی، object storage محلی مانند MinIO، احراز هویت/session داخلی، realtime داخلی و حذف وابستگی‌های غیرضروری است. در این task هیچ migration یا تغییر زیرساختی انجام نمی‌شود.

## بدهی‌های فنی (Technical Debt) ⚠️
1. **[x] Unified Asset Pipeline:** مسیر asset، fallback آفلاین، CSP/cache policy و audit خودکار در `docs/ASSETS.md`.
2. **[x] Advanced Conflict Resolution:** policy قطعی تعارض، merge، retry و idempotency برای همگام‌سازی آفلاین.
3. **[x] Unit Test Coverage:** پوشش unit برای منطق‌های XP، level، streak، badge و reward در `gamificationService`.
