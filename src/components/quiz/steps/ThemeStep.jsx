import React from 'react';
import OptionCard from '../components/OptionCard';
import { t as defaultT } from '../i18n';
import { useTheme } from '../../providers/ThemeProvider';
import { applyThemeDirect } from '../theme';

/**
 * Visual-style options.
 *
 * NOTE: the stored/applied value for "Auto (System)" is `'system'` — the
 * exact value the app-wide ThemeProvider understands (`THEMES` in
 * `src/components/providers/ThemeProvider.tsx`). The label shown to the
 * user is "Auto (System)".
 */
const THEME_OPTIONS = [
  { id: 'light', labelKey: 'quiz.theme.light', hintKey: 'quiz.theme.light.hint' },
  { id: 'dark', labelKey: 'quiz.theme.dark', hintKey: 'quiz.theme.dark.hint' },
  { id: 'system', labelKey: 'quiz.theme.auto', hintKey: 'quiz.theme.auto.hint' },
];

/**
 * `useTheme()` throws when rendered outside <ThemeProvider>. The quiz is
 * self-contained (it may be rendered standalone, e.g. by `example.jsx`),
 * so fall back to the direct apply helpers which use the same storage key
 * and DOM contract. The hook itself is still called unconditionally —
 * the try/catch only intercepts the "no provider" error.
 *
 * @returns {ReturnType<typeof useTheme> | null}
 */
function useThemeIfAvailable() {
  try {
    return useTheme();
  } catch (error) {
    return null;
  }
}

/**
 * Step — Visual style (Light / Dark / Auto (System)).
 *
 * Single choice. The selection is persisted and applied immediately:
 *   - inside <ThemeProvider>: calls `setTheme(id)` (state + persist + apply);
 *   - standalone:             calls `applyThemeDirect(id)` (same contract).
 *
 * @param {object} props
 * @param {string} [props.value=''] — 'light' | 'dark' | 'system'
 * @param {(theme: string) => void} props.onChange
 * @param {(key: string, params?: object) => string} [props.t]
 * @param {string} [props.error]
 */
export default function ThemeStep({ value = '', onChange, t = defaultT, error }) {
  const themeContext = useThemeIfAvailable();

  const handleSelect = (id) => {
    // Persist + apply immediately — same contract on both paths.
    if (themeContext) {
      themeContext.setTheme(id);
    } else {
      applyThemeDirect(id);
    }
    onChange(id);
  };

  return (
    <fieldset className="quiz-step">
      <legend className="quiz-step__title">{t('quiz.theme.title')}</legend>
      <p className="quiz-step__subtitle">{t('quiz.theme.subtitle')}</p>

      <div className="quiz-step__options" role="radiogroup" aria-label={t('quiz.theme.title')}>
        {THEME_OPTIONS.map((option) => (
          <OptionCard
            key={option.id}
            selected={value === option.id}
            onSelect={() => handleSelect(option.id)}
            title={t(option.labelKey)}
            description={t(option.hintKey)}
          />
        ))}
      </div>

      {error ? <p className="quiz-step__error" role="alert">{error}</p> : null}
    </fieldset>
  );
}
