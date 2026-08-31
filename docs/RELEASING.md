# راهنمای انتشار Apex Home Fitness

> **SUPERSEDED (فقط برای روند Production release):** روند استقرار Production اکنون با تصویر immutable از کامیت دقیق، طبق `docs/RELEASE_POLICY.md` (قوانین) و `docs/FEATURE_TO_PRODUCTION.md` (runbook) انجام می‌شود و چک‌پوینت‌های تأییدشده در `docs/PRODUCTION_CHECKPOINTS.md` ثبت می‌شوند. بخش‌های `rsync`/`docker compose up --build` این فایل برای روند release فعلی منسوخ است؛ این فایل همچنان مرجع جزئیات Docker، reverse proxy، PWA/TWA و انتشار Android در Google Play باقی می‌ماند.

این فایل مرجع پشتیبان جزئیات Docker، reverse proxy، PWA/TWA و Android است. قواعد normative انتشار در `docs/RELEASE_POLICY.md`، ترتیب اجرایی در `docs/FEATURE_TO_PRODUCTION.md`، و وضعیت/چک‌پوینت در اسناد مربوطه نگهداری می‌شود؛ این فایل نباید lifecycle یا authority مستقلی تعریف کند. جزئیات API در `docs/AI_API.md`، آمادگی launch احراز هویت OTP در `docs/OTP_LAUNCH_READINESS.md` و وضعیت تسک‌ها در `docs/TASKS.md` نگهداری می‌شود.

## وضعیت فعلی انتشار

| مورد | وضعیت |
|---|---|
| Manifest و آیکون‌های PWA | آماده |
| Service worker production | پیاده‌سازی شده؛ نصب واقعی باید روی دامنه production بررسی شود |
| `assetlinks.json` | ساختار آماده، fingerprint هنوز placeholder است |
| دامنه HTTPS production | باید تنظیم شود (`NEXT_PUBLIC_SITE_URL`) |
| keystore امضای Android | ساخته نشده |
| پروژه Bubblewrap/TWA | ساخته نشده |
| Play Console و App Signing | ساخته نشده |

## وضعیت preflight فعلی (2026-08-27)

`main` هدف release در `51d00320856e0bff26201fcf135909bf712b0951` است. Production فعلی با marker `27c5ec3` اجرا می‌شود؛ این SHA در تاریخچه‌ی checkout فعلی موجود نیست، بنابراین تطبیق دقیق commit باید پیش از release با artifact/marker مالکانه تأیید شود. وضعیت live قبل از mutation: کانتینر Apex و reverse proxy سالم و در حال اجرا، SQLite integrity برابر `ok`، اما Production روی 11 migration است و migration canonical Exercise در repository هنوز pending است. S03 هنوز در Production deploy نشده است.

`RELEASE_DECISION: GO_WITH_PREREQUISITES` فقط پس از تکمیل backup معتبر، build/validation دقیق target، migration S02، بررسی env/AI/OTP و smokeهای مجاز. این سند برنامه‌ی release است؛ هیچ دستور این بخش بدون owner approval اجرا نشود.

## Production server bootstrap / rebuild from zero

این بخش مرجع canonical برای جایگزینی یا بازسازی سرور است. مقادیر secret هرگز در repository نگهداری نمی‌شوند.

### فرض‌ها و دسترسی SSH

- سرور Linux با دسترسی root یا کاربر deployment، Docker Engine و Compose plugin، فضای کافی، DNS خروجی و دسترسی HTTPS به registryها و providerها لازم دارد.
- نمونه‌ی فعلی host-specific (فقط context جاری): `ssh -i /.ssh/msaeed root@85.198.16.251`. مسیر key و خود host دائمی نیستند و نباید در سرور جدید فرض شوند.
- الگوی آینده: `ssh -i <approved-private-key> root@<production-host>`. کلید باید خارج از git و secret management باشد؛ host key، IP و مسیر کلید در replacement ممکن است تغییر کند.

### پیش‌نیازهای OS و Docker

1. OS پشتیبانی‌شده، دسترسی SSH، DNS و outbound HTTPS را فراهم کن.
2. Docker Engine و `docker compose` plugin را از منبع مورد تأیید نصب و نسخه/دسترسی را ثبت کن؛ Node روی host لازم نیست چون build داخل Node 22 Alpine image انجام می‌شود.
3. پورت داخلی app برابر 3000 است؛ reverse proxy باید فقط مسیر Apex را به app forward کند. پورت‌های 80/443 برای proxy و TLS لازم‌اند.
4. دایرکتوری `/opt/apexhomefit/app-new/` را برای checkout/rsync ایجاد کن و `backups/` را جدا از volume live نگه دار.

### همگام‌سازی، env و secret

- source دقیق target را با rsync/checkout کنترل‌شده منتقل کن؛ قبل از release SHA را ثبت کن.
- `.env` را از secret manager یا فرآیند owner-approved روی سرور provision کن؛ commit نکن و permission محدود بده.
- متغیرهای required/conditional را از جدول پایین کامل کن؛ مقدارها در گزارش/terminal چاپ نشوند.
- برای Supabase، Site URL/redirect و bucket خصوصی `avatars` را در پروژه‌ی درست آماده کن. برای SMS.ir template فعال و parameter هماهنگ لازم است. برای AI، provider و fallback را آگاهانه انتخاب کن. در multi-instance، Redis برای rate limit لازم است.

### npm registry/mirror و Docker build

در این repository تنظیم پیش‌فرض build از Compose به Dockerfile با `NPM_REGISTRY` می‌رسد. Compose فعلی default را به `https://package-mirror.liara.ir/repository/npm/` می‌گذارد؛ Dockerfile با `npm ci --registry="${NPM_REGISTRY}" --replace-registry-host=always` lockfile tarball hostها را نیز به registry انتخابی می‌برد. این mirror عمومی/بدون credential در configuration مشاهده‌شده است، اما availability آن تضمین‌شده نیست.

- این setting در build stageهای `deps` و `app` اعمال می‌شود؛ runtime container registry مصرف نمی‌کند.
- روی سرور فعلی `npm config get registry` برابر `https://mirror2.chabokan.net/npm/` بود، اما `.env` پروژه `NPM_REGISTRY` تعیین نکرده بود؛ بنابراین Compose default فعلی برای build بعدی `package-mirror.liara.ir` است، نه الزاماً registry host-level. این دو را قاطی نکن.
- strategy فعلی: `PRIMARY_CUSTOM_MIRROR_WITH_MANUAL_FALLBACK`؛ fallback خودکار در Dockerfile/Compose وجود ندارد. اگر mirror شکست خورد، ابتدا DNS/TLS/HTTP reachability را با ابزار read-only بررسی کن؛ سپس فقط با owner approval، `NPM_REGISTRY=https://registry.npmjs.org/` یا mirror approved را در همان build command تعیین کن. registry را silently عوض نکن و lockfile را تغییر نده.
- verification نمونه (بدون تغییر): `docker build --build-arg NPM_REGISTRY=<approved-registry> --target build .` فقط در release environment پس از approval؛ در این preflight اجرا نشد. روی host، `npm config get registry` فقط host npm را نشان می‌دهد و build arg را تعیین نمی‌کند.

### Build, volume و migration

- Compose `migrate` و `app` را با همان source و env اجرا می‌کند؛ هر دو `db-data` را به `/data` mount می‌کنند. `migrate` با `npx prisma migrate deploy` قبل از app completion اجرا می‌شود و app روی port 3000 بالا می‌آید.
- Existing DB path: volume `app-new_db-data` و `/data/app.db` را از backup معتبر restore کن؛ قبل از app، SQLite integrity و `_prisma_migrations` را read-only بررسی کن؛ فقط migrationهای approved pending را اجرا کن.
- Fresh DB path: volume خالی و persistent بساز؛ migration service همه‌ی migrationهای repository را به ترتیب اجرا کند؛ سپس schema/migration state را بررسی و app را deploy کن.
- S02 migration nullable `slug`/`faName` و unique nullable slug index است؛ backfill ندارد. SQLite Program table rebuild دارد و lock/maintenance window لازم است. هیچ backfill تاریخی در bootstrap اجرا نمی‌شود مگر task جدا و owner-approved.

### Reverse proxy, TLS و سرویس‌های خارجی

- DNS را به host جدید point کن؛ Nginx/Caddy را با domain canonical، HTTP→HTTPS redirect، certificate معتبر و proxy به app:3000 provision کن. فعلی canonical domain `apexhomefit.ir` و `www.apexhomefit.ir` در Nginx مشاهده شد؛ replacement باید مستقل verify شود.
- Supabase URL/anon/service-role را از محیط امن provision کن؛ Storage bucket خصوصی `avatars` را بساز/تأیید کن.
- SMS.ir API key/template/parameter و consented smoke account را آماده کن؛ OTP mock در Production نباید فعال بماند.
- `AI_PROVIDER=openai` و `AI_GENERATION_FALLBACK=rules` وضعیت فعلی مستندشده‌اند، اما OpenAI credit/provider reachability باید قبل از release verify شود؛ rules fallback باید independently test شود.

### Health, smoke، backup و rollback acceptance

- Health: کانتینرهای Apex، proxy، disk/memory، HTTPS/static routes، app logs و SQLite integrity را ثبت کن؛ سرویس‌های همسایه را تغییر نده.
- Smoke: ابتدا non-mutating routes؛ سپس فقط با owner approval و test account رضایت‌دار OTP/auth، generation، workout lifecycle، hydration/persistence و S02 identity را اجرا کن.
- Backup: پیش از اولین mutation از DB، current env/config، current deployed marker/artifact، Compose/proxy/TLS recovery material backup بگیر و checksum/readability را ثبت کن.
- Rollback: exact prior artifact/marker و DB backup باید موجود باشد. برای این additive migration اول app rollback و حفظ schema را ترجیح بده؛ restore DB فقط در corruption/integrity loss.
- Acceptance: target SHA marker در `/opt/apexhomefit/app-new/.deployed-commit`، migration state بدون failure، health پایدار، smoke green، و owner release record ثبت شده باشد.

### Secret-safe Production environment checklist

Required: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OTP_AUTH_ENABLED`, `AUTH_OTP_MODE`, `PROGRAM_GENERATOR`, `AI_PROVIDER`, `AI_GENERATION_FALLBACK`, `OPENAI_API_KEY` or approved provider key, `SMS_IR_API_KEY`, `SMS_IR_TEMPLATE_ID`.

Conditional: `SMS_IR_API_BASE_URL`, `SMS_IR_CODE_PARAMETER`, `SMS_IR_TIMEOUT_MS`, `OTP_CODE_LENGTH`, `OTP_CODE_TTL_MS`, `OTP_RESEND_COOLDOWN_MS`, `OTP_MAX_ATTEMPTS`, `OTP_*_WINDOW_MS`, `OTP_*_LIMIT`, `RATE_LIMIT_STORE`, `REDIS_REST_URL`, `REDIS_REST_TOKEN`, `OPENAI_MODEL`, `GROQ_MODEL`, `AI_MODEL`, `AI_FALLBACK_PROVIDER`, `GROQ_API_KEY`, `AUTH_OTP_MOCK_IN_PRODUCTION`, `AUTH_OTP_MOCK_PHONES`, `SMOKE_TEST_MODE`, `SMOKE_TEST_PHONE`.

Optional: `NEXT_PUBLIC_RELEASE`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`.

`AUTH_OTP_MOCK_IN_PRODUCTION=true` and any production mock allowlist are release blockers unless explicitly limited to a controlled, non-public test window and owner-approved; default public release requires mock disabled.


1. اپ را روی دامنه HTTPS مستقر کن.
2. در محیط production تنظیم کن:
   ```env
   NEXT_PUBLIC_SITE_URL=https://your-production-domain.example
   ```
3. این مسیرها باید روی دامنه production با status `200` در دسترس باشند:
   - `/manifest.json`
   - `/.well-known/assetlinks.json`
   - `/service-worker.js`
4. استقرار (Deployment):
   - **روش پیشنهادی: Docker (Self-hosted)**:
     ```bash
     # 1. کپی env و تنظیم مقادیر واقعی (دیتابیس خودکار در volume ذخیره می‌شود)
     cp .env.example .env
     
     # 2. Set server-only secrets in .env (never commit this file), including:
     #    PROGRAM_GENERATOR=ai
     #    AI_PROVIDER=openai   (current operational state; Groq is supported but
     #                          unavailable from the current Iranian egress)
     #    AI_GENERATION_FALLBACK=rules
     #    GROQ_API_KEY=... and GROQ_MODEL=openai/gpt-oss-120b
     #    OPENAI_API_KEY=... and OPENAI_MODEL=gpt-4o-mini (optional alternate)
     #    NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL,
     #    NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY
     #    (for avatars, also create the private Supabase Storage bucket `avatars` — see below)
     # 3. Build and run (includes database migrations)
     docker compose up --build -d
     ```
     اپ روی پورت ۳۰۰۰ بالا می‌آید. یک Reverse Proxy (مثل Nginx یا Caddy) جلوی آن قرار بده و HTTPS را فعال کن.
   - **روش دستی (بدون Docker)**:
     ```bash
     npm ci
     npx prisma generate
     npx prisma migrate deploy
     npm run build
     npm start
     ```
5. در صورت نیاز با Lighthouse و Bubblewrap اعتبارسنجی کن:
   ```bash
   npx lighthouse https://your-production-domain.example --view
   npx @bubblewrap/cli validate --url=https://your-production-domain.example
   ```

### Provider configuration and program generation

Program generation uses an explicit provider resolver. Keys never select a provider implicitly.

> **Current operational state (2026-08-27):** production uses `AI_PROVIDER=openai`. Groq remains a **supported provider** whose current use from the existing production environment is **unavailable** — Groq geo-blocks the Iranian egress IP (HTTP 403), so a Groq-configured production would always fall back to the rules engine. This is a CURRENT OPERATIONAL STATE, not a permanent architectural commitment; Groq is not documented as "must never be used". Revisit this section when the egress situation or provider setup changes.

Current production configuration:

```env
PROGRAM_GENERATOR=ai
AI_PROVIDER=openai
AI_GENERATION_FALLBACK=rules
AI_MODEL=
GROQ_API_KEY=            # valid key, but unusable from the current Iranian egress (geo-block)
GROQ_MODEL=openai/gpt-oss-120b
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

Set `PROGRAM_GENERATOR=rules` to disable all external AI calls. Set `AI_PROVIDER=groq` to use Groq instead (only where the egress permits it). `AI_MODEL`, when non-empty, overrides the provider-specific model (`GROQ_MODEL` / `OPENAI_MODEL`, which are both honored by the code — default `openai/gpt-oss-120b` and `gpt-4o-mini` respectively). If the configured provider fails during generation (quota, rate limit, timeout, network, 5xx, invalid output, or configuration failure), `AI_GENERATION_FALLBACK=rules` selects the deterministic rule engine; validation, authentication, medical clearance, rate limits, idempotency, and persistence failures never trigger that fallback.

`GROQ_API_KEY` and `OPENAI_API_KEY` are server-only. Keep them only in `/opt/apexhomefit/app-new/.env`, set that file to mode `600`, and recreate only the app service after changing them:

```bash
chmod 600 /opt/apexhomefit/app-new/.env
cd /opt/apexhomefit/app-new
docker compose up -d --no-deps --force-recreate app
```

For a safe provider check, inspect only the presence of the selected env and the runtime model name; never print a key, prompt, provider response, or quiz payload. An opt-in real smoke test may use `RUN_AI_PROVIDER_SMOKE=1` outside CI and only with a consenting test account.

### Editable profile, rest days and avatar storage

The profile API allows editing the display name, contact email, height, current weight, goals, level, exercise styles, equipment, and rest days (1–3 weekdays). The verified phone identity remains immutable. Every non-null weight update also creates a `WeightEntry` record, so repeated updates form a chronological history used by the profile and analytics.

Regenerating the program (a quiz re-run or a preferences save, including rest-day changes) **updates the user's existing `Program` in place** (same `Program.id`, replaced schedule / rest days / exercise links) — `WorkoutSession` history stays attached and no orphaned program rows accumulate.

Avatars use **Supabase Storage**: create a PRIVATE bucket named `avatars` (objects `<userId>.<ext>`, served via short-lived signed URLs — no RLS needed, writes/signing run with the service-role key). `User.avatarUrl` stores the object path; legacy data-URL rows keep working; without `SUPABASE_SERVICE_ROLE_KEY` the app falls back to storing the avatar data URL in the DB (dev/mock only). See `docs/ASSETS.md` §۲.۳.

Prisma migrations must be applied before starting the app (`npx prisma migrate deploy` — includes `20260827000000_add_user_avatar`).

### کلید OpenAI و تولید برنامه

`OPENAI_API_KEY` فقط برای `POST /api/generate-program` لازم است و باید فقط در فایل ignored زیر روی سرور قرار بگیرد:

```text
/opt/apexhomefit/app-new/.env
```

از نام دقیق زیر استفاده کن؛ آن را با `NEXT_PUBLIC_` شروع نکن و مقدار کلید را در git، چت یا log قرار نده:

```env
OPENAI_API_KEY=sk-...
```

پس از تغییر `.env`، فقط app را recreate کن تا env جدید وارد کانتینر شود:

```bash
cd /opt/apexhomefit/app-new
docker compose up -d --no-deps --force-recreate app
```

برای اعتبارسنجی امن، فقط وجود متغیر را (بدون چاپ مقدار) بررسی کن و سپس یک برنامه را با یک حساب تستِ واردشده بساز. `OPENAI_MODEL` (پیش‌فرض `gpt-4o-mini`) توسط کد خوانده می‌شود و `AI_MODEL` در صورت غیرخالی بودن آن را override می‌کند.

## Digital Asset Links

فایل `public/.well-known/assetlinks.json` باید package ID زیر را داشته باشد:

```text
com.apexhomefitness.app
```

پس از ساخت keystore fingerprint را بگیر و placeholder را جایگزین کن:

```bash
keytool -list -v \
  -keystore android/keystore/apex-home-fitness.keystore \
  -alias apex-home-fitness | grep "SHA256:"
```

اگر Play App Signing فعال شد، fingerprint مربوط به **App signing key** را هم به آرایه اضافه کن؛ upload key و app-signing key می‌توانند متفاوت باشند. پس از deploy، نتیجه را با Digital Asset Links API بررسی کن.

## ساخت TWA

```bash
npm i -g @bubblewrap/cli
npx @bubblewrap/cli doctor
bubblewrap init --manifest=https://<domain>/manifest.json --directory=android/twa
```

مقادیر مهم:

- `packageId`: `com.apexhomefitness.app`
- `host`: همان `NEXT_PUBLIC_SITE_URL`
- `display`: `standalone`
- `orientation`: `portrait`
- `enableNotifications`: تا زمان پیاده‌سازی push notification مقدار `false`

بعد از تغییر manifest:

```bash
bubblewrap update --manifest=android/twa
```

## keystore

keystore و رمزهای آن را هرگز commit نکن. آن‌ها را در password manager نگهداری کن:

```bash
mkdir -p android/keystore
keytool -genkeypair -v \
  -keystore android/keystore/apex-home-fitness.keystore \
  -alias apex-home-fitness \
  -keyalg RSA -keysize 2048 -validity 10000
```

## build و تست Android

```bash
cd android/twa
bubblewrap build
bubblewrap install
adb shell am start -n com.apexhomefitness.app/.LauncherActivity
```

قبل از انتشار بررسی کن:

- URL bar نمایش داده نشود؛ یعنی Digital Asset Links تأیید شده است.
- splash screen، RTL فارسی و playback ویدیو درست باشند.
- حالت airplane mode بعد از kill و relaunch، shell آفلاین را حفظ کند.
- `appVersionCode` در هر upload افزایش یابد.

## انتشار Google Play

1. اپ را در Play Console با package ID `com.apexhomefitness.app` ایجاد کن.
2. فایل `app-release-bundle.aab` را ابتدا در Internal testing آپلود کن.
3. Play App Signing را فعال و fingerprint آن را به `assetlinks.json` اضافه کن.
4. store listing، screenshots، privacy policy، content rating و data safety را تکمیل کن.
5. پس از تست Internal/Closed، نسخه را به Production promote کن.

## چک‌لیست go/no-go

> آمادگی launch احراز هویت OTP (SMS.ir، Supabase، envها، rate limit، redaction، rollback و smoke test) در `docs/OTP_LAUNCH_READINESS.md` است و با `tests/otp-launch-readiness.test.ts` در CI بررسی می‌شود.

- [ ] HTTPS و `NEXT_PUBLIC_SITE_URL` فعال است.
- [ ] manifest، service worker و asset links روی دامنه production با status `200` هستند.
- [ ] fingerprint upload و Play App Signing در asset links ثبت شده است.
- [ ] AAB با keystore معتبر ساخته شده است.
- [ ] تست روی حداقل دو دستگاه Android انجام شده است.
- [ ] keystore و رمزها backup امن دارند.
- [ ] release notes و store listing کامل هستند.

## عیب‌یابی کوتاه

- **URL bar دیده می‌شود:** fingerprint یا asset links اشتباه/قدیمی است؛ Digital Asset Links API را بررسی کن.
- **Bubblewrap validation شکست می‌خورد:** HTTPS، manifest، iconها و service worker production را بررسی کن.
- **offline shell قدیمی است:** مقدار `CACHE_NAME` در `public/service-worker.js` را افزایش بده.
- **build در محیط محدود (Docker) شکست می‌خورد:** تمامی فونت‌ها (Inter, Roboto, Vazirmatn) برای پایداری و استقلال از اینترنت به صورت self-host در `src/app/fonts/` قرار دارند؛ اطمینان حاصل کن که هدر CSP در `next.config.mjs` اجازه `font-src 'self'` را می‌دهد.
- **Bubblewrap doctor خطا می‌دهد:** مسیر JDK و Android SDK را با `bubblewrap updateConfig` تنظیم کن.

# Autonomous Production operations target

> **DECISION: ACCEPTED AND PROMOTED TO ACTIVE `AUTONOMOUS-PROD-OPS-01`**

`AUTONOMOUS-PROD-OPS-01` is the owner-authorized requirement to remove routine
manual Owner commands from the Production deployment lifecycle. The active
task must define a narrowly constrained deployment gateway or
equivalent capability that validates approved immutable source/artifact
identity, consumes protected environment internally without returning secret
values, preserves rollback and database invariants, performs health evidence,
and does not grant the agent arbitrary root shell access.

The acceptance proof is a complete authorized Apex Home Fit Production release
that reaches `CLOSED` without the Owner manually running SSH, sudo, Docker,
Compose, migration, provisioning, or deployment commands. This ops capability
must not be bundled with Admin Console feature implementation.
