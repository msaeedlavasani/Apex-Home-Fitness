import ExerciseLibraryPage from './ExerciseLibraryPage';

/**
 * Route entry — `/en/library` and `/fa/library`.
 * The implementation lives in `ExerciseLibraryPage.tsx` (client component);
 * this thin server page wires it into Next.js App Router.
 */
export default function LibraryPage() {
  return <ExerciseLibraryPage />;
}
