/**
 * Barrel exports — import everything from a single entry point:
 *
 *   import OnboardingQuiz, { t } from './src/index';
 */
export { default as OnboardingQuiz } from './OnboardingQuiz';

// Steps
export { default as CurrentLevelStep } from './steps/CurrentLevelStep';
export { default as GoalStep } from './steps/GoalStep';
export { default as EquipmentStep } from './steps/EquipmentStep';
export { default as LimitationsStep } from './steps/LimitationsStep';

// Shared building blocks
export { default as OptionCard } from './components/OptionCard';
export { default as ProgressBar } from './components/ProgressBar';
export { default as NavigationButtons } from './components/NavigationButtons';

// i18n placeholder helpers
export { t, translate, DEFAULT_MESSAGES } from './i18n';

export { default } from './OnboardingQuiz';
