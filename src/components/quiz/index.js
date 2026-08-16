/**
 * Barrel exports — import everything from a single entry point:
 *
 *   import OnboardingQuiz, { t } from './src/index';
 */
export { default as OnboardingQuiz } from './OnboardingQuiz';

// Steps
export { default as ThemeStep } from './steps/ThemeStep';
export { default as CurrentLevelStep } from './steps/CurrentLevelStep';
export { default as GoalStep } from './steps/GoalStep';
export { default as EquipmentStep } from './steps/EquipmentStep';
export { default as LimitationsStep } from './steps/LimitationsStep';
export { default as RestDaysStep } from './steps/RestDaysStep';

// Rest-day selection helpers (canonical weekdays + normalization)
export {
  WEEKDAY_IDS,
  WEEKDAY_IDS_FA,
  WEEKDAY_OPTIONS,
  WEEKDAY_OPTIONS_FA,
  getWeekdayOptions,
  REST_DAY_MIN,
  REST_DAY_MAX,
  normalizeRestDays,
} from './restDays';

// Shared building blocks
export { default as OptionCard } from './components/OptionCard';
export { default as ProgressBar } from './components/ProgressBar';
export { default as NavigationButtons } from './components/NavigationButtons';

// Theme persistence/apply helpers (standalone fallback; the app-wide
// contract lives in src/components/providers/ThemeProvider.tsx)
export {
  THEME_STORAGE_KEY,
  THEME_OPTIONS,
  isValidTheme,
  getStoredTheme,
  resolveTheme,
  applyThemeDirect,
  initThemeFallback,
} from './theme';

// i18n placeholder helpers
export { t, translate, LOCALES, DEFAULT_MESSAGES } from './i18n';

export { default } from './OnboardingQuiz';
