'use client';

import {useEffect, useState} from 'react';
import {EXERCISE_STYLE_IDS} from '@/lib/exerciseStyles';

type Labels = {
  title: string;
  save: string;
  saved: string;
  error: string;
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
    <section aria-label={labels.title} className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-800">{labels.title}</h2>
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-slate-600">{labels.styles.title}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {EXERCISE_STYLE_IDS.map((id) => (
            <label key={id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
              <input type="checkbox" checked={exerciseStyles.includes(id)} onChange={() => toggle(id, exerciseStyles, setExerciseStyles)} />
              {labels.styles[id] ?? id}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-slate-600">{labels.equipment.title}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {EQUIPMENT.map((id) => (
            <label key={id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
              <input type="checkbox" checked={equipment.includes(id)} onChange={() => toggle(id, equipment, setEquipment)} />
              {labels.equipment[id] ?? id}
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
