import React, { useState } from 'react';
import { t as defaultT } from './i18n';
import ProgressBar from './components/ProgressBar';
import NavigationButtons from './components/NavigationButtons';
import CurrentLevelStep from './steps/CurrentLevelStep';
import GoalStep from './steps/GoalStep';
import EquipmentStep from './steps/EquipmentStep';
import LimitationsStep from './steps/LimitationsStep';
import './quiz.css';

/**
 * Step configuration: validation rule + error message key per step.
 */
const STEP_CONFIG = [
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
  level: '',
  goal: '',
  equipment: [],
  limitations: [],
  limitationsDetails: '',
};

/**
 * Multi-step onboarding quiz.
 *
 * Steps:
 *   1. Current Level     (Beginner / Intermediate / Advanced)
 *   2. Goal              (Strength / Fat Loss / Flexibility / Functional Fitness)
 *   3. Equipment         (multi-select checkboxes, "None" is exclusive)
 *   4. Limitations       (injury checkboxes + free-text details, optional)
 *
 * All user-facing strings go through `t('key')` so the quiz can be
 * localized by swapping the i18n helper.
 *
 * @param {object} props
 * @param {(answers: object) => void | Promise<void>} props.onSubmit
 *        Receives the final answers, e.g.:
 *        { level, goal, equipment: [], limitations: [], limitationsDetails }
 * @param {(key: string, params?: object) => string} [props.t]
 * @param {object} [props.initialData] — partial pre-filled answers (e.g. when restoring a session)
 */
export default function OnboardingQuiz({ onSubmit, t = defaultT, initialData = {} }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({ ...INITIAL_ANSWERS, ...initialData });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = STEP_CONFIG.length;
  const isLastStep = currentStep === totalSteps - 1;

  const updateAnswers = (patch) => {
    setAnswers((prev) => ({ ...prev, ...patch }));
    // Clear the current step's error as soon as the user provides an answer.
    setErrors((prev) => ({ ...prev, [STEP_CONFIG[currentStep].key]: undefined }));
  };

  const handleNext = () => {
    const { key, validate, errorKey } = STEP_CONFIG[currentStep];
    if (!validate(answers)) {
      setErrors((prev) => ({ ...prev, [key]: t(errorKey) }));
      return;
    }

    setErrors((prev) => ({ ...prev, [key]: undefined }));

    if (isLastStep) {
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
          <CurrentLevelStep
            value={answers.level}
            onChange={(level) => updateAnswers({ level })}
            error={errors.level}
            t={t}
          />
        );
      case 1:
        return (
          <GoalStep
            value={answers.goal}
            onChange={(goal) => updateAnswers({ goal })}
            error={errors.goal}
            t={t}
          />
        );
      case 2:
        return (
          <EquipmentStep
            value={answers.equipment}
            onChange={(equipment) => updateAnswers({ equipment })}
            error={errors.equipment}
            t={t}
          />
        );
      default:
        return (
          <LimitationsStep
            value={answers.limitations}
            onChange={(limitations) => updateAnswers({ limitations })}
            details={answers.limitationsDetails}
            onDetailsChange={(details) => updateAnswers({ limitationsDetails: details })}
            t={t}
          />
        );
    }
  };

  return (
    <div className="quiz">
      <header className="quiz__header">
        <h1 className="quiz__title">{t('quiz.title')}</h1>
        <p className="quiz__subtitle">{t('quiz.subtitle')}</p>
      </header>

      <ProgressBar current={currentStep + 1} total={totalSteps} t={t} />

      {renderStep()}

      <NavigationButtons
        currentStep={currentStep}
        total={totalSteps}
        onBack={handleBack}
        onNext={handleNext}
        isLastStep={isLastStep}
        disabled={submitting}
        t={t}
      />
    </div>
  );
}
