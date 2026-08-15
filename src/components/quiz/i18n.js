/**
 * Bilingual i18n helper for the quiz (English + Persian).
 *
 * All quiz components call `t('some.key', params?)` exactly like they would
 * with react-i18next, so swapping this implementation later requires no
 * changes to the components. To plug in a real solution, replace:
 *
 *   import { t } from '../i18n';
 *
 * with e.g.:
 *
 *   import { useTranslation } from 'react-i18next';
 *   // const { t } = useTranslation();
 *
 * Locale selection:
 *   - `OnboardingQuiz` accepts a `locale` prop ('en' | 'fa') and passes a
 *     locale-bound `t` down to every step. When no `locale` prop is given it
 *     falls back to `<html lang>` (set by the app layout), then 'en'.
 *   - Direct calls `t('key')` default to the English catalog.
 *   - Missing keys fall back to English, then to the raw key.
 */

export const LOCALES = ['en', 'fa'];

const EN = {
  // ---- Generic ----
  'quiz.title': 'Build your training plan',
  'quiz.subtitle': 'Answer a few quick questions so we can personalize your workouts.',
  'quiz.progress': 'Step {{current}} of {{total}}',
  'quiz.next': 'Next',
  'quiz.back': 'Back',
  'quiz.finish': 'See my plan',
  'quiz.error.required': 'Please select an option to continue.',
  'quiz.error.equipment.required': 'Please select at least one option, or choose "None".',

  // ---- Step 1 — Visual style ----
  'quiz.theme.title': 'What visual style do you prefer?',
  'quiz.theme.subtitle': 'You can change this anytime in your settings.',
  'quiz.theme.light': 'Light',
  'quiz.theme.light.hint': 'Bright interface — great for daytime',
  'quiz.theme.dark': 'Dark',
  'quiz.theme.dark.hint': 'Easy on the eyes in low light',
  'quiz.theme.auto': 'Auto (System)',
  'quiz.theme.auto.hint': 'Follows your device settings',

  // ---- Step 2 — Current level ----
  'quiz.level.title': 'What is your current training level?',
  'quiz.level.subtitle': 'Choose the option that fits you best.',
  'quiz.level.beginner': 'Beginner',
  'quiz.level.beginner.hint': 'New to training or back after a long break',
  'quiz.level.intermediate': 'Intermediate',
  'quiz.level.intermediate.hint': 'Training consistently for 1–3 years',
  'quiz.level.advanced': 'Advanced',
  'quiz.level.advanced.hint': '3+ years of training, comfortable with advanced movements',

  // ---- Step 3 — Goal ----
  'quiz.goal.title': 'What is your main goal?',
  'quiz.goal.subtitle': 'Pick the goal you want to focus on most.',
  'quiz.goal.strength': 'Strength',
  'quiz.goal.strength.hint': 'Build muscle and get stronger',
  'quiz.goal.fat_loss': 'Fat Loss',
  'quiz.goal.fat_loss.hint': 'Lose fat and improve conditioning',
  'quiz.goal.flexibility': 'Flexibility',
  'quiz.goal.flexibility.hint': 'Improve mobility and range of motion',
  'quiz.goal.functional_fitness': 'Functional Fitness',
  'quiz.goal.functional_fitness.hint': 'Move better in everyday life and sports',

  // ---- Step 4 — Equipment ----
  'quiz.equipment.title': 'What equipment do you have available?',
  'quiz.equipment.subtitle':
    'Select everything you can use. Choose "None" if you train with bodyweight only.',
  'quiz.equipment.none': 'None — bodyweight only',
  'quiz.equipment.pull_up_bar': 'Pull-up bar',
  'quiz.equipment.bands': 'Resistance bands',
  'quiz.equipment.dumbbells': 'Dumbbells',
  'quiz.equipment.barbell': 'Barbell',
  'quiz.equipment.kettlebells': 'Kettlebells',
  'quiz.equipment.bench': 'Bench',
  'quiz.equipment.cable_machine': 'Cable machine',
  'quiz.equipment.jump_rope': 'Jump rope',

  // ---- Step 5 — Limitations ----
  'quiz.limitations.title': 'Do you have any injuries or limitations?',
  'quiz.limitations.subtitle':
    'This helps us avoid exercises that may cause discomfort. You can skip this step.',
  'quiz.limitations.none': 'None — I am healthy',
  'quiz.limitations.knee': 'Knee',
  'quiz.limitations.lower_back': 'Lower back',
  'quiz.limitations.shoulder': 'Shoulder',
  'quiz.limitations.wrist': 'Wrist',
  'quiz.limitations.ankle': 'Ankle',
  'quiz.limitations.hip': 'Hip',
  'quiz.limitations.neck': 'Neck',
  'quiz.limitations.details.label': 'Additional details (optional)',
  'quiz.limitations.details.placeholder':
    'e.g. "Recovering from a sprained ankle — no jumping for 4 weeks"',
};

const FA = {
  // ---- Generic ----
  'quiz.title': 'برنامه تمرینی خودت رو بساز',
  'quiz.subtitle': 'چند سوال کوتاه جواب بده تا تمرین‌ها رو برای تو شخصی‌سازی کنیم.',
  'quiz.progress': 'مرحله {{current}} از {{total}}',
  'quiz.next': 'بعدی',
  'quiz.back': 'قبلی',
  'quiz.finish': 'مشاهده برنامه من',
  'quiz.error.required': 'لطفاً یک گزینه را انتخاب کن تا ادامه بدیم.',
  'quiz.error.equipment.required': 'حداقل یک گزینه را انتخاب کن یا «هیچ‌کدام» را بزن.',

  // ---- Step 1 — Visual style ----
  'quiz.theme.title': 'چه سبک نمایشی رو ترجیح می‌دی؟',
  'quiz.theme.subtitle': 'هر زمان می‌تونی از تنظیمات تغییرش بدی.',
  'quiz.theme.light': 'روشن',
  'quiz.theme.light.hint': 'نمای روشن — مناسب استفاده در روز',
  'quiz.theme.dark': 'تیره',
  'quiz.theme.dark.hint': 'در نور کم، راحت‌تر برای چشم',
  'quiz.theme.auto': 'خودکار (سیستم)',
  'quiz.theme.auto.hint': 'هماهنگ با تنظیمات دستگاهت',

  // ---- Step 2 — Current level ----
  'quiz.level.title': 'سطح تمرین فعلی تو چیست؟',
  'quiz.level.subtitle': 'گزینه‌ای که بیشتر به تو می‌خوره رو انتخاب کن.',
  'quiz.level.beginner': 'مبتدی',
  'quiz.level.beginner.hint': 'تازه شروع کردی یا بعد از یک وقفه طولانی برگشتی',
  'quiz.level.intermediate': 'متوسط',
  'quiz.level.intermediate.hint': 'به مدت ۱–۳ سال به‌طور منظم تمرین می‌کنی',
  'quiz.level.advanced': 'پیشرفته',
  'quiz.level.advanced.hint': 'بیش از ۳ سال سابقه تمرین و آشنایی با حرکات پیشرفته',

  // ---- Step 3 — Goal ----
  'quiz.goal.title': 'هدف اصلی تو چیست؟',
  'quiz.goal.subtitle': 'هدفی که بیشتر از همه می‌خوای روی آن تمرکز کنی رو انتخاب کن.',
  'quiz.goal.strength': 'قدرت',
  'quiz.goal.strength.hint': 'عضله‌سازی و افزایش قدرت',
  'quiz.goal.fat_loss': 'کاهش چربی',
  'quiz.goal.fat_loss.hint': 'کاهش چربی و بهبود آمادگی جسمانی',
  'quiz.goal.flexibility': 'انعطاف‌پذیری',
  'quiz.goal.flexibility.hint': 'بهبود تحرک و دامنه حرکتی',
  'quiz.goal.functional_fitness': 'آمادگی عملکردی',
  'quiz.goal.functional_fitness.hint': 'حرکت بهتر در زندگی روزمره و ورزش',

  // ---- Step 4 — Equipment ----
  'quiz.equipment.title': 'چه وسایلی در دسترس داری؟',
  'quiz.equipment.subtitle':
    'هر چیزی که می‌تونی استفاده کنی رو انتخاب کن. اگه فقط با وزن بدن تمرین می‌کنی، «هیچ‌کدام» رو بزن.',
  'quiz.equipment.none': 'هیچ‌کدام — فقط وزن بدن',
  'quiz.equipment.pull_up_bar': 'بارفیکس',
  'quiz.equipment.bands': 'کش مقاومتی',
  'quiz.equipment.dumbbells': 'دمبل',
  'quiz.equipment.barbell': 'هالتر',
  'quiz.equipment.kettlebells': 'کتل‌بل',
  'quiz.equipment.bench': 'نیمکت',
  'quiz.equipment.cable_machine': 'دستگاه سیم‌کش',
  'quiz.equipment.jump_rope': 'طناب پرش',

  // ---- Step 5 — Limitations ----
  'quiz.limitations.title': 'آسیب‌دیدگی یا محدودیتی داری؟',
  'quiz.limitations.subtitle':
    'این کمک می‌کنه از حرکاتی که ممکنه برات ناراحت‌کننده باشن جلوگیری کنیم. می‌تونی این مرحله رو رد کنی.',
  'quiz.limitations.none': 'هیچ‌کدام — سالم هستم',
  'quiz.limitations.knee': 'زانو',
  'quiz.limitations.lower_back': 'کمر',
  'quiz.limitations.shoulder': 'شانه',
  'quiz.limitations.wrist': 'مچ دست',
  'quiz.limitations.ankle': 'مچ پا',
  'quiz.limitations.hip': 'لگن',
  'quiz.limitations.neck': 'گردن',
  'quiz.limitations.details.label': 'توضیحات تکمیلی (اختیاری)',
  'quiz.limitations.details.placeholder':
    'مثلاً: «در حال بهبود از رگ به رگ شدن مچ پا هستم — تا ۴ هفته بدون پرش»',
};

/** English catalog (kept under the old name for backward compatibility). */
export const DEFAULT_MESSAGES = EN;

/** Persian catalog. */
export const FA_MESSAGES = FA;

/**
 * Translate a key with optional `{{param}}` interpolation.
 * Falls back to English, then to the raw key when missing.
 *
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @param {'en' | 'fa'} [locale='en']
 * @returns {string}
 */
export function translate(key, params = {}, locale = 'en') {
  const catalog = locale === 'fa' ? FA : EN;
  let message = catalog[key] ?? EN[key] ?? key;
  Object.entries(params).forEach(([name, value]) => {
    message = message.replace(new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g'), String(value));
  });
  return message;
}

/** Alias so components can call `t('some.key')` everywhere. */
export const t = translate;

export default translate;
