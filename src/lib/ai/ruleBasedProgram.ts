import {randomUUID} from 'node:crypto';

import type {GenerateProgramInput} from '@/lib/ai/requestSecurity';
import {WEEKDAY_VALUES, type Weekday} from '@/lib/ai/restDays';
import type {AiExercise, AiGeneratedProgram, AiMethod} from '@/services/programService';

type ExerciseTemplate = Omit<AiExercise, 'id'>;

const EQUIPMENT_BY_QUIZ_ID: Record<string, AiExercise['equipment']> = {
  none: 'none',
  pull_up_bar: 'pull_up_bar',
  bands: 'resistance_band',
  dumbbells: 'dumbbell',
  barbell: 'barbell',
  kettlebells: 'kettlebell',
  bench: 'bench',
  cable_machine: 'cardio_machine',
  jump_rope: 'other',
};

const METHOD_BY_STYLE: Record<string, AiMethod> = {
  yoga: 'flexibility',
  hiit: 'cardio',
  calisthenics: 'bodyweight',
  pilates: 'pilates',
  mobility: 'mobility',
  isometric: 'isometric',
  resistance_band: 'strength',
  animal_flow: 'mobility',
};

const METHOD_EXERCISES: Record<AiMethod, ExerciseTemplate[]> = {
  strength: [
    exercise('Resistance Band Row', 'strength', 'resistance_band', 'Pull your elbows toward your ribs while keeping your chest lifted.'),
    exercise('Resistance Band Squat', 'strength', 'resistance_band', 'Sit your hips back and keep your knees tracking over your toes.'),
    exercise('Bodyweight Split Squat', 'strength', 'none', 'Keep your torso tall and lower with control through a comfortable range.'),
  ],
  hypertrophy: [exercise('Tempo Bodyweight Squat', 'hypertrophy', 'none', 'Lower slowly with control and stand tall through your heels.')],
  cardio: [
    exercise('Low-Impact Jumping Jack', 'cardio', 'none', 'Step side to side with relaxed shoulders and a steady breathing rhythm.'),
    exercise('Marching High Knees', 'cardio', 'none', 'Drive one knee at a time while staying upright and controlled.'),
  ],
  mobility: [
    exercise('Worlds Greatest Stretch', 'mobility', 'none', 'Move slowly through the lunge and rotate only as far as comfortable.'),
    exercise('Cat Cow', 'mobility', 'none', 'Match each spinal movement to a calm inhale or exhale.'),
  ],
  pilates: [
    exercise('Dead Bug', 'pilates', 'none', 'Keep your lower back gently connected to the floor as opposite limbs move.'),
    exercise('Glute Bridge', 'pilates', 'none', 'Press through your heels and squeeze the glutes without arching your back.'),
  ],
  bodyweight: [
    exercise('Incline Push-Up', 'bodyweight', 'bench', 'Keep your body in one long line and lower your chest with control.'),
    exercise('Bodyweight Squat', 'bodyweight', 'none', 'Brace your torso, sit back, and stand through your whole foot.'),
    exercise('Bird Dog', 'bodyweight', 'none', 'Reach long through opposite arm and leg without twisting your hips.'),
  ],
  isometric: [
    exercise('Wall Sit', 'isometric', 'none', 'Keep your back against the wall and knees comfortable over your ankles.'),
    exercise('Knee Plank Hold', 'isometric', 'none', 'Create a straight line from shoulders to knees and breathe steadily.'),
  ],
  flexibility: [
    exercise('Childs Pose', 'flexibility', 'none', 'Relax your shoulders and breathe into your back and hips.'),
    exercise('Seated Forward Fold', 'flexibility', 'none', 'Lengthen your spine before folding; never force the range.'),
  ],
};

function exercise(
  name: string,
  method: AiMethod,
  equipment: AiExercise['equipment'],
  instructionCue: string,
): ExerciseTemplate {
  return {
    name,
    method,
    equipment,
    sets: 3,
    reps: '8-12',
    rest_seconds: 45,
    tempo: 'controlled',
    rpe: 6,
    instruction_cue: instructionCue,
    alternatives: [],
    contraindicated_for: [],
  };
}

function englishDayName(day: Weekday): string {
  return `${day[0].toUpperCase()}${day.slice(1)}`;
}

function isoDay(day: Weekday): number {
  return WEEKDAY_VALUES.indexOf(day) + 1;
}

function sessionCount(level: GenerateProgramInput['level'], availableDays: number): number {
  const target = level === 'beginner' ? 3 : level === 'advanced' ? 5 : 4;
  return Math.max(1, Math.min(target, availableDays));
}

function focusFor(goals: readonly string[], index: number): string {
  if (goals.includes('fat_loss')) return ['Full Body Conditioning', 'Cardio & Core', 'Full Body Circuit'][index % 3];
  if (goals.includes('flexibility')) return ['Mobility & Flexibility', 'Gentle Flow', 'Mobility & Core'][index % 3];
  if (goals.includes('functional_fitness')) return ['Functional Full Body', 'Balance & Core', 'Movement Quality'][index % 3];
  return ['Full Body Strength', 'Lower Body & Core', 'Upper Body & Mobility'][index % 3];
}

/**
 * Builds a safe, deterministic starter plan when an external AI provider is
 * unavailable. It deliberately uses only the quiz's selected styles, honors
 * every rest day, and returns the same validated shape as the AI generator.
 */
export function buildRuleBasedProgram(input: GenerateProgramInput): AiGeneratedProgram {
  const restDays = input.restDays ?? [];
  const availableDays = WEEKDAY_VALUES.filter((day) => !restDays.includes(day));
  const sessions = new Set(availableDays.slice(0, sessionCount(input.level, availableDays.length)));
  const methods = input.exerciseStyles
    .map((style) => METHOD_BY_STYLE[style])
    .filter((method): method is AiMethod => Boolean(method));
  const selectedMethods: AiMethod[] = methods.length > 0 ? methods : ['bodyweight'];
  const selectedEquipment = new Set(input.equipment.map((item) => EQUIPMENT_BY_QUIZ_ID[item] ?? 'none'));
  const difficulty = input.level === 'beginner' ? 2 : input.level === 'advanced' ? 4 : 3;

  const weeklySchedule = WEEKDAY_VALUES.map((day, index) => {
    const isRest = !sessions.has(day);
    if (isRest) {
      return {
        day: isoDay(day),
        day_name: englishDayName(day),
        focus: 'Rest & Recovery',
        is_rest_day: true,
        warmup: [],
        exercises: [],
        cooldown: [],
        notes: 'Recovery day. A relaxed walk or gentle mobility is optional.',
      };
    }

    const method = selectedMethods[index % selectedMethods.length];
    const candidates = METHOD_EXERCISES[method].filter(
      (item) => item.equipment === 'none' || selectedEquipment.has(item.equipment),
    );
    const safeFallback = METHOD_EXERCISES.bodyweight.filter((item) => item.equipment === 'none' || selectedEquipment.has(item.equipment));
    const source = candidates.length > 0
      ? candidates
      : safeFallback.length > 0
        ? safeFallback
        : METHOD_EXERCISES.mobility.filter((item) => item.equipment === 'none');
    const exercises = source.slice(0, 3).map((item, exerciseIndex) => ({
      ...item,
      id: `rule-${day}-${exerciseIndex + 1}`,
      sets: difficulty,
      reps: method === 'cardio' || method === 'isometric' ? '30 seconds' : input.level === 'advanced' ? '10-15' : '8-12',
      rest_seconds: input.level === 'beginner' ? 60 : 45,
      rpe: input.level === 'advanced' ? 7 : 6,
    }));

    return {
      day: isoDay(day),
      day_name: englishDayName(day),
      focus: focusFor(input.goal, index),
      warmup: [{name: 'Easy warm-up', duration_seconds: 180, purpose: 'Prepare joints and breathing for the session.'}],
      exercises,
      cooldown: [{name: 'Easy breathing and stretch', duration_seconds: 120, purpose: 'Bring the session to a calm finish.'}],
      notes: 'Use a pain-free range of motion and stop if you feel sharp or worsening pain.',
    };
  });

  return {
    mode: 'general',
    program_id: `rule-${randomUUID()}`,
    rest_days: [...restDays],
    method_mix: {
      strength_pct: selectedMethods.includes('strength') ? 30 : 0,
      hypertrophy_pct: 0,
      cardio_pct: selectedMethods.includes('cardio') ? 30 : 0,
      mobility_pct: selectedMethods.includes('mobility') || selectedMethods.includes('flexibility') ? 20 : 0,
      pilates_pct: selectedMethods.includes('pilates') ? 20 : 0,
      bodyweight_pct: selectedMethods.includes('bodyweight') ? 30 : 0,
      isometric_pct: selectedMethods.includes('isometric') ? 20 : 0,
    },
    weekly_schedule: weeklySchedule,
    progression_plan: {
      weeks_1_2: 'Learn the movements at a comfortable pace and leave repetitions in reserve.',
      weeks_3_5: 'Add one or two repetitions per set when every movement feels controlled.',
      week_6: 'Keep the same quality and review recovery before increasing difficulty.',
      overload_variables: ['repetitions', 'sets', 'range of motion', 'rest time'],
    },
    adjustments: {
      summary: 'Starter plan generated from your quiz answers because the AI provider is unavailable.',
      progression: ['Increase repetitions gradually when technique remains controlled.'],
      regression: ['Reduce range of motion or repetitions if form or comfort deteriorates.'],
      rationale: 'There is no completed workout history yet, so the plan starts conservatively.',
    },
    warnings: input.limitations.filter((item) => item !== 'none').map((item) => `Respect your ${item.replace(/_/g, ' ')} limitation and avoid painful movements.`),
    notes: 'This is a rule-based starter plan generated from your selected goals, level, equipment, styles, and rest days.',
    disclaimer: 'This starter plan is general fitness information, not medical advice. Stop if you experience pain, dizziness, chest pain, severe shortness of breath, numbness, weakness, or worsening symptoms, and consult a qualified clinician when appropriate.',
  };
}
