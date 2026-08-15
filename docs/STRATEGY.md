# استراتژی هوش مصنوعی (AI Strategy)

## ۱. هدف هوش مصنوعی
تولید برنامه تمرینی هیبرید (ترکیبی) بر اساس امکانات کاربر. سیستم از متدهای زیر استفاده می‌کند:
- **Bodyweight & Calisthenics**
- **HIIT**
- **Yoga & Pilates**
- **Mobility & Recovery**
- **Resistance Training**
- **Isometric & Functional**

## ۲. منطق تولید (Hybrid Approach)
1. **فیلتر سخت (کد):** حذف حرکاتی که کاربر تجهیزاتش را ندارد یا با مصدومیتش در تضاد است.
2. **ارسال به AI:** لیست فیلتر شده به همراه اهداف کاربر به مدل (GPT-4o-mini) ارسال می‌شود.
3. **ساختار خروجی:** خروجی به صورت JSON کاملاً منطبق با Schema دیتابیس دریافت و ذخیره می‌شود.

## ۳. پرامپت‌ها
فایل‌های پرامپت خام در پوشه `prompts/` در ریشه پروژه قرار دارند.
- `01-general-program-generation-prompt.md`
- `02-injury-focused-program-prompt.md`
- `03-equipment-limited-program-prompt.md`
