# Apex Change Report Template

برای هر تغییر غیرسطحی، این قالب را در توضیح PR یا گزارش handoff تکمیل کن:

```md
## Change report
- Scope:
- Category: ui | domain | auth | ai | data | infra | docs
- User-visible effect:
- Files changed:
- Invariants checked:
- Tests run:
- Risks:
- Rollback:
- Docs updated:
- Follow-up:
```

### چک‌لیست سریع

- [ ] تغییرات قبلی کاربر حفظ شده‌اند
- [ ] secret یا OTP plaintext در diff، log یا response نیست
- [ ] تست مرتبط اضافه/به‌روزرسانی شده است
- [ ] مسیرهای `en` و `fa` در صورت اثرپذیری بررسی شده‌اند
- [ ] سند مرجع به‌روز شده است
- [ ] production یا سرویس همسایه بدون تأیید تغییر نمی‌کند
