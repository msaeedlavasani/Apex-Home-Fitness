import React from 'react';
import OnboardingQuiz from './OnboardingQuiz';

/**
 * Minimal usage example — mount <OnboardingQuiz /> anywhere in your app.
 *
 * The quiz is self-contained: it renders all four steps with a progress
 * bar and navigation, and calls `onSubmit` with the final answers.
 */
export default function Example() {
  const handleSubmit = (answers) => {
    // Send answers to your backend / context store here.
    // Example payload:
    // {
    //   level: 'intermediate',
    //   goal: 'strength',
    //   equipment: ['pull_up_bar', 'dumbbells'],
    //   limitations: ['knee'],
    //   limitationsDetails: 'Mild runner knee — avoid deep squats',
    // }
    console.log('Onboarding answers:', answers);
  };

  return (
    <div style={{ padding: 24 }}>
      <OnboardingQuiz onSubmit={handleSubmit} />
    </div>
  );
}
