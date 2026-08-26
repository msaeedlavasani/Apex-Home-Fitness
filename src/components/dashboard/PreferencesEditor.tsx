'use client';

import {useEffect, useState} from 'react';
import {EXERCISE_STYLE_IDS} from '@/lib/exerciseStyles';

type Labels = {
  title: string;
  save: string;
  saved: string;
  error: string;
  stylesTitle: string;
  equipmentTitle: string;
  styles: Record<string, string>;
  equipment: Record<string, string>;
};

type Props = {
  labels: Labels;
  initial: {exerciseStyles: string[]; equipment: string[]};
};

const EQUIPMENT = ['none', 'pull_up_bar', 'bands', 'dumbbells', 'barbell', 'kettlebells', 'bench', 'cable_machine', 'jump_rope'];

export function PreferencesEditor({labels, initial}: Props) {
  const [exerciseStyles, setExerciseStyles] = useState(initial.exerciseStyles);
  const [equipment, setEquipment] = useState(initial.equipment.length > 0 ? initial.equipment : ['none']);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setExerciseStyles(initial.exerciseStyles);
    setEquipment(initial.equipment.length > 0 ? initial.equipment : ['none']);
  }, [initial]);

  const toggle = (value: string, list: string[], setList: (next: string[]) => void) => {
    if (value === 'none') {
      setList(list.includes('none') ? [] : ['none']);
      return;
    }
    const withoutNone = list.filter((item) => item !== 'none');
    setList(withoutNone.includes(value) ? withoutNone.filter((item) => item !== value) : [...withoutNone, value]);
  };

  async function save() {
    setState('saving');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({exerciseStyles, equipment}),
      });
      setState(response.ok ? 'saved' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <section aria-label={labels.title} className="mt-5 rounded-3xl border border-[color:var(--apex-border)] bg-[color:var(--apex-card)] p-5 shadow-sm">
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
      <button type="button" onClick={() => void save()} disabled={state === 'saving' || exerciseStyles.length === 0 || equipment.length === 0} className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
        {state === 'saving' ? '…' : state === 'saved' ? labels.saved : labels.save}
      </button>
      {state === 'error' ? <p role="alert" className="mt-2 text-sm text-red-600">{labels.error}</p> : null}
    </section>
  );
}
