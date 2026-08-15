import React, { useEffect, useMemo, useState } from 'react';
import { t as defaultT } from './i18n';
import ProgressBar from './components/ProgressBar';
import NavigationButtons from './components/NavigationButtons';
import ThemeStep from './steps/ThemeStep';
import CurrentLevelStep from './steps/CurrentLevelStep';
import GoalStep from './steps/GoalStep';
import EquipmentStep from './steps/EquipmentStep';
import LimitationsStep from './steps/LimitationsStep';
import { ANALYTICS_EVENTS, trackEvent } from '@/services/analyticsEvents';
import './quiz.css';

/**
 * Step configuration: validation rule + error message key per step.
 */
const STEP_CONFIG = [
  {
    key: 'theme',
    validate: (answers) => Boolean(answers.theme),
    errorKey: 'quiz.error.required',
  },
  {
    key: 'level',
    validate: (answers) => Boolean(answers.level),
    errorKey: 'quiz.error.required',
  },
  {
    key: 'goal',
    validate: (answers) => Boolean(answers.goal),
    errorKey: 'quiz.error.required',
  },
  {
    key: 'equipment',
    validate: (answers) => answers.equipment.length > 0,
    errorKey: 'quiz.error.equipment.required',
  },
  {
    key: 'limitations',
    validate: () => true, // optional step — always valid
  },
];

const INITIAL_ANSWERS = {
  theme: '',
  level: '',
  goal: '',
  equipment: [],
  limitations: [],
  limitationsDetails: '',
};

/**
 * Resolve the active locale for the quiz's built-in bilingual (en/fa)
 * catalogs: explicit `locale` prop → <html lang> → 'en'.
 *
 * NOTE: reading `document` here must not happen during the initial render —
 * the server renders without `document`, so doing so would cause a React
 * hydration mismatch. The caller resolves it in a `useEffect` instead.
 *
 * @param {'en' | 'fa'} [localeProp]
 * @returns {'en' | 'fa' | null} — null when nothing conclusive is known yet
 */
function resolveDocumentLocale(localeProp) {
  if (localeProp === 'en' || localeProp === 'fa') return localeProp;
  if (typeof document !== 'undefined') {
    const lang = document.documentElement.lang;
    if (lang === 'fa' || lang.startsWith('fa-')) return 'fa';
    if (lang === 'en' || lang.startsWith('en-')) return 'en';
  }
  return null;
}

/**
 * Multi-step onboarding quiz.
 *
 * Steps:
 *   1. Visual style      (Light / Dark / Auto (System)) — applied immediately
 *   2. Current Level     (Beginner / Intermediate / Advanced)
 *   3. Goal              (Strength / Fat Loss / Flexibility / Functional Fitness)
 *   4. Equipment         (multi-select checkboxes, "None" is exclusive)
 *   5. Limitations       (injury checkboxes + free-text details, optional)
 *
 * All user-facing strings go through `t('key')` so the quiz can be
 * localized by swapping the i18n helper.
 *
 * @param {object} props
 * @param {(answers: object) => void | Promise<void>} props.onSubmit
 *        Receives the final answers, e.g.:
 *        { theme, level, goal, equipment: [], limitations: [], limitationsDetails }
 * @param {(key: string, params?: object) => string} [props.t]
 * @param {object} [props.initialData] — partial pre-filled answers (e.g. when restoring a session)
 * @param {'en' | 'fa'} [props.locale] — forces a quiz language; when omitted,
 *        the quiz follows <html lang> (set by the app layout) and defaults to 'en'.
 */
export default function OnboardingQuiz({ onSubmit, t = defaultT, initialData = {}, locale }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({ ...INITIAL_ANSWERS, ...initialData });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // Locale resolved from the DOM after mount (avoids SSR hydration mismatch);
  // server render + first client render stay on 'en' until this effect runs.
  const [domLocale, setDomLocale] = useState(null);

  const totalSteps = STEP_CONFIG.length;
  const isLastStep = currentStep === totalSteps - 1;

  useEffect(() => {
    const detected = resolveDocumentLocale(locale);
    if (detected) setDomLocale(detected);
  }, [locale]);

  // Locale-aware `t`: an app-injected translator (e.g. next-intl) wins;
  // otherwise bind the built-in bilingual catalog to the active locale.
  const activeLocale = domLocale ?? 'en';
  const localizedT = useMemo(() => {
    if (t !== defaultT) return t;
    return (key, params) => defaultT(key, params, activeLocale);
  }, [t, activeLocale]);

  const updateAnswers = (patch) => {
    setAnswers((prev) => ({ ...prev, ...patch }));
    // Clear the current step's error as soon as the user provides an answer.
    setErrors((prev) => ({ ...prev, [STEP_CONFIG[currentStep].key]: undefined }));
  };

  const handleNext = () => {
    const { key, validate, errorKey } = STEP_CONFIG[currentStep];
    if (!validate(answers)) {
      setErrors((prev) => ({ ...prev, [key]: localizedT(errorKey) }));
      return;
    }

    setErrors((prev) => ({ ...prev, [key]: undefined }));

    if (isLastStep) {
      // Critical action: onboarding quiz finished.
      trackEvent(ANALYTICS_EVENTS.QUIZ_COMPLETED, {
        theme: answers.theme,
        level: answers.level,
        goal: answers.goal,
        equipmentCount: Array.isArray(answers.equipment) ? answers.equipment.length : 0,
        limitationsCount: Array.isArray(answers.limitations) ? answers.limitations.length : 0,
      });
      setSubmitting(true);
      // onSubmit may return a promise (e.g. API call) — wait for it,
      // then re-enable the UI regardless of the outcome.
      Promise.resolve(onSubmit(answers)).finally(() => setSubmitting(false));
      return;
    }

    setCurrentStep((step) => step + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <ThemeStep
            value={answers.theme}
            onChange={(theme) => updateAnswers({ theme })}
            error={errors.theme}
            t={localizedT}
          />
        );
      case 1:
        return (
          <CurrentLevelStep
            value={answers.level}
            onChange={(level) => updateAnswers({ level })}
            error={errors.level}
            t={localizedT}
          />
        );
      case 2:
        return (
          <GoalStep
            value={answers.goal}
            onChange={(goal) => updateAnswers({ goal })}
            error={errors.goal}
            t={localizedT}
          />
        );
      case 3:
        return (
          <EquipmentStep
            value={answers.equipment}
            onChange={(equipment) => updateAnswers({ equipment })}
            error={errors.equipment}
            t={localizedT}
          />
        );
      default:
        return (
          <LimitationsStep
            value={answers.limitations}
            onChange={(limitations) => updateAnswers({ limitations })}
            details={answers.limitationsDetails}
            onDetailsChange={(details) => updateAnswers({ limitationsDetails: details })}
            t={localizedT}
          />
        );
    }
  };

  return (
    <div className="quiz">
      <header className="quiz__header">
        <h1 className="quiz__title">{localizedT('quiz.title')}</h1>
        <p className="quiz__subtitle">{localizedT('quiz.subtitle')}</p>
      </header>

      <ProgressBar current={currentStep + 1} total={totalSteps} t={localizedT} />

      {renderStep()}

      <NavigationButtons
        currentStep={currentStep}
        total={totalSteps}
        onBack={handleBack}
        onNext={handleNext}
        isLastStep={isLastStep}
        disabled={submitting}
        t={localizedT}
      />
    </div>
  );
}
