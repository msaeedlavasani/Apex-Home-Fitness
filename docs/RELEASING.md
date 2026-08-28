# راهنمای انتشار Apex Home Fitness

> **SUPERSEDED (فقط برای روند Production release):** روند استقرار Production اکنون با تصویر immutable از کامیت دقیق، طبق `docs/RELEASE_POLICY.md` (قوانین) و `docs/FEATURE_TO_PRODUCTION.md` (runbook) انجام می‌شود و چک‌پوینت‌های تأییدشده در `docs/PRODUCTION_CHECKPOINTS.md` ثبت می‌شوند. بخش‌های `rsync`/`docker compose up --build` این فایل برای روند release فعلی منسوخ است؛ این فایل همچنان مرجع جزئیات Docker، reverse proxy، PWA/TWA و انتشار Android در Google Play باقی می‌ماند.

این فایل تنها مرجع انتشار PWA/TWA و انتشار Android در Google Play است. جزئیات API در `docs/AI_API.md`، آمادگی launch احراز هویت OTP در `docs/OTP_LAUNCH_READINESS.md` و وضعیت تسک‌ها در `docs/TASKS.md` نگهداری می‌شود.

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

## پیش‌نیازهای production

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
     #    AI_PROVIDER=groq
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

Program generation uses an explicit provider resolver. Keys never select a provider implicitly. The recommended production configuration while OpenAI credit is unavailable is:

```env
PROGRAM_GENERATOR=ai
AI_PROVIDER=groq
AI_GENERATION_FALLBACK=rules
AI_MODEL=
GROQ_API_KEY=...
GROQ_MODEL=openai/gpt-oss-120b
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Set `PROGRAM_GENERATOR=rules` to disable all external AI calls. Set `AI_PROVIDER=openai` to use OpenAI instead. `AI_MODEL`, when non-empty, overrides the provider-specific model. If the configured provider fails during generation (quota, rate limit, timeout, network, 5xx, invalid output, or configuration failure), `AI_GENERATION_FALLBACK=rules` selects the deterministic rule engine; validation, authentication, medical clearance, rate limits, idempotency, and persistence failures never trigger that fallback.

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

برای اعتبارسنجی امن، فقط وجود متغیر را (بدون چاپ مقدار) بررسی کن و سپس یک برنامه را با یک حساب تستِ واردشده بساز. مدل فعلی `gpt-4o-mini` در کد تنظیم شده و متغیر `OPENAI_MODEL` در این نسخه استفاده نمی‌شود.

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
