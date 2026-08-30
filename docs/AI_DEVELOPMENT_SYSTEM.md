# Apex Autonomous Development System

> نسخه ۱ — قرارداد workflow توسعه؛ authority و lifecycle در اسناد canonical ارجاع‌شده است.

این سند workflow توسعه‌ی مختص Apex Home Fitness را خلاصه می‌کند؛ authority، lifecycle و reporting در اسناد canonical ارجاع‌شده تعریف می‌شوند و این فایل policy موازی ایجاد نمی‌کند.

> **نقش این سند (تفکیک A-05):** `AGENTS.md` مرجع AUTHORITATIVE رفتار agent و قواعد توسعه‌ی ریپو است؛ این سند فقط فرایند/workflow را توصیف می‌کند و در تعارض، `AGENTS.md` بر آن مقدم است. قواعد governance مستندات در `docs/governance/DOCUMENTATION-GOVERNANCE.md` است.

## Authority and consumption

`AGENTS.md` و `docs/governance/DOCUMENTATION-GOVERNANCE.md` مالک رفتار agent و read order هستند. `docs/RELEASE_POLICY.md` مالک قواعد release، `docs/FEATURE_TO_PRODUCTION.md` مالک runbook، و `docs/PITFALL_GUARDRAILS.md` registry تابع guardrail است. این سند workflow مکمل است و نباید این قواعد را دوباره تعریف کند.

## 1. مرزهای سیستم

### مجاز

- تحلیل issue، کد، تست و مستندات موجود
- پیشنهاد کوچک‌ترین تغییر قابل‌آزمون
- اجرای lint، typecheck، unit، audit و E2E متناسب با دامنه‌ی تغییر
- ساخت گزارش تغییر و ثبت بدهی فنی
- تولید PR با توضیح ریسک و rollback

### غیرمجاز بدون تأیید انسانی

- تغییر secret یا خواندن مقدار آن
- تغییر database یا تغییر سرویس‌های همسایه خارج از scope
- فعال‌کردن SMS واقعی یا خاموش‌کردن emergency mock بدون smoke test
- حذف فایل مگر اینکه generated، unused و بدون reference بودن آن اثبات شده باشد

## 2. مدل دانش پروژه

| حوزه | منبع مرجع |
|---|---|
| مسیر محصول | `README.md`، `docs/product/PRODUCT-VISION.md` و `docs/HANDOFF.md` |
| ویژن محصول (تمرین V2) | `docs/product/WORKOUT-EXPERIENCE-V2.md` (NOT YET IMPLEMENTED) |
| backlog و بدهی | `docs/TASKS.md` |
| auth/OTP و Go-No-Go | `docs/OTP_LAUNCH_READINESS.md` |
| AI generation contract | `docs/AI_API.md` و `infra/ai/prompts/` |
| UI و accessibility | `docs/DESIGN_SYSTEM.md` |
| سیاست انتشار (authoritative) | `docs/RELEASE_POLICY.md` + `docs/BRANCHING_POLICY.md` |
| runbook اجرایی Feature → Production | `docs/FEATURE_TO_PRODUCTION.md` |
| وضعیت فعلی و چک‌پوینت‌ها | `docs/CURRENT_STATE.md` + `docs/PRODUCTION_CHECKPOINTS.md` |
| قرارداد env | `docs/ENVIRONMENT_CONTRACT.md` |
| جزئیات Docker/proxy/PWA/TWA/Android | `docs/RELEASING.md` |
| governance مستندات و ترتیب مطالعه | `docs/governance/DOCUMENTATION-GOVERNANCE.md` |
| تصمیم‌های معماری | `docs/adr/` (مکانیزم؛ ADRهای پذیرفته‌شده فعلی 0001–0003) |
| validation | `docs/CI.md` و scripts audit |
| درس‌های تکرارپذیر | `docs/PITFALLS/` |

Agent باید read order canonical در `docs/governance/DOCUMENTATION-GOVERNANCE.md` را دنبال کند و در صورت تناقض، از همان hierarchy پیروی و آن را در گزارش ثبت کند.

## 3. چرخه‌ی اجرای هر تغییر

این بخش workflow خلاصه‌شده است؛ lifecycle canonical و تعریف `CLOSED` در `docs/RELEASE_POLICY.md` و `docs/governance/DOCUMENTATION-GOVERNANCE.md` مالکیت دارد.

Lifecycle vocabulary و تعریف `CLOSED` در `docs/RELEASE_POLICY.md` و `docs/BRANCHING_POLICY.md` canonical است؛ این بخش فقط workflow را خلاصه می‌کند.

> CI سبز به‌تنهایی به معنی COMPLETE بودن تسک نیست؛ تسک فقط پس از چک‌پوینت Production، ادغام در main و retire برنچ CLOSED می‌شود (Rule 1/2 و BRANCHING_POLICY).

```text
Discover → Pre-Task Gate → Plan → Implement → Validate → Branch CI →
Release Readiness → Production Checkpoint → Mainline Integration →
Closure → Owner Authorization
```

### Discover

1. وضعیت git و تغییرات موجود را حفظ کن.
2. مسیرهای مرتبط، قراردادهای env و تست‌های نزدیک را پیدا کن.
3. اثر تغییر را روی auth، داده، AI، offline، RTL و deployment مشخص کن.

### Classify

تغییر یکی از این دسته‌هاست:

- `ui`: ظاهر، responsive، RTL، accessibility
- `domain`: quiz، workout، gamification، برنامه‌سازی
- `auth`: OTP، session، route protection
- `ai`: prompt، schema، مدل، safety guard
- `data`: Prisma، migration، persistence، sync
- `infra`: Docker، CI، PWA، release
- `docs`: مستندات و قراردادها

### Plan

برای هر تغییر باید این چهار مورد روشن باشد:

- invariantهایی که نباید بشکنند
- تستی که failure را آشکار می‌کند
- rollback کوچک و امن
- سند مرجعی که باید به‌روزرسانی شود

### Implement

- ابتدا کم‌ریسک‌ترین لایه را تغییر بده.
- از feature flag برای رفتارهای پرریسک یا موقت استفاده کن.
- secret را وارد log، response، تست یا مستندات نکن.
- منطق server-only را از Client Component و middleware جدا نگه دار.
- در تغییر UI، مسیرهای `en` و `fa`، RTL، keyboard و reduced motion را هم بررسی کن.

### Validate

حداقل validation بر اساس دسته:

| دسته | حداقل بررسی |
|---|---|
| `ui` | typecheck، lint، audit design، تست locale/responsive/ARIA مرتبط |
| `auth` | typecheck، unit auth، E2E auth، بررسی redaction و rate limit |
| `ai` | typecheck، schema/contract tests، safety و fallback tests |
| `data` | unit، migration check، idempotency/conflict tests |
| `infra` | lint/typecheck، build، compose review، smoke و rollback review |
| `docs` | لینک‌ها، نام مسیرها، env contract و consistency audit |

برای تغییرات مشترک یا release، این مجموعه را اجرا کن:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run audit:assets
npm run audit:design
npm run audit:lottie
```

## 4. گیت انتشار

### تغییر کم‌ریسک

- branch مستقل
- تست هدفمند
- PR با scope محدود
- merge پس از CI سبز

### تغییر پرریسک

هر تغییر در auth، schema، env، payment/SMS، AI safety، Docker یا production باید:

1. branch مستقل داشته باشد؛
2. تست regression داشته باشد؛
3. checklist مربوطه را به‌روزرسانی کند؛
4. rollback عملی و قابل توضیح داشته باشد؛
5. بدون تأیید انسانی به production نرود.

## 5. قالب گزارش agent

قالب تغییر گزارش AUTHORITATIVE در [`docs/AI_CHANGE_TEMPLATE.md`](AI_CHANGE_TEMPLATE.md) است و این‌جا عمداً کپی کامل نمی‌شود تا دو منبع حقیقت موازی به‌وجود نیاید (A-04). از همان قالب در PR و گزارش handoff استفاده کن و الزامات این سند (ریسک، rollback، docs-updated) را در آن حفظ کن.

## 6. قرارداد مخصوص OTP فعلی

تا وقتی launch واقعی تأیید نشده است:

- mock OTP production یک emergency mode است و باید صریحاً فعال باشد؛
- کد ثابت نباید در محیط کاربر واقعی فعال بماند؛
- تغییر `SMS_IR_TEMPLATE_ID` یا نام پارامتر باید با template پنل هماهنگ شود؛
- متن OTP هرگز در log، API عمومی یا گزارش agent ثبت نمی‌شود؛
- deploy فقط پروژه‌ی Apex را target می‌کند و نباید compose پروژه‌های دیگر را لمس کند.

## 7. قانون شروع بهبود بصری

پس از تثبیت این قرارداد، کار بصری با audit فعلی آغاز می‌شود:

1. baseline screenshot و فهرست صفحات `en/fa`؛
2. انتخاب یک مسیر اصلی، نه redesign پراکنده؛
3. اصلاح hierarchy، spacing، typography و states با tokenهای موجود؛
4. بررسی responsive، RTL، contrast، keyboard و reduced motion؛
5. ثبت before/after و اجرای تست‌های مسیر مربوط.

این سیستم عمداً به‌جای تولید خودکار کد بدون کنترل، روی traceability، safety و کیفیت تجربه‌ی Apex تمرکز دارد.
