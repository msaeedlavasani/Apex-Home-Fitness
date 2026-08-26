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
  'quiz.header.home': 'Back to home',
  'quiz.progress': 'Step {{current}} of {{total}}',
  'quiz.next': 'Next',
  'quiz.back': 'Back',
  'quiz.finish': 'See my plan',
  'quiz.error.required': 'Please select an option to continue.',
  'quiz.error.equipment.required': 'Please select at least one option, or choose "None".',
  'quiz.error.goal.required': 'Please select at least one goal to continue.',
  'quiz.medical.title': 'Safety first',
  'quiz.medical.body': 'This app provides general fitness information, not medical advice. Consult a qualified healthcare professional before exercising if you have an injury, medical condition, are pregnant, or have concerning symptoms. Stop immediately and seek medical care for chest pain, severe shortness of breath, dizziness, numbness, weakness, or sharp/worsening pain.',

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

  // ---- Step 3 — Goals (multi-select) ----
  'quiz.goal.title': 'What are your goals?',
  'quiz.goal.subtitle': 'Select one or more goals you want to work on.',
  'quiz.goal.strength': 'Strength',
  'quiz.goal.strength.hint': 'Build muscle and get stronger',
  'quiz.goal.fat_loss': 'Fat Loss',
  'quiz.goal.fat_loss.hint': 'Lose fat and improve conditioning',
  'quiz.goal.flexibility': 'Flexibility',
  'quiz.goal.flexibility.hint': 'Improve mobility and range of motion',
  'quiz.goal.functional_fitness': 'Functional Fitness',
  'quiz.goal.functional_fitness.hint': 'Move better in everyday life and sports',

  // ---- Step 4 — Exercise styles (multi-select) ----
  'quiz.exerciseStyles.title': 'Which exercise styles do you enjoy?',
  'quiz.exerciseStyles.subtitle': 'Choose one or more styles to shape the program around what you like.',
  'quiz.exerciseStyles.yoga': 'Yoga',
  'quiz.exerciseStyles.yoga.hint': 'Breathing, balance and mindful mobility',
  'quiz.exerciseStyles.hiit': 'HIIT',
  'quiz.exerciseStyles.hiit.hint': 'Short, challenging intervals and conditioning',
  'quiz.exerciseStyles.calisthenics': 'Calisthenics',
  'quiz.exerciseStyles.calisthenics.hint': 'Bodyweight strength and control',
  'quiz.exerciseStyles.pilates': 'Pilates',
  'quiz.exerciseStyles.pilates.hint': 'Core control, posture and precision',
  'quiz.exerciseStyles.mobility': 'Mobility',
  'quiz.exerciseStyles.mobility.hint': 'Range of motion and joint-friendly movement',
  'quiz.exerciseStyles.isometric': 'Isometric',
  'quiz.exerciseStyles.isometric.hint': 'Strength through controlled holds',
  'quiz.exerciseStyles.resistance_band': 'Resistance bands',
  'quiz.exerciseStyles.resistance_band.hint': 'Portable resistance and low-impact strength',
  'quiz.exerciseStyles.animal_flow': 'Animal flow',
  'quiz.exerciseStyles.animal_flow.hint': 'Ground-based movement, coordination and flow',
  'quiz.error.exerciseStyles.required': 'Please choose at least one exercise style to continue.',

  // ---- Step 5 — Equipment ----
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

  // ---- Step 6 — Rest days ----
  'quiz.restDays.title': 'Which weekdays are your rest days?',
  'quiz.restDays.subtitle': 'Pick 1–3 rest days — we keep them free of workouts.',
  'quiz.restDays.counter': '{{count}} of {{max}} rest days selected',
  'quiz.restDays.maxReached':
    'You can select at most {{max}} rest days. Uncheck one to pick another.',
  'quiz.restDays.monday': 'Monday',
  'quiz.restDays.tuesday': 'Tuesday',
  'quiz.restDays.wednesday': 'Wednesday',
  'quiz.restDays.thursday': 'Thursday',
  'quiz.restDays.friday': 'Friday',
  'quiz.restDays.saturday': 'Saturday',
  'quiz.restDays.sunday': 'Sunday',
  'quiz.error.restDays.required': 'Please pick 1–3 rest days to continue.',

  // ---- Completion flow (Batch 14 / task 3 — quiz page orchestration) ----
  'quiz.flow.saving': 'Saving your answers…',
  'quiz.flow.generating': 'Building your personalized program…',
  'quiz.flow.needsAuth.title': 'Almost there — create your account',
  'quiz.flow.needsAuth.body':
    'Sign in with your phone number to save your answers and get your personalized program.',
  'quiz.flow.needsAuth.cta': 'Continue with phone number',
  'quiz.flow.resume.title': 'Finishing your plan',
  'quiz.flow.resume.body': 'Your answers are safe. We are completing the last steps…',
  'quiz.flow.signin.title': 'Sign in to finish',
  'quiz.flow.signin.body':
    'Your answers are saved on this device. Sign in with your phone number to continue.',
  'quiz.flow.error.title': 'Something went wrong',
  'quiz.flow.error.retryable':
    'We could not finish saving your plan. Check your connection and try again — your answers are safe.',
  'quiz.flow.error.permanent':
    'We could not create your program with these answers. Please review them and try again.',  'quiz.flow.error.authNotConfigured':
    'Sign-in is not available right now. Please try again later.',
  'quiz.flow.error.aiCreditsUnavailable':
    'Program generation is temporarily unavailable. Please try again after the AI service is available.',
  'quiz.flow.retry': 'Try again',
  'quiz.flow.review': 'Review answers',
  'quiz.flow.restart': 'Start over',
};

const FA = {
  // ---- Generic ----
  'quiz.title': 'برنامه تمرینی خودت رو بساز',
  'quiz.subtitle': 'چند سوال کوتاه جواب بده تا تمرین‌ها رو برای تو شخصی‌سازی کنیم.',
  'quiz.header.home': 'بازگشت به صفحه اول',
  'quiz.progress': 'مرحله {{current}} از {{total}}',
  'quiz.next': 'بعدی',
  'quiz.back': 'قبلی',
  'quiz.finish': 'مشاهده برنامه من',
  'quiz.error.required': 'لطفاً یک گزینه را انتخاب کن تا ادامه بدیم.',
  'quiz.error.equipment.required': 'حداقل یک گزینه را انتخاب کن یا «هیچ‌کدام» را بزن.',
  'quiz.error.goal.required': 'لطفاً حداقل یک هدف را انتخاب کن تا ادامه بدیم.',
  'quiz.medical.title': 'اول ایمنی',
  'quiz.medical.body': 'این برنامه اطلاعات عمومی تناسب اندام ارائه می‌کند و جایگزین توصیه پزشکی نیست. اگر آسیب‌دیدگی، بیماری، بارداری یا علائم نگران‌کننده داری، قبل از تمرین با متخصص سلامت مشورت کن. در صورت درد قفسه سینه، تنگی نفس شدید، سرگیجه، بی‌حسی، ضعف یا درد تیز و رو به تشدید، فوراً تمرین را متوقف و مراقبت پزشکی دریافت کن.',

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

  // ---- Step 3 — Goals (multi-select) ----
  'quiz.goal.title': 'اهداف تو چیست؟',
  'quiz.goal.subtitle': 'یک یا چند هدف که می‌خوای روی آن‌ها کار کنی رو انتخاب کن.',
  'quiz.goal.strength': 'قدرت',
  'quiz.goal.strength.hint': 'عضله‌سازی و افزایش قدرت',
  'quiz.goal.fat_loss': 'کاهش چربی',
  'quiz.goal.fat_loss.hint': 'کاهش چربی و بهبود آمادگی جسمانی',
  'quiz.goal.flexibility': 'انعطاف‌پذیری',
  'quiz.goal.flexibility.hint': 'بهبود تحرک و دامنه حرکتی',
  'quiz.goal.functional_fitness': 'آمادگی عملکردی',
  'quiz.goal.functional_fitness.hint': 'حرکت بهتر در زندگی روزمره و ورزش',

  // ---- Step 4 — Exercise styles (multi-select) ----
  'quiz.exerciseStyles.title': 'چه سبک‌هایی از ورزش را دوست داری؟',
  'quiz.exerciseStyles.subtitle': 'یک یا چند سبک را انتخاب کن تا برنامه بر اساس علاقه‌ات ساخته شود.',
  'quiz.exerciseStyles.yoga': 'یوگا',
  'quiz.exerciseStyles.yoga.hint': 'تنفس، تعادل و تحرک آگاهانه',
  'quiz.exerciseStyles.hiit': 'تمرین تناوبی شدید',
  'quiz.exerciseStyles.hiit.hint': 'بازه‌های کوتاه و چالش‌برانگیز برای آمادگی',
  'quiz.exerciseStyles.calisthenics': 'کالیستنیک',
  'quiz.exerciseStyles.calisthenics.hint': 'قدرت و کنترل با وزن بدن',
  'quiz.exerciseStyles.pilates': 'پیلاتس',
  'quiz.exerciseStyles.pilates.hint': 'کنترل مرکز بدن، وضعیت و دقت',
  'quiz.exerciseStyles.mobility': 'تحرک',
  'quiz.exerciseStyles.mobility.hint': 'دامنه حرکتی و حرکت سازگار با مفاصل',
  'quiz.exerciseStyles.isometric': 'ایزومتریک',
  'quiz.exerciseStyles.isometric.hint': 'افزایش قدرت با نگه‌داشتن کنترل‌شده',
  'quiz.exerciseStyles.resistance_band': 'کش مقاومتی',
  'quiz.exerciseStyles.resistance_band.hint': 'مقاومت قابل حمل و قدرت کم‌فشار',
  'quiz.exerciseStyles.animal_flow': 'آنیمال فلو',
  'quiz.exerciseStyles.animal_flow.hint': 'حرکت زمینی، هماهنگی و جریان بدن',
  'quiz.error.exerciseStyles.required': 'لطفاً حداقل یک سبک ورزشی انتخاب کن تا ادامه بدیم.',

  // ---- Step 5 — Equipment ----
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

  // ---- Step 6 — Rest days ----
  'quiz.restDays.title': 'کدام روزهای هفته روز استراحت تو هستند؟',
  'quiz.restDays.subtitle': '۱ تا ۳ روز استراحت انتخاب کن — این روزها را بدون تمرین نگه می‌داریم.',
  'quiz.restDays.counter': '{{count}} از {{max}} روز استراحت انتخاب شده',
  'quiz.restDays.maxReached':
    'حداکثر {{max}} روز استراحت می‌تونی انتخاب کنی. برای انتخاب روز دیگر، اول یکی از آن‌ها را بردار.',
  'quiz.restDays.monday': 'دوشنبه',
  'quiz.restDays.tuesday': 'سه‌شنبه',
  'quiz.restDays.wednesday': 'چهارشنبه',
  'quiz.restDays.thursday': 'پنجشنبه',
  'quiz.restDays.friday': 'جمعه',
  'quiz.restDays.saturday': 'شنبه',
  'quiz.restDays.sunday': 'یکشنبه',
  'quiz.error.restDays.required': 'لطفاً ۱ تا ۳ روز استراحت انتخاب کن تا ادامه بدیم.',

  // ---- Completion flow (Batch 14 / task 3 — quiz page orchestration) ----
  'quiz.flow.saving': 'در حال ذخیرهٔ پاسخ‌ها…',
  'quiz.flow.generating': 'در حال ساخت برنامهٔ اختصاصی تو…',
  'quiz.flow.needsAuth.title': 'فقط یک قدم مانده — حساب خودت رو بساز',
  'quiz.flow.needsAuth.body':
    'با شمارهٔ موبایلت وارد شو تا پاسخ‌هات ذخیره بشن و برنامهٔ اختصاصی‌ات ساخته بشه.',
  'quiz.flow.needsAuth.cta': 'ادامه با شمارهٔ موبایل',
  'quiz.flow.resume.title': 'در حال تکمیل برنامه‌ات',
  'quiz.flow.resume.body': 'پاسخ‌هات امن هستن. داریم آخرین قدم‌ها رو انجام می‌دیم…',
  'quiz.flow.signin.title': 'برای ادامه وارد شو',
  'quiz.flow.signin.body':
    'پاسخ‌هات روی همین دستگاه ذخیره شده. برای ادامه با شمارهٔ موبایلت وارد شو.',
  'quiz.flow.error.title': 'مشکلی پیش اومد',
  'quiz.flow.error.retryable':
    'نتونستیم برنامه‌ات رو کامل ذخیره کنیم. اتصالت رو چک کن و دوباره تلاش کن — پاسخ‌هات امن هستن.',
  'quiz.flow.error.permanent':
    'نتونستیم با این پاسخ‌ها برنامه‌ات رو بسازیم. لطفاً آن‌ها رو بازبینی کن و دوباره تلاش کن.',
  'quiz.flow.error.authNotConfigured':
    'ورود در حال حاضر در دسترس نیست. لطفاً بعداً دوباره تلاش کن.',
  'quiz.flow.error.aiCreditsUnavailable':
    'ساخت برنامه فعلاً در دسترس نیست. بعد از فعال‌شدن سرویس هوش مصنوعی دوباره تلاش کن.',
  'quiz.flow.retry': 'تلاش دوباره',
  'quiz.flow.review': 'بازبینی پاسخ‌ها',
  'quiz.flow.restart': 'شروع دوباره',
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
