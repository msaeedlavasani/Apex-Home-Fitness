import React, { useEffect, useMemo, useRef, useState } from 'react';
import { t as defaultT } from './i18n';
import ProgressBar from './components/ProgressBar';
import NavigationButtons from './components/NavigationButtons';
import ThemeStep from './steps/ThemeStep';
import CurrentLevelStep from './steps/CurrentLevelStep';
import TrainingDaysStep from './steps/TrainingDaysStep';
import ExerciseStylesStep from './steps/ExerciseStylesStep';
import GoalStep from './steps/GoalStep';
import EquipmentStep from './steps/EquipmentStep';
import LimitationsStep from './steps/LimitationsStep';
import RestDaysStep from './steps/RestDaysStep';
import { normalizeGoals } from './goals';
import { normalizeExerciseStyles } from './exerciseStyles';
import { REST_DAY_MAX, REST_DAY_MIN, normalizeRestDays } from './restDays';
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
    // Multi-goal step: at least one goal required. `normalizeGoals` also
    // accepts a legacy single-string answer so pre-existing sessions still
    // validate.
    validate: (answers) => normalizeGoals(answers.goal).length > 0,
    errorKey: 'quiz.error.goal.required',
  },
  {
    key: 'trainingDaysPerWeek',
    validate: (answers) => Number.isInteger(answers.trainingDaysPerWeek)
      && answers.trainingDaysPerWeek >= 2
      && answers.trainingDaysPerWeek <= 6,
    errorKey: 'quiz.error.required',
  },
  {
    key: 'exerciseStyles',
    validate: (answers) => normalizeExerciseStyles(answers.exerciseStyles).length > 0,
    errorKey: 'quiz.error.exerciseStyles.required',
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
  {
    key: 'restDays',
    // 1–3 rest days required. The step UI already caps the selection at
    // REST_DAY_MAX (unchecked options disable); this guard is defense in
    // depth for restored/legacy sessions that exceed the bounds.
    validate: (answers) => {
      const days = normalizeRestDays(answers.restDays);
      return days.length >= REST_DAY_MIN && days.length <= REST_DAY_MAX;
    },
    errorKey: 'quiz.error.restDays.required',
  },
];

const INITIAL_ANSWERS = {
  theme: '',
  level: '',
  // Goals are a multi-select array; legacy sessions restored via
  // `initialData` may still carry a single string — GoalStep normalizes it.
  goal: [],
  // Preferred training methods. Older drafts omit this field and are treated
  // as broad-profile answers by the validation layer.
  exerciseStyles: [],
  trainingDaysPerWeek: null,
  equipment: [],
  limitations: [],
  limitationsDetails: '',
  // Weekday ids the user wants to keep workout-free (1–3), e.g.
  // ['wednesday', 'sunday'].
  restDays: [],
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
 *   3. Goals             (multi-select — Strength / Fat Loss / Flexibility /
 *                         Functional Fitness; at least one required)
 *   4. Training days     (2–6 sessions per week)
 *   5. Exercise styles   (multi-select — one or more of the 8 supported styles)
 *   6. Equipment         (multi-select checkboxes, "None" is exclusive)
 *   7. Limitations       (injury checkboxes + free-text details, optional)
 *   8. Rest days         (multi-select weekdays, 1–3 — kept workout-free
 *                         by the generated program)
 *
 * All user-facing strings go through `t('key')` so the quiz can be
 * localized by swapping the i18n helper.
 *
 * @param {object} props
 * @param {(answers: object) => void | Promise<void>} props.onSubmit
 *        Receives the final answers, e.g.:
 *        { theme, level, goal: ['strength', 'fat_loss'], equipment: [],
 *          limitations: [], limitationsDetails, restDays: ['wednesday'] }
 * @param {(key: string, params?: object) => string} [props.t]
 * @param {object} [props.initialData] — partial pre-filled answers (e.g. when restoring a session)
 * @param {'en' | 'fa'} [props.locale] — forces a quiz language; when omitted,
 *        the quiz follows <html lang> (set by the app layout) and defaults to 'en'.
 * @param {(answers: object) => void} [props.onAnswersChange] — fired with the
 *        MERGED answers after every selection change (draft autosave hook).
 */
export default function OnboardingQuiz({
  onSubmit,
  t = defaultT,
  initialData = {},
  locale,
  onAnswersChange,
}) {
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

  // Ref mirror of `answers` so `updateAnswers` can compute the merged payload
  // synchronously and notify the host (e.g. draft autosave) without a stale
  // closure, while `setAnswers` stays a plain state update.
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const updateAnswers = (patch) => {
    const next = { ...answersRef.current, ...patch };
    answersRef.current = next;
    setAnswers(next);
    // Clear the current step's error as soon as the user provides an answer.
    setErrors((prev) => ({ ...prev, [STEP_CONFIG[currentStep].key]: undefined }));
    // Host hook (e.g. the quiz page's draft autosave) — receives the merged
    // answers after every selection change.
    if (onAnswersChange) onAnswersChange(next);
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
        goal: normalizeGoals(answers.goal),
        exerciseStyles: normalizeExerciseStyles(answers.exerciseStyles),
        exerciseStylesCount: normalizeExerciseStyles(answers.exerciseStyles).length,
        trainingDaysPerWeek: answers.trainingDaysPerWeek,
        equipmentCount: Array.isArray(answers.equipment) ? answers.equipment.length : 0,
        limitationsCount: Array.isArray(answers.limitations) ? answers.limitations.length : 0,
        restDays: normalizeRestDays(answers.restDays),
        restDaysCount: normalizeRestDays(answers.restDays).length,
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
          <TrainingDaysStep
            value={answers.trainingDaysPerWeek}
            onChange={(trainingDaysPerWeek) => updateAnswers({trainingDaysPerWeek})}
            error={errors.trainingDaysPerWeek}
            t={localizedT}
          />
        );
      case 4:
        return (
          <ExerciseStylesStep
            value={answers.exerciseStyles}
            onChange={(exerciseStyles) => updateAnswers({ exerciseStyles })}
            error={errors.exerciseStyles}
            t={localizedT}
          />
        );
      case 5:
        return (
          <EquipmentStep
            value={answers.equipment}
            onChange={(equipment) => updateAnswers({ equipment })}
            error={errors.equipment}
            t={localizedT}
          />
        );
      case 6:
        return (
          <LimitationsStep
            value={answers.limitations}
            onChange={(limitations) => updateAnswers({ limitations })}
            details={answers.limitationsDetails}
            onDetailsChange={(details) => updateAnswers({ limitationsDetails: details })}
            t={localizedT}
          />
        );
      case 7:
        return (
          <RestDaysStep
            value={answers.restDays}
            onChange={(restDays) => updateAnswers({ restDays })}
            error={errors.restDays}
            t={localizedT}
            locale={activeLocale}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="quiz">
      <header className="quiz__header">
        <h1 className="quiz__title">{localizedT('quiz.title')}</h1>
        <p className="quiz__subtitle">{localizedT('quiz.subtitle')}</p>
      </header>

      <ProgressBar current={currentStep + 1} total={totalSteps} t={localizedT} />

      <aside className="quiz-medical" role="note" aria-label={localizedT('quiz.medical.title')}>
        <strong className="quiz-medical__title">{localizedT('quiz.medical.title')}</strong>
        <p className="quiz-medical__body">{localizedT('quiz.medical.body')}</p>
      </aside>

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
