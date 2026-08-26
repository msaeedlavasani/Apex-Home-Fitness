# چک‌لیست آمادگی Launch و Smoke Test احراز هویت OTP 📱

> سند مرجع آمادگی production برای **Batch 14 / تسک ۵** (Auth/OTP با SMS.ir).
> این سند **قرارداد launch** است: قبل از انتشار عمومی، تمام موارد «Go/No-Go» باید تأیید شوند.
> جزئیات API در `docs/AI_API.md`، فرایند انتشار در `docs/RELEASING.md` و وضعیت تسک‌ها در `docs/TASKS.md` نگهداری می‌شود.

## وضعیت فعلی (لحظه‌ی نگارش)

- **Batch 14 & 15:** تمامی تسک‌های محصولی (OTP adapter، session، UI، route protection، readiness checklist، زبان‌سوییچر و enforce روزهای استراحت) پیاده‌سازی و وریفای شدند.
- **زیرساخت:** اپ از **Prisma با SQLite** برای دیتابیس (برنامه تمرینی، کوییز و ...) استفاده می‌کند. Supabase فعلاً فقط به عنوان **Identity Provider (Auth)** استفاده می‌شود. برای استقرار self-hosted، دیتابیس SQLite در یک Docker Volume نگهداری می‌شود.
- **آمادگی سرور:** Dockerfile و docker-compose آماده شده‌اند؛ تولید برنامه (build) با full env placeholders تأیید شده است.
- تا اجرای موفق smoke test واقعی روی دامنه production، **go نهایی داده نمی‌شود**.
- هر تغییری در قرارداد زیر باید در `docs/AI_API.md` (بعد از پیاده‌سازی endpointها) و همین سند همگام شود.

---

## 1. متغیرهای محیطی production 🔑

همه‌ی متغیرهای زیر باید در محیط production ست شوند (مقدار placeholder در `.env.example`؛ مقدار واقعی فقط از طریق secret manager / environment deployment تزریق شود — هرگز در git).

| متغیر | الزامی؟ | کاربرد | مقدار placeholder |
|---|---|---|---|
| `SMS_IR_API_KEY` | ✅ (وقتی OTP live است) | کلید REST API سرویس SMS.ir — هدر `X-API-KEY` | `placeholder-api-key-do-not-commit` |
| `SMS_IR_TEMPLATE_ID` | ✅ | شناسه‌ی قالب پیامک تأیید (پنل SMS.ir) با پارامتر کد | `100000` (نمونه) |
| `SMS_IR_API_BASE_URL` | ❌ (پیش‌فرض `https://api.sms.ir`) | override آدرس پایه (تست/mock) | پیش‌فرض |
| `SMS_IR_CODE_PARAMETER` | ❌ (پیش‌فرض کد: `Code`) | نام پارامتر قالب که کد را دریافت می‌کند؛ در production فعلی `otp` (باید دقیقاً با قالب پنل SMS.ir یکی باشد) | `Code` |
| `SMS_IR_TIMEOUT_MS` | ❌ (پیش‌فرض ۵۰۰۰) | timeout درخواست خروجی به SMS.ir | `5000` |
| `OTP_CODE_LENGTH` | ❌ (پیش‌فرض ۶) | طول کد | `6` |
| `OTP_CODE_TTL_MS` | ❌ (پیش‌فرض ۹۰۰۰۰۰) | طول عمر کد (۱۵ دقیقه) | `900000` |
| `OTP_RESEND_COOLDOWN_MS` | ❌ (پیش‌فرض ۶۰۰۰۰) | فاصله‌ی مجاز بین درخواست کد جدید برای یک شماره | `60000` |
| `OTP_MAX_ATTEMPTS` | ❌ (پیش‌فرض ۵) | سقف تلاش اشتباه برای هر کد | `5` |
| `OTP_REQUEST_PHONE_*` / `OTP_REQUEST_IP_*` | ❌ (پیش‌فرض‌ها در `.env.example`) | پنجره‌ها و سقف‌های rate limit درخواست کد | پیش‌فرض‌ها |
| `OTP_VERIFY_PHONE_*` / `OTP_VERIFY_IP_*` | ❌ (پیش‌فرض‌ها در `.env.example`) | پنجره‌ها و سقف‌های rate limit تأیید کد | پیش‌فرض‌ها |
| `RATE_LIMIT_STORE` | ❌ (پیش‌فرض `memory`) | backend اشتراکی rate limit — در production چند-اینستنسه باید `redis` باشد | `redis` |
| `REDIS_REST_URL` / `REDIS_REST_TOKEN` | فقط با `RATE_LIMIT_STORE=redis` | storage اشتراکی counters و قفل‌ها (همان store موجود در `src/lib/ai/rateLimitStore.ts`) | placeholder |
| `NEXT_PUBLIC_SITE_URL` | ✅ | دامنه‌ی production (HTTPS) — origin کانونیکال، OG و TWA | `https://your-production-domain.example` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL پروژه‌ی Supabase | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon (public) key — **هرگز service-role در client** | placeholder |
| `SMOKE_TEST_MODE` | ❌ | دروازه‌ی smoke test: `mock` / `real` / unset | unset در production |
| `SMOKE_TEST_PHONE` | فقط برای real smoke | شماره‌ی تست با رضایت (فقط در staging) | — |

> ⚠️ متغیرهایی که در production **نباید** باشند: `SMOKE_TEST_MODE=real`، هر کلید واقعی در فایل‌های commit‌شده، و هر `SUPABASE_SERVICE_ROLE_KEY` در client/runtime سرور عمومی (کلیدهای SMS.ir و service-role فقط server-side مصرف می‌شوند — رجوع به `src/lib/auth/otp.ts`).

---

## 2. الزامات SMS.ir 📨

منبع رسمی: [SMS.ir REST API](https://sms.ir/rest-api/).

| مورد | مقدار / توضیح |
|---|---|
| Endpoint درخواست کد | `POST https://api.sms.ir/v1/send/verify` |
| هدر احراز هویت | `X-API-KEY: <SMS_IR_API_KEY>` |
| بدنه | `{ "mobile": "09xxxxxxxxx", "templateId": <SMS_IR_TEMPLATE_ID>, "parameters": [{"name": "<SMS_IR_CODE_PARAMETER>", "value": "<otp>"}] }` |
| پاسخ موفق | `HTTP 200` (اعتبارسنجی سمت سرور + لاگ redact‌شده) |
| خطای 401 | کلید نامعتبر/منقضی → خطای واضح و **بدون retry خودکار**؛ alert به تیم |
| خطای 429 | محدودیت provider → احترام به `Retry-After`؛ fallback به پیام مناسب UI |
| خطای 5xx | timeout/retry محدود (یک بار)؛ هرگز کد را در پاسخ خطا لو نده |
| قالب (template) | باید در پنل SMS.ir فعال باشد و شامل پارامتر کد (مثلاً `{{CODE}}`) باشد؛ **فعال بودن template قبل از go بررسی شود** |

نکات امنیتی:
- کلید API فقط server-side مصرف شود (Route Handler / Server Action) — هرگز در bundle مرورگر.
- کد OTP سمت سرور تولید شود؛ نسخه‌ی hash‌شده ذخیره شود (هرگز plaintext).
- لاگ‌ها و خطاهای provider نباید `mobile` کامل یا کد را شامل شوند (رجوع به §8).

---

## 3. قرارداد endpointهای احراز هویت (منطبق بر پیاده‌سازی فعلی — به‌روزرسانی 2026-08-27)

مسیرهای canonical (تحت `/api/*` — خارج از matcher میدل‌ور i18n). سرویس از طریق seam قرارداد `src/lib/auth/types.ts` (`OtpService`) با دو implementation حل می‌شود: `mock` (dev/CI فقط، با `devCode`) و `secure` (`src/services/otpService.ts` — ارسال SMS.ir + ledger کد `PhoneOtp` + session بعد از اثبات شماره از `src/services/phoneSessionService.ts`):

| متد و مسیر | نقش | وضعیت کد (فعلی) |
|---|---|---|
| `POST /api/auth/request-code` | ارسال کد به شماره (با rate limit و cooldown) | 200 (`{ok:true, retryAfterSeconds}`، `devCode` فقط در mock) / 400 (`invalid_phone`) / 429 (`rate_limited`) / 503 (`provider_error`) |
| `POST /api/auth/verify` | تأیید کد + ساخت session (single-use، attempt limit، expiry) | 200 (`{ok:true}` — کوکی session در secure) / 400 (`invalid_phone`, `invalid_code`, `not_requested`) / 403 (`expired`, `too_many_attempts`) / 429 (`rate_limited`) / 503 (`provider_error`, `session_unavailable`) |
| `POST /api/auth/logout` | باطل‌کردن session + پاک‌کردن cookie (idempotent) | 200 (`{ok:true}`) |
| `POST /api/quiz/save` | نگهداری پاسخ کوییز به حساب کاربر | 200 / 401 |
| `POST /api/generate-program` | تولید برنامه با session cookie (رجوع به `docs/AI_API.md`) | 200 / 401 / 409 / 422 / 429 / 504 |

> ⚠️ **روت `refresh` وجود ندارد.** refresh/validation session از طریق Supabase SSR در `src/middleware.ts` (الگوی استاندارد `@supabase/ssr`: `getUser()` سشن منقضی را refresh و کوکی‌ها را بازنویسی می‌کند) انجام می‌شود. اگر در آینده route جداگانه‌ای برای refresh لازم شد، باید به‌عنوان تصمیم محصول جدا ثبت شود — نه به‌عنوان رفتاری که الان وجود دارد. دایرکتوری‌های خالی `src/app/api/auth/otp/request` و `otp/verify` روت نیستند (باقی‌مانده‌ی خالی؛ در git track نشده‌اند) و نباید مستند شوند. صفحه‌ی dashboard هم API نیست (Server Component با `AppShell`) — `GET /api/dashboard` وجود ندارد.

خطاها provider-agnostic با `code`های پایدار (`src/lib/auth/otp.ts` → `OTP_ERROR_CODES`، union در `src/lib/auth/types.ts`) و نگاشت به پیام‌های دوزبانه در `src/lib/auth/errorKeys.ts`؛ پاسخ‌های خطا به client هرگز جزئیات داخلی/کلید/کد را لو نمی‌دهند.

قراردادهای الزامی:
- **بدون service-role در client**: هویت از `createServerSupabaseClient()` + `auth.getUser()` (مسیر موجود در `src/lib/supabase-server.ts`)؛ کلید SMS.ir و service-role فقط server-side (رجوع به `src/lib/auth/otp.ts` و `src/services/otpService.ts`).
- کد: `OTP_CODE_LENGTH` رقم؛ hash شده با scrypt و salt تصادفی (`hashOtpCode`)؛ `maxAttempts` و `expiry`؛ **single-use** (`consumedAt` — مدل `PhoneOtp`).
- `requestId` (idempotency) اختیاری ۸–۶۴ کاراکتر؛ تکرار همان کلید همان challenge را برمی‌گرداند و استفاده برای شماره‌ی دیگر رد می‌شود (`REQUEST_ID_CONFLICT`).

---

## 4. Supabase: Site URL و Redirect URL 🔗

در پنل Supabase → **Authentication → URL Configuration**:

| تنظیم | مقدار |
|---|---|
| Site URL | `https://<production-domain>` (دقیقاً همان `NEXT_PUBLIC_SITE_URL`) |
| Redirect URLs | `https://<production-domain>/api/auth/callback` (در صورت استفاده از OAuth/callback) و مسیرهای بعد از لاگین (مثلاً `/fa/dashboard`, `/en/dashboard`) |
| Additional redirect | مسیرهای staging/dev در صورت نیاز — فقط دامنه‌های تحت کنترل |
| Providers | فعال‌کردن provider موردنظر (Phone/OTP یا Email) با `Redirect URLs` متناظر |

نکات:
- `NEXT_PUBLIC_SUPABASE_URL` و `ANON_KEY` باید دقیقاً متعلق به **همان پروژه‌ی production** باشند (اشتباه رایج: کپی staging).
- در صورت استفاده از آدرس ایمیل به‌جای تلفن، قالب ایمیل/تأیید دامنه‌ی فرستنده را هم تنظیم کن.

---

## 5. دامنه و HTTPS 🌐

- [ ] دامنه‌ی production خریداری‌شده و DNS به سرویس میزبانی اشاره دارد.
- [ ] گواهی TLS معتبر (Let's Encrypt / managed CDN) و **redirect خودکار HTTP→HTTPS**.
- [ ] `NEXT_PUBLIC_SITE_URL=https://<domain>` دقیقاً با دامنه‌ی deployشده یکی باشد (هم‌منشأ برای cookie و TWA).
- [ ] مسیرهای زیر با `200` روی دامنه‌ی production پاسخ دهند:
  - `/manifest.json`، `/.well-known/assetlinks.json`، `/service-worker.js` (PWA/TWA — رجوع به `docs/RELEASING.md`)
  - `/api/auth/request-code` و `/api/auth/verify` (مسیرهای canonical فعلی)
- [ ] `npx lighthouse https://<domain> --view` بدون خطای blocking.

---

## 6. تنظیمات Cookie و امنیت session 🍪

| تنظیم | مقدار توصیه‌شده |
|---|---|
| `httpOnly` | `true` برای session cookies (Supabase SSR این را مدیریت می‌کند) |
| `secure` | `true` در production (فقط HTTPS) |
| `sameSite` | `lax` (پیش‌فرض مطمئن برای SSR) |
| `path` | `/` |
| نام cookies | نام‌های پیش‌فرض Supabase (`sb-<ref>-auth-token`) — از تغییر نام بی‌دلیل پرهیز شود مگر مستند شود |
| سطح دسترسی | `createServerSupabaseClient()` فقط در Server Components / Route Handlers / Server Actions؛ هیچ client import از `next/headers` |
| Middleware | بعد از تسک ۴: refresh/validation session در middleware برای routeهای محافظت‌شده (dashboard/workout/history/analytics/challenges) |
| Headers امنیتی | `Strict-Transport-Security` (HSTS)، `X-Content-Type-Options: nosniff`، `Referrer-Policy` — با CSP موجود (`next.config.mjs`) هماهنگ شود |

---

## 7. Rate Limit ها ⏱️

پیش‌فرض‌های `getOtpPolicy()` در `src/lib/auth/otp.ts` (قابل تنظیم با env — جدول §1). در production چند-اینستنسه `RATE_LIMIT_STORE=redis` الزامی است (memory تک‌فرایندی است و با restart ریست می‌شود).

| سقف | مقدار پیش‌فرض | کلید/env |
|---|---|---|
| درخواست کد به ازای شماره | ۵ / ۱۵ دقیقه | `OTP_REQUEST_PHONE_WINDOW_MS` + `OTP_REQUEST_PHONE_LIMIT` |
| درخواست کد به ازای IP | ۱۰ / ۱۵ دقیقه | `OTP_REQUEST_IP_WINDOW_MS` + `OTP_REQUEST_IP_LIMIT` |
| تأیید کد به ازای شماره | ۵ / ۱۵ دقیقه | `OTP_VERIFY_PHONE_WINDOW_MS` + `OTP_VERIFY_PHONE_LIMIT` |
| تأیید کد به ازای IP | ۱۰ / ۱۵ دقیقه | `OTP_VERIFY_IP_WINDOW_MS` + `OTP_VERIFY_IP_LIMIT` |
| Cooldown بین دو درخواست همان شماره | ۶۰ ثانیه | `OTP_RESEND_COOLDOWN_MS` |
| تلاش verify اشتباه به ازای کد | ۵ | `OTP_MAX_ATTEMPTS` |
| expiry کد | ۱۵ دقیقه | `OTP_CODE_TTL_MS` |

- پیاده‌سازی نهایی باید از همان store اشتراکی (`src/lib/ai/rateLimitStore.ts`) استفاده کند تا رفتار در چند-اینستنس یکسان باشد.
- برای شماره‌های تست، `SMOKE_TEST_MODE` نباید محدودیت‌ها را دور بزند مگر صریحاً در staging.

---

## 8. Redaction در لاگ‌ها 🕵️

- Logger موجود (`src/lib/logger.ts`) کلیدهای حساس (`token`, `secret`, `api[_-]?key`, `authorization`, `cookie`, …) را به‌صورت بازگشتی `[REDACTED]` می‌کند — **الزام**: در لاگ‌های OTP هرگز:
  - کد کامل OTP لاگ نشود (حداکثر hash/آخرین رقم با برچسب `[REDACTED]`)
  - شماره‌ی کامل موبایل لاگ نشود — فقط با `redactPhone` (مثلاً `+989121234567` → `+98•••••34567` — پیاده‌سازی در `src/lib/auth/otp.ts`)
  - بدنه/هدر درخواست به SMS.ir با `X-API-KEY` لاگ نشود
- پیام‌های خطای بازگشتی به client نباید جزئیات داخلی (کلید، stack، پاسخ provider) را فاش کنند.
- با فعال‌شدن Sentry (`SENTRY_DSN`) هم همین redaction برقرار است؛ `errorTracker.captureException` فقط با context غیرحساس صدا زده شود.

---

## 9. رضایت شماره‌ی تست ✅

- برای هر شماره‌ای که در real smoke test پیامک واقعی دریافت می‌کند، **رضایت صریح** صاحب شماره لازم است (در ایران الزام قانونی/سازمانی دارد).
- فهرست شماره‌های تست معتبر فقط در محیط staging/محلی نگهداری شود؛ **هرگز در `.env.example` یا فایل‌های commit‌شده** (placeholder خالی بماند).
- در production نباید هیچ شماره‌ی test در تنظیمات باشد؛ کانال تست فقط با `SMOKE_TEST_MODE=mock` (بدون SMS واقعی) در دسترس باشد.
- اگر کد تست در mock mode ثابت/قابل‌حدس است، این حالت فقط با flag صریح و فقط روی محیط non-production فعال شود.

---

## 10. سناریوی Rollback 🔄

قبل از هر release، rollback باید **تک‌فرمان** باشد:

1. **Feature flag**: ورود با OTP پشت flag (`OTP_AUTH_ENABLED`) — در لحظه‌ی مشکل، flag را در production خاموش کن تا همه‌ی کاربران به حالت قبل (بدون auth اجباری) برگردند.
2. **Revert کد**: آخرین release سالم دوباره deploy شود (نیازمند `git tag`/شاخه‌ی پایدار).
3. **داده**: چون برنامه‌ی تولیدشده قبلاً در `ProgramGenerationRequest`/Prisma ذخیره می‌شود، revert کد داده‌ی کاربر را حذف نمی‌کند؛ کد OTP در DB/حافظه ذخیره نمی‌شود (فقط hash موقت) → بدون پاک‌سازی داده‌ی حساس.
4. **Session**: با خاموش‌شدن flag یا revert، کوکی‌های session قدیمی بی‌اثر می‌شوند؛ در صورت نیاز `logout` همه‌ی نشست‌ها از پنل Supabase.
5. **Decision log**: نتیجه‌ی هر go/no-go و هر rollback در `docs/TASKS.md` ثبت شود.

---

## 11. چک‌لیست Go / No-Go 🚦

**پیش از launch (همه باید ✅ باشند):**

- [x] `.env.example` کامل است و هیچ secret واقعی در git نیست (تست `otp-launch-readiness` این را می‌سنجد).
- [x] production env: `SMS_IR_API_KEY`، `SMS_IR_TEMPLATE_ID`، `NEXT_PUBLIC_SITE_URL`، Supabase URL/anon key ست شده‌اند (placeholders در git، مقادیر واقعی در اختیار کاربر).
- [x] SMS.ir: adapter پیاده‌سازی شده؛ template فعال با پارامتر کد در پنل SMS.ir نیاز است.
- [x] Supabase: Site URL و Redirect URLs دقیق نیاز است، provider فعال است، cookieها `httpOnly+secure+sameSite=lax`.
- [ ] دامنه‌ی HTTPS فعال، redirect HTTP→HTTPS، `NEXT_PUBLIC_SITE_URL` هم‌منشأ.
- [x] rate limitها با store مشترک (redis در production) و مقادیر §7 تنظیم شده‌اند.
- [x] redaction در لاگ‌ها و error tracking تأیید شده (هیچ شماره/کد کامل).
- [x] Dockerfile و docker-compose برای استقرار تک‌فرمانی آماده است.
- [ ] endpointهای §3 (request/verify/refresh/logout/quiz save/generation/dashboard) در **production** با mock و سپس real تست شده‌اند.
- [ ] rollback (flag + revert) در staging تمرین شده است.
- [ ] مسیرهای PWA/TWA روی دامنه‌ی production با 200 (رجوع به `docs/RELEASING.md`).

**No-Go اگر**:
- کلید SMS.ir نامعتبر/منقضی یا template غیرفعال باشد.
- یکی از مسیرهای §3 روی دامنه‌ی production جواب ندهد.
- کد OTP در لاگ‌ها یا پاسخ‌های خطا دیده شود.
- rate limit در production نادیده گرفته شود (store اشتراکی نباشد).
- شماره‌ی تست بدون رضایت یا در production پیامک بگیرد.

---

## 12. پلن Smoke Test (بدون SMS واقعی تا تأیید) 🧪

### ۱۲.۱ حالت mock (خودکار — بدون ارسال SMS)

- مقدار `SMOKE_TEST_MODE=mock` روی محیط تست/staging: سرویس OTP در حالت `mock` (`src/lib/auth/types.ts`) کد قطعی را در پاسخ (`devCode`) برمی‌گرداند — بدون تماس با SMS.ir؛ در production این حالت **رد می‌شود**.
- کلاینت در mock mode همان قرارداد endpointها (§3) را می‌زند؛ کد از پاسخ mock گرفته می‌شود — نه از پیامک.
- این حالت در CI در دسترس نیست (بدون auth واقعی) مگر با flag صریح `E2E_REQUIRES_AUTH=1` (طبق قرارداد `.env.example`).

**سناریوهای mock (برای E2E بعد از تسک ۱–۴):**
1. `request-code` — ارسال شماره → 200 + cooldown در درخواست دوم → 429 بعد از سقف.
2. `verify` — کد درست → session؛ کد غلط → 401؛ تکرار غلط تا `OTP_MAX_ATTEMPTS` → 410؛ استفاده‌ی مجدد از کد موفق → 401 (single-use).
3. `refresh` — session معتبر refresh می‌شود؛ بدون session → 401.
4. `logout` — session باطل و cookie پاک؛ دسترسی بعدی به dashboard → 401/redirect.
5. `quiz save` — با session ذخیره می‌شود؛ بدون session → 401.
6. `generation` — `POST /api/generate-program` با session (تست موجود را گسترش می‌دهد).
7. `dashboard` — با session داده‌ی کاربر؛ بدون session → redirect/401؛ خالی برای کاربر جدید.

### ۱۲.۲ حالت real (دستی — فقط staging با شماره‌ی رضایت‌دار)

- `SMOKE_TEST_MODE=real` + `SMOKE_TEST_PHONE` (فقط staging؛ هرگز production).
- اجرای دستی همان ۷ سناریو + بررسی: زمان دریافت SMS، صحت متن قالب، رفتار 429 واقعی provider، redaction در لاگ‌ها.
- مستندسازی نتیجه در `docs/TASKS.md` (تسک ۵ بچ ۱۴).

### ۱۲.۳ ابزار خودکار موجود (هم‌اکنون)

- `tests/otp-launch-readiness.test.ts` (با `npm test` در CI): یکپارچگی قرارداد launch را می‌سنجد —
  - وجود placeholderهای الزامی در `.env.example`؛
  - پوشش بخش‌های کلیدی این سند (verify endpoint، redirect، HTTPS، cookie، rate limit، redaction، consent، rollback، go/no-go)؛
  - عدم وجود secret واقعی در فایل‌های commit‌شده؛
  - شرط Node 22+ (`engines` در `package.json`) و نسخه‌ی Node در CI؛
  - ارجاع متقابل از `docs/RELEASING.md` و `docs/TASKS.md`.
- این تست **الان باید سبز باشد** و پس از هر تغییر در قراردادها باید به‌روزرسانی شود.
