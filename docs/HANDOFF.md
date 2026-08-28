# Handoff عملیاتی Apex Home Fitness

> این فایل snapshot عملیاتی پروژه است؛ قراردادهای جزئی در سند تخصصی خودشان نگهداری می‌شوند.

## چک‌پوینت تولید فعلی (Verified Production Checkpoint)

> Manifest عملیاتی جاری: [`CURRENT_STATE.md`](CURRENT_STATE.md) — قبل از هر تسک وابسته بخوان.

- **AUTH-FIX-01 — PASS** (جاری): source `ce91a4f…`، image `apex-home-fit:authfix-ce91a4f` (`sha256:f0b0785b…`)؛ ریشه: volume دیتابیس root-owned بود و اپ به‌عنوان nextjs (uid 100) نمی‌توانست بنویسد → همه‌ی writeها `attempt to write a readonly database`. volume به `100:101` بازگردانده شد و image جدید یک startup preflight (`scripts/preflight-db.mjs`) دارد که روی volume غیرقابل‌نوشتن fail-fast می‌شود. ورود واقعی + نوشتن پس از ورود (program API 200، user row سینک شد) + مرورگر واقعی ۹/۹ + re-check تأخیری PASS؛ RestartCount 0.
- **R6 — PASS** (checkpoint رول‌بک فوری): source `aee28d12e2368206e2d9f788afc2ecd19983e5f6`، image `apex-home-fit:r6-aee28d1` (`sha256:6aabafe1…`).
- **وضعیت Governance v2:** مستندات governance + CI برنچ در حال یکپارچه‌سازی با `main` هستند؛ برنچ فعلی `fix/s02-rsc-render` تا تکمیل ادغام فعال است و پس از آن RETIRED می‌شود.
- **تسک بعدی مجاز (پس از تأیید Owner):** `AUTH-FIX-01` — ورود واقعی با provider واقعی؛ CI PASS کافی نیست و FEATURE_ACCEPTANCE واقعی Production الزامی است.
- **S02 — PASS** (قبلی): source `60abb2d373983fa781665a0b6301f1ca1f46b357`، image `apex-home-fit:s02-60abb2d-r1` (`sha256:d0483ad7…`).
- **DB:** SQLite روی volume `apexhomefit_prod_db:/data`، `DATABASE_URL=file:/data/app.db`، ۱۲ migration، integrity ok؛ R6 هیچ تغییری در DB نداد.
- قوانین: [`RELEASE_POLICY.md`](RELEASE_POLICY.md) · runbook: [`FEATURE_TO_PRODUCTION.md`](FEATURE_TO_PRODUCTION.md) · ledger: [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md) · درس‌ها: [`PITFALLS/`](PITFALLS/)
- **R7 هنوز شروع نشده است.** پس از AUTH-FIX-01 (طبق اولویت Owner) و فقط پس از تأیید Owner شروع می‌شود.

## وضعیت فعلی

- **Branch اصلی:** `main`
- **Framework:** Next.js 15.5.23 + next-intl 4.13.7
- **UI foundation:** Tailwind CSS و semantic CSS tokens؛ MUI `9.3.1` با Emotion به‌صورت foundation آزمایشی در layout فعال است و `CssBaseline` ندارد.
- **Node:** 22
- **Database:** Prisma 6 + SQLite؛ در Docker روی volume به نام `db-data`
- **Identity/session:** Supabase SSR
- **OTP live provider:** SMS.ir، endpoint `v1/send/verify`
- **OTP فعلی production:** موقتاً mock و فقط برای شماره‌های allowlist تست؛ کد توسعه در مستندات نگهداری نمی‌شود. این حالت قبل از public launch باید خاموش شود.
- **SMS template live:** شناسه `976440` با نام پارامتر `otp`
- **Deployment:** self-hosted Docker Compose؛ سرویس app روی پورت 3000. DNS کانتینر app صراحتاً به `1.1.1.1` و `8.8.8.8` تنظیم شده تا lookup ناپایدار Supabase (`EAI_AGAIN`) باعث شکست OTP نشود.
- **Program generation:** AI-first explicit resolver in `src/lib/ai/provider.ts`; production can use `Groq → rules-v2` or `OpenAI → rules-v2` through env only. Rules-v2 respects independent weekly frequency, hard rest-day constraints, exact equipment ids, limitation exclusions and recent adherence. Both keys are server-only and never logged.
- **AI provider status (2026-08-27):** `AI_PROVIDER=openai` is now the production setting. Diagnosis: the Groq key is VALID but Groq geo-blocks Iranian egress IPs (HTTP 403 `Forbidden` — even a bogus key gets 403 from Iran while a valid key returns 401/200 from a non-Iran IP); the OpenAI key is VALID and reachable from the server (`/v1/models` 200) but its account has **zero credits** (`429 insufficient_quota` / `credit_balance_exhausted` on `/v1/chat/completions`). Until a funded OpenAI account (or a Groq proxy in an allowed region) is provided, every generation correctly falls back to the rules engine. **Action required:** add credits to the OpenAI account (or replace `OPENAI_API_KEY` with a funded key) — no code change needed; then one generation should show `metadata.source="ai"`, `fallbackReason=null`.
- **Profile/workout tracking:** profile contact email is editable separately from the synthetic auth email; verified phone stays immutable. Weight changes update the current profile and append `WeightEntry` history. Starting and completing a generated workout creates/finishes an owned `WorkoutSession`, which feeds dashboard completion markers, History and Analytics.
- **Avatar storage:** production uses Supabase Storage — create a PRIVATE bucket named `avatars` (objects `<userId>.<ext>`, served via short-lived signed URLs; no RLS needed, service-role writes/signs). `User.avatarUrl` stores the object path; legacy data-URL rows keep working. Without `SUPABASE_SERVICE_ROLE_KEY` the app falls back to storing the data URL in the DB (dev/mock).
- **Program regeneration:** regenerating (quiz re-run or preferences save, incl. rest-day changes) updates the user's existing `Program` IN PLACE (same id) — workout history stays attached and no orphaned program rows accumulate.

## وضعیت فعلی پروژه (Current Status) 🟢
- **Batch 8:** بهینه‌سازی بصری، Design System، پیشنهاد AI، TWA و SEO — تکمیل.
- **Batch 9:** Zod، محافظ‌های AI، Medical Disclaimer، تست امنیتی و CI سخت‌گیرانه — تکمیل.
- **Batch 10:** Workout Engine، E2E آفلاین/RTL/کیبورد/ARIA، audit طراحی، API docs و pipeline کامل E2E — تکمیل.
- **Batch 11:** Rate Limit چنداینستنسی، idempotency، timeout persistence، gamification tests و conflict resolution آفلاین — تکمیل.
- **Batch 12:** چندهدفه‌کردن کوییز، روزهای استراحت، رفع PostCSS، responsive/RTL و asset pipeline — تکمیل.
- **Batch 13:** empty-stateها، فونت Vazirmatn، Profile با sidebar/back، FAQ دوزبانه، ترتیب روزهای فارسی — تکمیل (unit 207/207؛ E2E متمرکز 51/51).
- **Batch 14:** adapter امن SMS.ir، OTP lifecycle/session، Landing→Quiz→OTP→save→generate→Dashboard، auth UI/route protection و readiness checklist — تکمیل (unit 319/319؛ auth mock E2E 12/12؛ main-flows 8/8).
- **Batch 15:** زبان‌سوییچر سراسری EN/FA و enforce قطعی روزهای استراحت — تکمیل (unit 336/336؛ E2E هدفمند affected سبز).
- **Batch 17:** پروفایل کامل (شماره موبایل، آواتار با Supabase Storage + signed URL، ترتیب سایدبار، خروج→لندینگ)، تقویم ماهانه تاریخچه، چارت‌های آمار، OTP TTL=۱۵ دقیقه و بازتولید درجای برنامه + ویرایش روزهای استراحت در ترجیحات — تکمیل (unit 387/387).
- **Batch 18:** تب «ترجیحات تمرین» در تب‌بارهای موبایل (۵ ستون iOS/اندروید + پیلی وب)، حذف بازگشت از صفحات تب، هدر زبان/تم در iOS، یکپارچگی صفحه پروفایل، اصلاح برند «اپکس هوم فیتنس» و سند تحول (`docs/TRANSFORMATION_ROADMAP.md`) — تکمیل (unit 387/387؛ دیپلوی‌شده: `aa2b1db`).
- **Batch 19:** صفحه «تنظیمات تمرین» با ۳ کارت مستقل و نام فارسی بهتر، آیکون برند Apex در هدر همه پلتفرم‌ها (`BrandIcon`)، و به‌روزرسانی سند تحول با پروفایل ۶ رقیب — تکمیل (unit 387/387).
- **Batch 20:** قرارداد frequency مستقل، rules-v2 ایمن و history-aware، تجهیزات دقیق، method mix نرمال، کوییز/تنظیمات ۸مرحله‌ای و رجیستر شواهد رقبا — آماده validation نهایی؛ CI خارج از این batch است.
- **Workflow Repair Gate completed — isolated agents, staged validation, targeted E2E policy and CI auth coverage are active.**
- **Production Go مشروط:** قبل از لانچ باید `SMS_IR_API_KEY`، `SMS_IR_TEMPLATE_ID`، Supabase URL/anon، دامنه HTTPS، redirectها و template فعال تنظیم شوند و smoke test واقعی با شماره رضایت‌دار اجرا شود (چک‌لیست کامل: `docs/OTP_LAUNCH_READINESS.md` §11).
- **استقرار سرور (self-hosted Docker):** Next 15.5.23 روی `85.198.16.251`، کد در `/opt/apexhomefit/app-new/` (بدون git؛ سینک دستی با rsync + `docker compose up --build -d`؛ `.deployed-commit` رکورد کامیت دیپلوی‌شده است). *(روند release فعلی: تصویر immutable از کامیت دقیق — `docs/FEATURE_TO_PRODUCTION.md`؛ این پاراگراف روند تاریخی است.)* **Rollback:** git (checkout کامیت قبلی + rebuild) یا بکاپ‌های `app-new/backups/` (اسنپ‌شات تازه دیتابیس + `current.env`). `/opt/apexhomefit` پاکسازی شد — فقط `app-new`، `backups/` و اسکریپت‌های acme (`acme-auth.sh`/`acme-cleanup.sh` که **برای تمدید گواهی certbot ضروری‌اند**) باقی مانده‌اند. قالب SMS.ir: `SMS_IR_TEMPLATE_ID=976440`، پارامتر قالب: `otp` (`SMS_IR_CODE_PARAMETER=otp`). OTP mock allowlist، session Supabase و مسیر HTTPS تا dashboard در 2026-08-26 smoke-test شد؛ کد mock عمداً مستند نمی‌شود. تأخیر تحویل SMS (~۴ دقیقه) سمت SMS.ir است — قالب باید در بخش «ارسال سریع» پنل تعریف شود.
- **OTP mock override (production test harness):** برای توسعه/تست سرور، `AUTH_OTP_MODE=mock` + `AUTH_OTP_MOCK_IN_PRODUCTION=true` فقط شماره‌های `AUTH_OTP_MOCK_PHONES` را به session تست می‌رساند؛ مقدار کد توسعه secret-like است و نباید log/document شود. بقیه به SMS.ir واقعی route می‌شوند (پیش‌فرض OFF). بعد از رفع SMS، حالت mock حذف شود.
- **تصمیم Next.js:** ارتقای امنیتی به 15.5.23 (به‌همراه next-intl 4.13.7) روی برنچ `migration/next-15` انجام و typecheck/lint/unit (345/345) سبز شد؛ 14.x دیگر پچ امنیتی نمی‌گیرد، پس این ارتقا قبل از launch الزامی است. ارتقای نهایی به 16.x همچنان به‌عنوان migration مستقل و **بعد از launch** باقی می‌ماند.
- **اولویت فعلی (تصمیم D-01، 2026-08-27؛ به‌روزرسانی 2026-08-27 عصر):**

> **Production release context (read-only preflight, 2026-08-27):** target repository `main` is `51d0032`; Production marker is `27c5ec3` (not present in the current checkout), live Apex containers and `apexhomefit.ir` HTTPS/static routing were observed healthy, and Production remains on 11 migrations while the S02 canonical Exercise migration is pending. No deployment or migration was performed. Use `docs/RELEASING.md` as the authoritative bootstrap/release runbook.

  ```text
  Documentation / Governance Reconciliation   ← تکمیل شد
          ↓
  Full Codebase Modularity, Coupling & Reusability Audit ← تکمیل شد
          ↓
  Architecture Stabilization / Approved Modularization ← S03 COMPLETE (2026-08-27)
          ↓
  Owner Review → Production Release Preflight / Decision
  ```

  وضعیت معماری (تصمیمات 2026-08-27): تصمیم‌های AD-1 (هویت متعارف تمرین)، AD-2 (هسته‌ی خالص Session) و AD-3 (مهاجرت کوییز، DO WHEN TOUCHED) **پذیرفته شدند** و در `docs/adr/0001..0003` ثبت شدند؛ AD-4 (مالکیت قراردادهای مشترک) پذیرفته و AD-5 (جداسازی offline store) deferred شد. اصول معماری در `docs/architecture/ARCHITECTURE-PRINCIPLES.md` AUTHORITATIVE شد و برنامه‌ی تثبیت (`docs/architecture/ARCHITECTURE-STABILIZATION-PLAN.md`) با فازهای S-01..S-06 و گیت‌های A/B/C — **S03 COMPLETE / S02-E و S04..S06 برنامه‌ریزی‌شده**؛ فاز S-01 (Shared Contract Ownership) تکمیل شد (2026-08-27): قراردادهای مشترک به `src/lib/quiz/contracts.ts` و `src/lib/ai/contracts.ts` منتقل شدند (re-export سازگار در سرویس‌ها)، وارونگی lib→services حذف شد، typecheck/lint/unit سبز. فاز S-02 (هویت متعارف تمرین): GATE A **(GA-01..GA-08) تأیید شد** و فاز S02-A (پایه‌ی دامنه‌ی تمرین و resolver) **تکمیل شد** (`src/lib/exercise/` contracts/catalog/resolver + ۱۶ تست + سند vocab؛ typecheck/lint/unit سبز؛ بدون side effect و بدون تغییر runtime). S02-B (schema افزودنی) نیز **تکمیل شد** (2026-08-27): `Exercise.slug String? @unique` + `Exercise.faName String?` به `prisma/schema.prisma` اضافه و مهاجرت `20260827011500_add_exercise_canonical_identity_fields` روی dev DB اعمال شد (۴۰ ردیف دست‌نخورده، slug/faName NULL، rebuild جدول Program به‌عنوان رفتار استاندارد SQLite بررسی و lossless تأیید شد؛ بدون backfill). تصمیم S02-B: `aliases` در DB **DEFER** شد و در `src/lib/exercise/catalog.ts` می‌ماند. فاز **S02-C** (یکپارچه‌سازی canonical resolution در زمان persistence) نیز **تکمیل شد** (2026-08-27): در `src/services/programService.ts`، `buildProgramDraft` slug را برای نام‌های resolve شده انتساب می‌دهد و `upsertCanonicalExercise` (by-slug reuse → name attach → create-with-slug، با P2002 degrade به name-only) + حل لینک‌های ProgramExercise به‌صورت slug-first — fallback کامل name برای unresolved/ambiguous حفظ شد؛ `name` بدون تغییر و `faName` NULL؛ AI و rules هر دو از همین مسیر عبور می‌کنند؛ weeklySchedule/API/player/logs/snapshots بدون تغییر؛ typecheck/lint/validate سبز و unit **418/418** (+۸ تست `tests/exercise-persistence.test.ts`). فاز **S02-D1** (قرارداد انتشار هویت متعارف تمرین) نیز **تکمیل شد** (2026-08-27): در `src/lib/programSchedule.ts` قرارداد `WorkoutExerciseIdentity` + seam خالص `exerciseIdentityIndex`/`enrichExerciseIdentity`/`enrichScheduleExercises` با منبع حقیقت = `Exercise.id` رابطه‌ای (byName → bySlug → legacy-only؛ بدون fuzzy و بدون ابداع id)؛ قرارداد سند در `docs/architecture/S02D1-EXERCISE-IDENTITY-PROPAGATION.md`؛ بدون تغییر API/player/logs/snapshots و بدون بازنویسی weeklySchedule؛ typecheck/lint سبز و unit **427/427** (+۹ تست `tests/identity-propagation.test.ts`). فاز **S02-D2** (پذیرش هویت متعارف در پلن client/workout) نیز **تکمیل شد** (2026-08-27): به `WorkoutExercise` فیلدهای اختیاری `exerciseId`/`slug` اضافه شد (`id` همچنان هویت step-local و بدون تغییر) و صفحه‌ی workout از طریق seam S02-D1 (`exerciseIdentityIndex` + `enrichScheduleExercises`) هر گام پلن را با هویت متعارف از `program.exercises` غنی کرد — فقط از `Exercise.id` رابطه‌ای-matched و بدون ابداع id؛ `SNAPSHOT_PAYLOAD_UNCHANGED` (serializer می‌پروژکت می‌کند) و `WORKOUT_LOG_ID_SEMANTICS_CHANGED: NO` (مسیر session بر پایه‌ی name است)؛ سند `docs/architecture/S02D2-CLIENT-IDENTITY-ADOPTION.md`؛ typecheck/lint سبز و unit **434/434** (+۷ تست `tests/workout-plan-identity.test.ts`). برای **S-03** پکیج **GATE B** آماده شد (2026-08-27): `docs/architecture/S03-SESSION-CORE-GATE-B.md` — GB-01..GB-10 همه `PENDING OWNER APPROVAL` (مرز core/Adapter، مدل زمان، قرارداد SessionState/Command/Effect، parity golden-trace، توالی S03-A..F). **GATE B تأیید شد** (GB-01..GB-10) و فاز **S03-A** (پایه‌ی parity پیش از استخراج) **تکمیل شد** (2026-08-27): contracts خالص `src/lib/workout/sessionContracts.ts`؛ harness golden-trace تست‌محور `tests/helpers/goldenTrace.tsx`؛ ۱۷ تست GT-01..GT-12 در `tests/session-golden-trace.test.tsx` (state + ترتیب دقیق callback فریز شد)؛ سند `docs/architecture/S03A-SESSION-PARITY-BASELINE.md`؛ typecheck/lint سبز و unit **451/451** (+17). `sessionCore.ts` ساخته نشده بود؛ `useWorkoutEngine` بدون تغییر بود. **S03-A تا S03-F تکمیل شدند و S03 بسته شد (2026-08-27؛ Session Core runtime-active، hook = React adapter، unit 464/464). S04+ شروع نشده‌اند.** **S02-E و S-04..S-06 باقی‌مانده شروع نشده‌اند** و قبل از هر کدام به checkpoint مجدد owner نیاز دارند. اجرای بقیه فازها فقط phased و با توقف الزامی در گیت‌ها. آیتم‌های قبلی (Progress Check-in و ارتقای Next.js 16) **حذف نشده‌اند** و deferred/planned هستند؛ Workout Experience V2 نیز عمداً paused است. branch قدیمی `fix/rules-engine-safety-v2` نیز با مالکیت تأییدشده functionally superseded بازنشسته و حذف شده است. اقدام فوری: **Owner Review → Production Release Preflight / Decision**؛ بچ جدید فقط با تأیید صریح کاربر.

## نکات کلیدی برای ایجنت بعدی
0. **قبل از شروع هر تسک وابسته:** `RELEASE_POLICY.md` + `BRANCHING_POLICY.md` + `PRODUCTION_CHECKPOINTS.md` + `CURRENT_STATE.md` را بخوان؛ چک‌پوینت فعلی تولید R6 است.
1. **ریشه پروژه:** `/Users/msl/Documents/GitHub/Apex-Home-Fitness` — مستندات در `docs/`؛ قبل از هر تغییری ترتیب مطالعه‌ی §۵ `docs/governance/DOCUMENTATION-GOVERNANCE.md` و نقشه‌ی `docs/INDEX.md` را دنبال کن.
2. **سیاست تست:** `docs/CI.md` (اسکریپت‌ها: `test:e2e:smoke`/`auth`/`quiz`/`full`).
3. **قرارداد launch:** `docs/OTP_LAUNCH_READINESS.md` (Go/No-Go، envها، smoke test).
4. **هوش مصنوعی:** موتور AI در `src/app/api/generate-program/route.ts`.
5. **کارهای blocked روی کاربر:** env واقعی SMS.ir/Supabase، دامنه HTTPS، اکانت Vercel (فعلاً به تعویق افتاده).
6. **حالت mock پروداکشن:** اگر `AUTH_OTP_MODE=mock` روی سرور فعال است، حتماً `AUTH_OTP_MOCK_IN_PRODUCTION=true` و `AUTH_OTP_MOCK_PHONES` (allowlist تست) را هم دیده و بعد از رفع SMS حذفش کن.
