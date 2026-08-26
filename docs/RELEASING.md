# راهنمای انتشار Apex Home Fitness

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
     #    OPENAI_API_KEY=sk-...
     #    NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL,
     #    NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY
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
