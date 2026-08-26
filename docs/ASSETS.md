# راهنمای Unified Asset Pipeline

این سند تنها مرجع یکدست‌سازی assetهای برنامه (icon / image / video / Lottie)، قواعد resolution، fallback و policy کش است. وضعیت تسک‌ها در `docs/TASKS.md` و انتشار PWA/TWA در `docs/RELEASING.md` نگهداری می‌شود.

## ۱. ساختار و دایرکتوری‌های استاندارد

| مسیر | محتوا | وضعیت |
|---|---|---|
| `public/icons/` | آیکون‌های PWA (PNG 180/192/384/512 + maskable + SVG) | فعال |
| `public/manifest.json` | Web app manifest | فعال |
| `public/service-worker.js` | سرویس‌ورکر آفلاین | فعال |
| `public/offline.html` | صفحهٔ fallback آفلاین (کاملاً static و self-contained) | فعال |
| `public/robots.txt` | SEO robots | فعال |
| `public/.well-known/assetlinks.json` | اعتبارسنجی TWA (fingerprint placeholder) | فعال |
| `public/videos/` | ویدیوهای تمرین (`/videos/squat.mp4`) | **نام‌فضای مستند؛ هنوز فایلی ندارد** |
| `public/posters/` | پوسترهای ویدیو (`/posters/squat.jpg`) | **نام‌فضای مستند؛ هنوز فایلی ندارد** |
| `public/animations/` | انیمیشن‌های Lottie (`/animations/push-up.json`) | **نام‌فضای مستند؛ هنوز فایلی ندارد** |

قاعدهٔ کلی: **همهٔ assetهای static در `public/` با مسیر ریشه (`/...`) ارجاع داده می‌شوند** — نه import باندل‌شده. هیچ `import ... from '@/assets/...'` یا `next/image` در کد استفاده نمی‌شود؛ تصاویر و رسانه با `<img>`/`<video>` و مسیر مستقیم سرو می‌شوند.

### قواعد نام‌گذاری آیکون
- محتوای آیکون **هرگز درجا عوض نمی‌شود**: نسخهٔ جدید با نام/اندازهٔ جدید اضافه و `manifest.json` به‌روز می‌شود (به همین دلیل `Cache-Control: immutable` روی `/icons/*` امن است).
- `manifest.json` منبع حقیقت ابعاد است؛ audit تأیید می‌کند که ابعاد اعلام‌شده با فایل واقعی یکی است.

## ۲. Resolution و Fallback

### ۲.۱ `AnimationPlayer` (workout)
`src/components/workout/AnimationPlayer.tsx` بر اساس پسوند فایل renderer را انتخاب می‌کند:

- `.json` → Lottie (`lottie-react`) با `assetsPath` هم‌دایرکتوری فایل.
- `.mp4 / .webm / .ogg / .ogv / .mov / .m4v` → `<video>` بومی.
- پسوند ناشناخته → `<video>` + warning (می‌توان با prop صریح `type` override کرد).

زنجیرهٔ fallback (به‌ترتیب اولویت):
1. `prefers-reduced-motion: reduce` → بدون mount رندرر، فقط `fallbackSrc` (پوستر static).
2. افت FPS پایدار (<45fps به‌مدت ۲ ثانیه) → تعویض به `fallbackSrc` و فراخوانی `onFpsDrop`.
3. خطای fetch/decode فایل → `onError` و حفظ slot چیدمان (بدون fetch مجدد).
4. خارج از viewport بودن → pause (IntersectionObserver).

### ۲.۲ `VideoPlayer` (کتابخانهٔ تمرین)
`src/components/video/VideoPlayer.tsx`:
- `.m3u8` → hls.js (یا HLS بومی Safari/iPadOS وقتی `MediaSource` در دسترس نیست).
- سایر → `<video>` بومی.
- خطای fatal: `NETWORK_ERROR` → restart، `MEDIA_ERROR` → `recoverMediaError`، سایر → حالت خطا با دکمهٔ Retry.
- `poster` اختیاری است و از `img-src` CSP تبعیت می‌کند (نه `media-src`).

### ۲.۳ آواتار پروفایل (Supabase Storage)
بایت‌های آواتار در یک bucket **خصوصی** به نام `avatars` نگهداری می‌شوند (`src/services/avatarStorage.ts`):

- مسیر شیء: `<userId>.<ext>` — ثابت در هر آپلود مجدد (overwrite با `upsert`، بدون نسخهٔ یتیم) و جدا برای هر کاربر.
- `User.avatarUrl` در DB **مسیر شیء** را نگه می‌دارد (نه data URL)؛ هر خواندن (GET `/api/profile` و صفحهٔ پروفایل) آن را به **signed URL کوتاه‌مدت (۷ روز)** تبدیل می‌کند — bucket خصوصی است و مرورگر هرگز نمی‌تواند آواتار کاربران دیگر را حدس بزند یا فهرست بگیرد.
- ردیف‌های قدیمی که data URL (`data:image/...`) دارند بدون تغییر برمی‌گردند؛ با آپلود/حذف بعدی به مسیر storage منتقل می‌شوند.
- بدون `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (mock/dev/CI) رفتار قدیمی حفظ می‌شود: data URL در DB ذخیره می‌شود و حذف‌ها no-op هستند.
- CSP: `img-src` شامل `https://*.supabase.co` است (بخش ۳.۳)، پس signed URLها قابل رندر هستند.
- راه‌اندازی: در Supabase یک bucket خصوصی `avatars` بسازید (نیازی به RLS نیست؛ نوشتن و sign با service-role انجام می‌شود).

### ۲.۴ سرویس‌ورکر (ناوبری آفلاین)
1. `fetch(request)` — network-first.
2. شکست شبکه → `caches.match(request)` — دقیقاً همین URL اگر قبلاً باز شده باشد.
3. نبود در cache → `caches.match('/offline.html')` — صفحهٔ static fallback.

### ۲.۵ رسانهٔ دموی خارجی
کاتالوگ دموی Exercise Library از دو origin خارجی استفاده می‌کند که در CSP allowlist شده‌اند:
- `https://*.mux.dev` — استریم HLS دمو (`connect-src` + `media-src https:`).
- `https://commondatastorage.googleapis.com` — ویدیوهای mp4 دمو (`media-src https:`) و **پوسترهای jpg دمو (`img-src`)**.

> هشدار: پوسترها توسط `img-src` کنترل می‌شوند نه `media-src`؛ اگر origin جدیدی برای پوستر اضافه شد باید در `img-src` هم allowlist شود (audit این را بررسی می‌کند).

## ۳. Cache Policy

### ۳.۱ Service Worker (`public/service-worker.js`)
- نام cache نسخه‌دار: `next-pwa-cache-vN`. **در هر release که precache یا app shell عوض می‌شود، شماره را بالا ببر** تا `activate` کش‌های قدیمی را پاک کند.
- `PRECACHE_URLS` فقط فایل‌های static موجود زیر `public/`:
  `/offline.html`, `/manifest.json`, و هر ۶ آیکون PNG.
- **هرگز `'/'` یا HTML لوکال (`/en`, `/fa`) precache نمی‌شود**: ریشهٔ بدون لوکال 307-redirect به `/en` است و `cache.addAll()` روی پاسخ غیر-2xx کل install را رد می‌کند (بگ قدیمی که باعث می‌شد سرویس‌ورکر هرگز فعال نشود — حالا با `offline.html` جایگزین شده). HTML لوکال هم در هر deploy دوباره رندر می‌شود و precache آن پوستهٔ قدیمی را به chunkهای قدیمی می‌چسباند.
- ناوبری: network-first → cache → `offline.html`.
- سایر GETهای هم‌origin (آیکون، فونت، `/_next/static`, manifest): cache-first با fallback شبکه که cache را پر می‌کند (stale-while-revalidate).
- **`/api/*` هرگز intercept نمی‌شود** — پاسخ‌های API باید همیشه تازه باشند.
- ثبت سرویس‌ورکر فقط در production (کامپوننت `PWALoader` در dev بایل‌اوت می‌شود).

### ۳.۲ HTTP Cache-Control (`next.config.mjs`)
| مسیر | مقدار |
|---|---|
| `/manifest.json` | `public, max-age=3600` (+ `Content-Type: application/manifest+json`) |
| `/.well-known/assetlinks.json` | `public, max-age=3600` (+ `Access-Control-Allow-Origin: *`) |
| `/icons/:path*` | `public, max-age=31536000, immutable` |
| `/offline.html` | `public, max-age=300` |

### ۳.۳ CSP مرتبط با asset
- `img-src 'self' data: blob: https://*.supabase.co https://commondatastorage.googleapis.com`
- `media-src 'self' blob: https:`
- `connect-src 'self' … https://*.mux.dev`
- `worker-src 'self' blob:`

## ۴. Audit خودکار

- اسکریپت: `node scripts/audit-assets.mjs` (بدون وابستگی؛ خروجی non-zero هنگام violation).
- تست: `tests/asset-audit.test.ts` (در `npm test` اجرا می‌شود).
- پوشش:
  1. هر آیکون `manifest.json` موجود است و ابعاد PNG اعلام‌شده با فایل واقعی برابر است.
  2. هر ورودی `PRECACHE_URLS` در `public/` موجود است؛ `'/'` در precache ممنوع؛ `offline.html` وجود دارد؛ `/api/` بای‌پس می‌شود.
  3. `offline.html` هیچ origin خارجی یا script ندارد.
  4. `next.config.mjs` شامل allowlist پوستر/ویدیو و cache policy آیکون‌هاست.
  5. ارجاع asset هم‌origin در کد runtime `src/` باید در `public/` موجود باشد؛ ارجاع‌های داخل کامنت (مثل مثال‌های JSDoc برای `videos/`، `posters/`، `animations/`) فقط informational هستند.

## ۵. ریسک‌ها و Gapهای شناخته‌شده
- نام‌فضاهای `videos/`، `posters/`، `animations/` هنوز فایل واقعی ندارند؛ `AnimationPlayer` در runtime به دادهٔ تمرین متصل نیست (کامپوننت آماده است، مصرف‌کننده ندارد). افزودن asset واقعی به این نام‌فضاها باید با به‌روزرسانی audit و precache همراه شود.
- `assetlinks.json` فینگرپرینت SHA-256 placeholder دارد (نیازمند keystore production — خارج از حوصلهٔ این pipeline).
- سرویس‌ورکر پس از `clients.claim()` صفحهٔ باز را کنترل می‌کند؛ در production باید رفتار نسخهٔ جدید در release واقعی بررسی شود (رجوع به `docs/RELEASING.md`).
