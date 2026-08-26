# CI & E2E Policy 📋

> مرجع دائمی سیاست validation، طبقه‌بندی شکست و انتخاب E2E. این فایل جانشین بخش موقت «گیت اصلاح Workflow» در `HANDOFF.md` است — حذف آن بخش به معنی حذف این سیاست‌ها نیست.

## اصل محوری

> **تست درست، در لایه درست، در زمان درست — بر اساس تغییر واقعی و نوع شکست.**

- E2E یک لایه اعتبارسنجی سیستم است، نه حلقه دیباگ پیش‌فرض.
- ساب‌ایجنت‌ها «اعتماد محلی» (local confidence) می‌دهند؛ ایجنت اصلی «اعتماد یکپارچه‌سازی» (integration confidence) می‌دهد.
- هدف حذف validation اضافی است، نه کاهش تست.

## هرم اعتبارسنجی

```text
                    FULL E2E          ← شبانه / release / تغییرات پرریسک
                 ─────────────
               TARGETED E2E           ← مسیرهای affected
              ───────────────
              CONTRACT / API
             ─────────────────
           INTEGRATION TESTS
          ───────────────────
              UNIT TESTS
          ───────────────────
          STATIC (lint/typecheck)
```

## مسیر هر کامیت (push روی main) — `.github/workflows/ci.yml`

| مرحله | دستور | زمان تقریبی |
|---|---|---|
| Install + Prisma | `npm ci` + generate/migrate | ~۱ دقیقه |
| Static | `npm run lint` + `npm run typecheck` | ~۳۰ ثانیه |
| Unit | `npm test` | ~۱۰ ثانیه |
| Build | `npm run build` | ~۱-۲ دقیقه |
| E2E auth (mock OTP) | `npm run test:e2e:auth` با `AUTH_OTP_MODE=mock` | ~۱ دقیقه |
| E2E smoke (مسیر اصلی) | `npm run test:e2e:smoke` | ~۳۵ ثانیه |

**E2E کامل در مسیر هر کامیت اجرا نمی‌شود.** سوئیت کامل (۱۰۰+ تست) در `.github/workflows/ci-full-e2e.yml` — شبانه (۲۲:۰۰ UTC) و دستی (`workflow_dispatch`) برای release/high-risk — اجرا می‌شود.

## اسکریپت‌های هدفمند

| اسکریپت | پوشش |
|---|---|
| `test:e2e:smoke` | `main-flows.spec.ts` — سفر اصلی کاربر (بدون auth) |
| `test:e2e:auth` | `auth-flow.spec.ts` — با `AUTH_OTP_MODE=mock` (بدون silent skip) |
| `test:e2e:quiz` | main-flows + rest-days + quiz-contrast |
| `test:e2e:full` | کل سوئیت |

## طبقه‌بندی شکست قبل از rerun

هر شکست E2E باید در یکی از این دسته‌ها طبقه‌بندی شود؛ بعد از هر failure، full E2E به‌صورت خودکار تکرار نمی‌شود:

| دسته | اقدام |
|---|---|
| **Application Bug** | بازتولید در ارزان‌ترین لایه (unit/integration) → regression test → fix → targeted E2E |
| **Test Bug** | اصلاح همان spec → اجرای همان spec |
| **Environment/Infra** | ریست سرور/کش/پورت/env → اجرای targeted suite |
| **Flaky Test** | ثبت flake + حداکثر rerun محدود؛ retry نامحدود ممنوع |
| **Expected Behavior Change** | به‌روزرسانی contract و تست مرتبط → کوچک‌ترین مجموعه validation |

## سیاست Retry

- retry جایگزین تشخیص نیست؛ فقط برای شکست‌های احتمالی گذرا یا محیطی.
- Playwright در CI: `retries: 2`، `workers: 1`.
- افزایش worker فقط پس از benchmark (افزایش کورکورانه ممنوع).

## نقشه تغییر → E2E هدفمند

| ناحیه تغییر | تست‌های پیشنهادی |
|---|---|
| auth/session/middleware | `auth-flow.spec.ts` |
| Landing/Quiz/draft/generation | `main-flows.spec.ts` |
| RTL/responsive | `rtl-layout.spec.ts`, `responsive-layout.spec.ts` |
| keyboard/ARIA | `keyboard-focus.spec.ts`, `accessibility-aria.spec.ts` |
| Profile | `profile-shell.spec.ts`، `profile-features.spec.ts` (full-auth — نیازمند `E2E_REQUIRES_AUTH=1`) |
| FAQ | `faq.spec.ts` |
| rest-days/calendar | `rest-days.spec.ts`, `week-calendar-order.spec.ts` |
| workout/offline | `workout-route.spec.ts`, `offline-pwa.spec.ts` |
| global chrome (header/sidebar) | `responsive-layout.spec.ts`, `keyboard-focus.spec.ts` |

## Auth Coverage در CI

- `AUTH_OTP_MODE=mock` در job e2e تنظیم شده — مسیر auth دیگر silently skip نمی‌شود.
- mock هرگز session/SMS جعلی production نمی‌سازد؛ فقط route protection و UI OTP را بدون credentials اجرا می‌کند (در صورت نبود Supabase، login API صادقانه 503 می‌دهد).
- full provider journey با SMS.ir/Supabase فقط در staging/manual/nightly با GitHub Environment secrets.
- تست «request → verify → dashboard → logout» عمداً skip است تا provider واقعی تنظیم شود.
- `tests/profile-features.spec.ts`: مسیر full-auth (نمایش شماره + آپلود/حذف آواتار) با `E2E_REQUIRES_AUTH=1` گیت شده و بدون آن transparently skip می‌شود؛ تست signed-out گیتینگ همیشه در سوئیت اجرا می‌شود.

## Benchmark (ثبت 2026-08-16، Node 22.23.1)

| مرحله | مدت |
|---|---|
| unit (319 تست) | ~۱۰ ثانیه |
| unit (336 تست پس از بچ ۱۵) | ~۸ ثانیه |
| unit (387 تست پس از بچ ۱۷) | ~۲۰ ثانیه |
| build | ~۱-۲ دقیقه |
| E2E auth (mock) | ~۵۳ ثانیه |
| E2E smoke (main-flows) | ~۳۴ ثانیه |
| responsive-layout (۲۴ تست، workers=1) | ~۱.۳ دقیقه |
| full E2E (workers=1، شرایط CI) | ~۴.۶ دقیقه |
| full E2E (موازی محلی) | ~۲.۱ دقیقه |

## Observability

ردیابی: مدت سوئیت‌ها، تعداد اجراهای full E2E در هر بچ، شکست‌ها به تفکیک دسته، تعداد flake و زمان تشخیص شکست. از این متریک‌ها برای تأیید بهبود throughput استفاده شود.
