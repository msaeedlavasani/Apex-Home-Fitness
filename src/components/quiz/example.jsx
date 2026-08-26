import React from 'react';
import OnboardingQuiz from './OnboardingQuiz';

/**
 * Minimal usage example — mount <OnboardingQuiz /> anywhere in your app.
 *
 * The quiz is self-contained: it renders all eight steps with a progress
 * bar and navigation, and calls `onSubmit` with the final answers.
 *
 * When mounted inside <ThemeProvider> (the app layout already provides
 * one), the Visual style step uses `useTheme().setTheme(...)`, so the
 * choice is persisted and applied app-wide immediately. Rendered
 * standalone, it falls back to the direct apply helpers in `./theme.js`.
 */
export default function Example() {
  const handleSubmit = (answers) => {
    // Send answers to your backend / context store here.
    // Example payload:
    // {
    //   theme: 'system',           // 'light' | 'dark' | 'system' ("Auto (System)")
    //   level: 'intermediate',
    //   goal: ['strength', 'fat_loss'],  // multi-select; ≥ 1 goal
    //   equipment: ['pull_up_bar', 'dumbbells'],
    //   limitations: ['knee'],
    //   limitationsDetails: 'Mild runner knee — avoid deep squats',
    //   trainingDaysPerWeek: 3,
    //   restDays: ['wednesday', 'sunday'], // 1–3 weekdays kept workout-free
    // }
    console.log('Onboarding answers:', answers);
  };

  return (
    <div style={{ padding: 24 }}>
      <OnboardingQuiz onSubmit={handleSubmit} />
    </div>
  );
}
