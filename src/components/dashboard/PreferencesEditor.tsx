'use client';

import {useEffect, useRef, useState} from 'react';
import {useLocale} from 'next-intl';
import {EXERCISE_STYLE_IDS} from '@/lib/exerciseStyles';
import {generateProgramApi, QuizApiError} from '@/lib/quiz/quizApi';
import {getWeekdayOptions, REST_DAY_MAX} from '@/components/quiz/restDays';
import type {GenerateProgramInput} from '@/lib/ai/requestSecurity';

export type PreferenceLabels = {
  title: string;
  save: string;
  saved: string;
  generating: string;
  generated: string;
  error: string;
  generationError: string;
  stylesTitle: string;
  equipmentTitle: string;
  restDaysTitle: string;
  restDaysSubtitle: string;
  styles: Record<string, string>;
  equipment: Record<string, string>;
  restDays: Record<string, string>;
};

type Props = {
  labels: PreferenceLabels;
  initial: {exerciseStyles: string[]; equipment: string[]; restDays: string[]};
};

const EQUIPMENT = ['none', 'pull_up_bar', 'bands', 'dumbbells', 'barbell', 'kettlebells', 'bench', 'cable_machine', 'jump_rope'];

export function PreferencesEditor({labels, initial}: Props) {
  const locale = useLocale();
  const [exerciseStyles, setExerciseStyles] = useState(initial.exerciseStyles);
  const [equipment, setEquipment] = useState(initial.equipment.length > 0 ? initial.equipment : ['none']);
  const [restDays, setRestDays] = useState(initial.restDays);
  const [state, setState] = useState<'idle' | 'saving' | 'generating' | 'saved' | 'error'>('idle');
  const generationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setExerciseStyles(initial.exerciseStyles);
    setEquipment(initial.equipment.length > 0 ? initial.equipment : ['none']);
    setRestDays(initial.restDays);
  }, [initial]);

  const toggle = (value: string, list: string[], setList: (next: string[]) => void) => {
    if (value === 'none') {
      setList(list.includes('none') ? [] : ['none']);
      return;
    }
    const withoutNone = list.filter((item) => item !== 'none');
    setList(withoutNone.includes(value) ? withoutNone.filter((item) => item !== value) : [...withoutNone, value]);
  };

  // Rest days: 1–3 weekdays (REST_DAY_MAX). Selecting beyond the maximum is
  // ignored, and unselected days are disabled once the cap is reached.
  const toggleRestDay = (value: string) => {
    setRestDays((current) => {
      if (current.includes(value)) return current.filter((day) => day !== value);
      if (current.length >= REST_DAY_MAX) return current;
      return [...current, value];
    });
  };

  async function save() {
    setState('saving');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({exerciseStyles, equipment, restDays}),
      });
      const data = await response.json().catch(() => null) as {generationInput?: GenerateProgramInput | null} | null;
      if (!response.ok) throw new Error('preferences update failed');

      if (data?.generationInput) {
        setState('generating');
        if (!generationKeyRef.current) {
          const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          generationKeyRef.current = `preferences-${suffix}`;
        }
        await generateProgramApi(data.generationInput, generationKeyRef.current);
      }
      generationKeyRef.current = null;
      setState('saved');
    } catch (error) {
      // Preferences are persisted before generation starts. Keep the user on
      // this page with an actionable message if the new program could not be
      // generated; retrying reuses the same idempotency key.
      if (error instanceof QuizApiError) {
        setState('error');
      } else {
        setState('error');
      }
    }
  }

  return (
    <section aria-label={labels.title} className="rounded-3xl border border-[color:var(--apex-border)] bg-[color:var(--apex-card)] p-5 shadow-sm">
      <h2 className="text-base font-bold text-[color:var(--apex-text)]">{labels.title}</h2>
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-[color:var(--apex-text-secondary)]">{labels.stylesTitle}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {EXERCISE_STYLE_IDS.map((id) => (
            <label key={id} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${exerciseStyles.includes(id) ? 'border-emerald-500 bg-emerald-500/10 text-[color:var(--apex-text)]' : 'border-[color:var(--apex-border)] text-[color:var(--apex-text-secondary)] hover:bg-[color:var(--apex-fill)]'}`}>
              <input type="checkbox" checked={exerciseStyles.includes(id)} onChange={() => toggle(id, exerciseStyles, setExerciseStyles)} className="h-4 w-4 shrink-0 accent-emerald-600" />
              <span className="leading-5">{labels.styles[id] ?? id}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-[color:var(--apex-text-secondary)]">{labels.equipmentTitle}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {EQUIPMENT.map((id) => (
            <label key={id} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${equipment.includes(id) ? 'border-emerald-500 bg-emerald-500/10 text-[color:var(--apex-text)]' : 'border-[color:var(--apex-border)] text-[color:var(--apex-text-secondary)] hover:bg-[color:var(--apex-fill)]'}`}>
              <input type="checkbox" checked={equipment.includes(id)} onChange={() => toggle(id, equipment, setEquipment)} className="h-4 w-4 shrink-0 accent-emerald-600" />
              <span className="leading-5">{labels.equipment[id] ?? id}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-[color:var(--apex-text-secondary)]">{labels.restDaysTitle}</legend>
        <p className="mt-1 text-xs text-[color:var(--apex-text-secondary)]">{labels.restDaysSubtitle}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {getWeekdayOptions(locale).map(({id}) => {
            const selected = restDays.includes(id);
            const atMax = restDays.length >= REST_DAY_MAX;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                disabled={!selected && atMax}
                onClick={() => toggleRestDay(id)}
                className={`flex min-h-12 items-center justify-center rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${selected ? 'border-emerald-500 bg-emerald-500/10 text-[color:var(--apex-text)]' : 'border-[color:var(--apex-border)] text-[color:var(--apex-text-secondary)] hover:bg-[color:var(--apex-fill)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'}`}
              >
                {labels.restDays[id] ?? id}
              </button>
            );
          })}
        </div>
      </fieldset>
      <button type="button" onClick={() => void save()} disabled={state === 'saving' || state === 'generating' || exerciseStyles.length === 0 || equipment.length === 0 || restDays.length === 0} className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
        {state === 'saving' ? '…' : state === 'generating' ? labels.generating : state === 'saved' ? labels.generated : labels.save}
      </button>
      {state === 'error' ? <p role="alert" className="mt-2 text-sm text-red-600">{labels.generationError || labels.error}</p> : null}
    </section>
  );
}
