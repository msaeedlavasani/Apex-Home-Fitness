'use client';

import {useParams, useRouter} from 'next/navigation';
import OnboardingQuiz from '@/components/quiz/OnboardingQuiz';

/**
 * Onboarding quiz route (e.g. /en/quiz, /fa/quiz).
 *
 * Mounts the standalone `OnboardingQuiz` component inside the app layout so
 * it picks up the app-wide <ThemeProvider> (theme step persists the choice)
 * and the current locale from the URL segment.
 *
 * On completion the answers are handed to `onSubmit`; here we route the user
 * to their dashboard. Swap this for real persistence (e.g. userService /
 * an API route) once the data layer is wired into the flow.
 */
export default function QuizPage() {
  const params = useParams<{locale: string}>();
  const router = useRouter();
  const locale = params?.locale ?? 'en';

  return (
    <main className="flex min-h-screen min-h-dvh items-start justify-center bg-slate-50 py-10 text-slate-900">
      <div className="w-full max-w-lg px-4">
        <OnboardingQuiz
          locale={locale}
          onSubmit={() => router.push(`/${locale}/dashboard`)}
        />
      </div>
    </main>
  );
}
