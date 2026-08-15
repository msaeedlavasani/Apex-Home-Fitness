# RELEASING — Android (TWA) Release Checklist

How to package Apex Home Fitness as a **Trusted Web Activity (TWA)** and publish it to
Google Play, using [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).

> Target package ID: **`com.apexhomefitness.app`** (matches `public/.well-known/assetlinks.json`).

---

## 0. Release-readiness status

| Item | State | Notes |
|---|---|---|
| `public/.well-known/assetlinks.json` | ⚠️ Placeholder | Valid JSON + correct structure, but `sha256_cert_fingerprints` still says `REPLACE_WITH_SHA256_CERT_FINGERPRINT` (step 3) |
| Web app manifest (`public/manifest.json`) | ✅ Ready | name, start_url, scope `/`, display `standalone`, theme `#4F46E5`, bg `#F8FAFC`, 6 icons (any + maskable), shortcuts |
| Offline support (service worker) | ✅ Ready | `public/service-worker.js` v2, registered in prod only via `src/components/PWALoader.tsx` |
| Splash screens | ✅ Ready | Generated from manifest `background_color`/`theme_color` + 512px icon (see step 5) |
| Icons | ✅ Ready | Valid PNGs: 192/384/512 + maskable + apple-touch-icon (180) |
| `assetlinks.json` headers | ✅ Ready | `next.config.mjs` serves it as `application/json` with CORS `*` |
| Production HTTPS origin | ⚠️ Not set | Set `NEXT_PUBLIC_SITE_URL` (step 1) |
| Signing keystore | ❌ Not created | Step 2 |
| Bubblewrap project (`twa/`) | ❌ Not created | Step 4 |
| Play Console app + App Signing cert | ❌ Not created | Step 7 |

---

## 1. Web app pre-flight

- [ ] Deploy the app to a **production HTTPS domain** (e.g. Vercel/Netlify). TWA requires a valid TLS certificate on the canonical origin.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to that origin in production env (used for `metadataBase` and as the TWA `host`):
  ```bash
  NEXT_PUBLIC_SITE_URL=https://your-production-domain.example
  ```
- [ ] Verify the production build: `npm run build && npm start`
- [ ] Validate PWA quality criteria (Bubblewrap will refuse to build otherwise):
  ```bash
  npx lighthouse https://your-production-domain.example --view
  npx @bubblewrap/cli validate --url=https://your-production-domain.example
  ```
  Required: HTTPS, web app manifest with `start_url`/`scope`/icons ≥192px, and a registered service worker (all already in place — see table above).
- [ ] Confirm these URLs return 200 on the deployed domain:
  - `https://<domain>/manifest.json`
  - `https://<domain>/.well-known/assetlinks.json`
  - `https://<domain>/service-worker.js`

---

## 2. Create the signing keystore (one-time)

> ⚠️ **Keep the keystore + passwords safe and backed up.** You cannot rotate an
> upload key without contacting Play support. Never commit it to git.

```bash
mkdir -p android/keystore
keytool -genkeypair -v \
  -keystore android/keystore/apex-home-fitness.keystore \
  -alias apex-home-fitness \
  -keyalg RSA -keysize 2048 -validity 10000
```

- Store the **keystore path, alias, and both passwords** in a password manager.
- (CI alternative) Bubblewrap reads them from env vars — no interactive prompts:
  ```bash
  export BUBBLEWRAP_KEYSTORE_PASSWORD="..."
  export BUBBLEWRAP_KEY_PASSWORD="..."
  ```

---

## 3. Digital Asset Links — `public/.well-known/assetlinks.json`

The file already exists with the correct shape:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.apexhomefitness.app",
      "sha256_cert_fingerprints": ["REPLACE_WITH_SHA256_CERT_FINGERPRINT"]
    }
  }
]
```

- [ ] Replace the placeholder with the real SHA-256 fingerprint(s):
  ```bash
  keytool -list -v -keystore android/keystore/apex-home-fitness.keystore -alias apex-home-fitness \
    | grep "SHA256:"
  ```
  Paste the value (uppercase, with colons — that format is accepted) into the array.
- [ ] **Play App Signing fingerprint (critical):** if you enroll in Play App Signing
  (mandatory for new apps), devices are signed with **Google's app-signing key**, not your
  upload key. After uploading your first AAB (step 7), copy the **App signing key certificate
  fingerprint** from Play Console → *Setup → App signing* and add it to the array as well.
  Keep both fingerprints in the file — verification succeeds if **any** entry matches.
- [ ] Deploy the updated file, then verify it (takes up to a few minutes to propagate):
  ```bash
  curl -s https://<domain>/.well-known/assetlinks.json
  ```
  ```bash
  # Google's official statement-lookup API — must return the android_app target:
  curl -s "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://<domain>&relation=delegate_permission/common.handle_all_urls"
  ```
  Or use the visual checker: <https://developers.google.com/digital-asset-links/tools/generator>
- [ ] Do **not** remove this file — it is also what makes `handle_links: "auto"` in the manifest work.

---

## 4. Generate the TWA project with Bubblewrap

Prerequisites: Node.js ≥ 14.15 (present), JDK ≥ 8, Android SDK (Bubblewrap offers to
download them on first run; `npx @bubblewrap/cli doctor` validates the setup).

```bash
# Install the CLI (once)
npm i -g @bubblewrap/cli

# Generate the Android project from the live web manifest
bubblewrap init --manifest=https://<domain>/manifest.json --directory=android/twa
```

During `init` you will confirm/patch:
- **Package ID:** `com.apexhomefitness.app`
- **Host:** `https://<domain>`
- **Signing key:** point at `android/keystore/apex-home-fitness.keystore` (alias
  `apex-home-fitness`) or let Bubblewrap generate a new one.

For every later change to `twa-manifest.json` run:
```bash
bubblewrap update --manifest=android/twa
```

---

## 5. `twa-manifest.json` — recommended values for this project

| Field | Recommended value | Why |
|---|---|---|
| `packageId` | `com.apexhomefitness.app` | Must equal `package_name` in assetlinks.json |
| `host` | `https://<domain>` | Canonical origin (NEXT_PUBLIC_SITE_URL) |
| `name` / `shortName` | `Apex Home Fitness` / `Apex Fitness` | From web manifest |
| `themeColor` | `#4F46E5` | Matches manifest `theme_color` |
| `backgroundColor` | `#F8FAFC` | Matches manifest `background_color` — **splash background** |
| `display` | `standalone` (or `fullscreen` for immersive workouts) | No browser UI in the TWA |
| `orientation` | `portrait` | Matches manifest `orientation: portrait-primary` |
| `iconUrl` | `https://<domain>/icons/icon-512x512.png` | Full URL; must be ≥512×512 (maskable variant also accepted) |
| `fallbackType` | `customtabs` | Recommended default when Chrome isn't available |
| `enableNotifications` | `false` | Set `true` only after push notifications are implemented |
| `enableSiteSettingsShortcut` | `false` | Hide site-settings entry from launcher long-press |
| `appVersionName` | e.g. `1.0.0` | Android `versionName` |
| `appVersionCode` | e.g. `1` | Must increment on every upload |
| `signingKey.path` / `.alias` | `android/keystore/apex-home-fitness.keystore` / `apex-home-fitness` | Upload key (step 2) |

**Splash screens** are generated automatically at build time from `themeColor` +
`backgroundColor` + `iconUrl` — no extra assets needed. The web app's own splash
(manifest `background_color` + 512px icon) covers the PWA install path on all platforms.

---

## 6. Build & test on device

```bash
cd android/twa
bubblewrap build
```

Outputs (in `android/twa`):
- `app-release-signed.apk` — sideload/test build
- `app-release-bundle.aab` — **upload this to Google Play**

Test on a real Android device (USB debugging on):
```bash
bubblewrap install                 # installs ./app-release-signed.apk
adb shell am start -n com.apexhomefitness.app/.LauncherActivity
```

Verify:
- [ ] App launches fullscreen **without a URL bar** (means Digital Asset Links verification passed; if you see the address bar, re-check step 3 and `adb logcat | grep -i twa` for the verification error).
- [ ] Splash screen shows on cold start with brand icon + `#F8FAFC` background.
- [ ] **Offline test:** enable airplane mode → kill app → relaunch → app shell still loads (service worker).
- [ ] First-run permissions (if any), RTL layout for `fa`, workout video playback (`media-src` already allowlisted in CSP).

---

## 7. Publish to Google Play

1. **Create the app** in Play Console: *All apps → Create app* (name: *Apex Home Fitness*, package: `com.apexhomefitness.app`).
2. **Upload the AAB** (`app-release-bundle.aab`) to a track (Internal testing → then Closed/Open testing → Production).
3. **Play App Signing:** accept it; then copy the **App signing key certificate SHA-256** from *Setup → App signing* and add it to `assetlinks.json` (step 3) **before** promoting to production. Redeploy the file and re-verify.
4. Complete the store listing (graphics, screenshots, content rating, privacy policy, data safety).
5. Review the **Target API level** requirement — if needed, bump `compileSdkVersion`/`targetSdkVersion` in the generated Gradle files via `bubblewrap update` with updated Bubblewrap (which tracks current requirements).
6. Promote the release to production only after the app passes review on the Internal/Closed tracks.

---

## 8. Final go/no-go checklist

- [ ] `assetlinks.json` served at `https://<domain>/.well-known/assetlinks.json`, fingerprints include Play App Signing key (verified via DAL API)
- [ ] `manifest.json` served as `application/manifest+json`, `start_url` + `scope` = `/`, icons ≥192px present
- [ ] Service worker registered in production; offline shell verified on device
- [ ] AAB built (`app-release-bundle.aab`), signed with the upload key
- [ ] `appVersionCode` incremented from the previous release
- [ ] TWA verified (no URL bar) on ≥2 real Android devices (one Android 10-, one 11+)
- [ ] Keystore + passwords backed up safely
- [ ] Release notes written; store listing complete

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| URL bar visible / `adb logcat` shows TWA verification error | Fingerprint mismatch or assetlinks not deployed/propagated. Re-run step 3, wait, verify with the DAL API. |
| `bubblewrap build` fails on PWA validation | Run `bubblewrap validate --url=<domain>` and fix reported criteria (usually SW registration or manifest field). |
| Play rejects the AAB ("App signing key") | Ensure the app-signing (not upload) key fingerprint is in assetlinks.json. |
| Users get an old offline shell after release | Bump `CACHE_NAME` in `public/service-worker.js` (v2 → v3…) — done automatically at build; see RELEASING step 8. |
| `bubblewrap doctor` errors | `bubblewrap updateConfig --jdkPath=... --androidSdkPath=...` to point at your JDK/Android SDK. |
