import {createHash} from 'node:crypto';

import type {GenerateProgramInput} from '@/lib/ai/requestSecurity';
import {WEEKDAY_VALUES, type Weekday} from '@/lib/ai/restDays';
import type {AiExercise, AiGeneratedProgram, AiMethod} from '@/services/programService';

type Limitation = Exclude<GenerateProgramInput['limitations'][number], 'none'>;
type ExerciseTemplate = Omit<AiExercise, 'id'>;

export interface RuleWorkoutSession {
  completedAt?: Date | string | null;
  durationSeconds?: number | null;
  exercises?: Array<{
    completed: boolean;
    actualSets?: number | null;
    actualReps?: number | null;
    durationSeconds?: number | null;
  }>;
}

export interface RuleHistorySummary {
  sessionCount: number;
  completedSessions: number;
  sessionCompletionRate: number;
  exerciseCompletionRate: number;
  actualSets: number;
  actualReps: number;
  durationSeconds: number;
}

export interface RuleBasedProgramOptions {
  history?: RuleHistorySummary;
}

const EQUIPMENT_BY_QUIZ_ID: Record<string, AiExercise['equipment']> = {
  none: 'none', pull_up_bar: 'pull_up_bar', bands: 'resistance_band',
  dumbbells: 'dumbbell', barbell: 'barbell', kettlebells: 'kettlebell',
  bench: 'bench', cable_machine: 'cable_machine', jump_rope: 'jump_rope',
};

const METHOD_BY_STYLE: Record<string, AiMethod> = {
  yoga: 'flexibility', hiit: 'cardio', calisthenics: 'bodyweight', pilates: 'pilates',
  mobility: 'mobility', isometric: 'isometric', resistance_band: 'strength', animal_flow: 'mobility',
};

const METHOD_EXERCISES: Record<AiMethod, ExerciseTemplate[]> = {
  strength: [
    exercise('Resistance Band Row', 'strength', 'resistance_band', 'Pull your elbows toward your ribs while keeping your chest lifted.', ['shoulder']),
    exercise('Resistance Band Squat', 'strength', 'resistance_band', 'Sit your hips back and keep your knees tracking over your toes.', ['knee', 'hip', 'ankle']),
    exercise('Dumbbell Floor Press', 'strength', 'dumbbell', 'Keep your wrists stacked and lower your elbows only to a comfortable depth.', ['shoulder', 'wrist']),
    exercise('Kettlebell Deadlift', 'strength', 'kettlebell', 'Brace your torso and stand by driving through the floor.', ['lower_back', 'hip']),
    exercise('Cable Row', 'strength', 'cable_machine', 'Stay tall and draw the handle toward your lower ribs.', ['shoulder']),
    exercise('Supported Split Squat', 'strength', 'bench', 'Use the bench for balance and work only through a comfortable range.', ['knee', 'hip', 'ankle']),
    exercise('Bodyweight Good Morning', 'strength', 'none', 'Hinge your hips back with a long spine, then stand tall.', ['lower_back', 'hip']),
    exercise('Bodyweight Calf Raise', 'strength', 'none', 'Rise smoothly onto the balls of your feet and lower with control.', ['ankle']),
  ],
  hypertrophy: [
    exercise('Tempo Bodyweight Squat', 'hypertrophy', 'none', 'Lower slowly with control and stand tall through your whole foot.', ['knee', 'hip', 'ankle']),
    exercise('Dumbbell Curl', 'hypertrophy', 'dumbbell', 'Keep your elbows quiet and avoid swinging the weight.', ['wrist']),
    exercise('Resistance Band Lateral Raise', 'hypertrophy', 'resistance_band', 'Raise only to a pain-free height with relaxed shoulders.', ['shoulder', 'neck']),
  ],
  cardio: [
    exercise('Low-Impact Step Jack', 'cardio', 'none', 'Step side to side with relaxed shoulders and steady breathing.', ['ankle', 'knee']),
    exercise('March in Place', 'cardio', 'none', 'Stay upright and use a comfortable knee height.', ['hip', 'knee', 'ankle']),
    exercise('Jump Rope Intervals', 'cardio', 'jump_rope', 'Use small quiet jumps and stop before technique deteriorates.', ['knee', 'ankle', 'hip', 'lower_back']),
    exercise('Brisk Cardio Machine', 'cardio', 'cardio_machine', 'Choose a pace that lets you speak in short sentences.', ['knee', 'ankle']),
  ],
  mobility: [
    exercise('Open Book Rotation', 'mobility', 'none', 'Rotate slowly from the upper back without forcing the range.', ['shoulder', 'neck']),
    exercise('Cat Cow', 'mobility', 'none', 'Match each gentle spinal movement to a calm breath.', ['wrist', 'neck']),
    exercise('Standing Hip Hinge Drill', 'mobility', 'none', 'Send your hips back with a long neutral spine.', ['lower_back', 'hip']),
    exercise('Ankle Rock', 'mobility', 'none', 'Move the knee forward gently while keeping the heel down.', ['ankle', 'knee']),
  ],
  pilates: [
    exercise('Dead Bug', 'pilates', 'none', 'Keep your lower back gently connected to the floor as opposite limbs move.', ['hip', 'lower_back']),
    exercise('Glute Bridge', 'pilates', 'none', 'Press through your heels and squeeze the glutes without arching your back.', ['hip', 'lower_back', 'knee']),
    exercise('Side-Lying Leg Lift', 'pilates', 'none', 'Keep your hips stacked and move without swinging.', ['hip']),
    exercise('Supine Arm Reach', 'pilates', 'none', 'Keep your ribs relaxed while reaching only through a comfortable range.', ['shoulder']),
  ],
  bodyweight: [
    exercise('Incline Push-Up', 'bodyweight', 'bench', 'Keep your body in one line and lower your chest with control.', ['shoulder', 'wrist', 'neck']),
    exercise('Bodyweight Squat', 'bodyweight', 'none', 'Brace your torso, sit back, and stand through your whole foot.', ['knee', 'hip', 'ankle']),
    exercise('Bird Dog', 'bodyweight', 'none', 'Reach through opposite arm and leg without twisting your hips.', ['wrist', 'shoulder', 'lower_back']),
    exercise('Standing Calf Raise', 'bodyweight', 'none', 'Rise smoothly and lower with control while holding support if needed.', ['ankle']),
    exercise('Pull-Up Bar Scapular Hold', 'bodyweight', 'pull_up_bar', 'Keep the shoulders away from the ears and use a short comfortable hold.', ['shoulder', 'wrist', 'neck']),
  ],
  isometric: [
    exercise('Wall Sit', 'isometric', 'none', 'Choose a shallow knee angle and breathe steadily.', ['knee', 'hip', 'ankle']),
    exercise('Forearm Plank Hold', 'isometric', 'none', 'Keep a long neutral line and stop before the lower back arches.', ['shoulder', 'lower_back', 'neck']),
    exercise('Standing Glute Squeeze', 'isometric', 'none', 'Stand tall and gently contract the glutes without arching your back.', ['hip', 'lower_back']),
    exercise('Seated Band Row Hold', 'isometric', 'resistance_band', 'Hold the elbows near the ribs without shrugging.', ['shoulder', 'neck']),
  ],
  flexibility: [
    exercise('Diaphragmatic Breathing', 'flexibility', 'none', 'Breathe slowly into the sides of your ribs without forcing depth.'),
    exercise('Supported Relaxation', 'flexibility', 'none', 'Settle into a comfortable position and release unnecessary tension.'),
    exercise('Standing Chest Opener', 'flexibility', 'none', 'Open the chest gently without tipping the head or forcing the shoulders.', ['shoulder', 'neck']),
    exercise('Seated Hamstring Stretch', 'flexibility', 'none', 'Keep a long spine and stop well before pain.', ['lower_back', 'hip']),
  ],
};

function exercise(name: string, method: AiMethod, equipment: AiExercise['equipment'], instructionCue: string, contraindicatedFor: Limitation[] = []): ExerciseTemplate {
  return {name, method, equipment, sets: 3, reps: '8-12', rest_seconds: 45, tempo: 'controlled', rpe: 6, instruction_cue: instructionCue, alternatives: [], contraindicated_for: contraindicatedFor};
}

export function summarizeRuleWorkoutHistory(sessions: RuleWorkoutSession[]): RuleHistorySummary {
  const exercises = sessions.flatMap((session) => session.exercises ?? []);
  const completedSessions = sessions.filter((session) => session.completedAt != null).length;
  return {
    sessionCount: sessions.length,
    completedSessions,
    sessionCompletionRate: sessions.length === 0 ? 0 : completedSessions / sessions.length,
    exerciseCompletionRate: exercises.length === 0 ? 0 : exercises.filter((item) => item.completed).length / exercises.length,
    actualSets: exercises.reduce((sum, item) => sum + (item.actualSets ?? 0), 0),
    actualReps: exercises.reduce((sum, item) => sum + (item.actualReps ?? 0), 0),
    durationSeconds: sessions.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0),
  };
}

function englishDayName(day: Weekday): string { return `${day[0].toUpperCase()}${day.slice(1)}`; }
function isoDay(day: Weekday): number { return WEEKDAY_VALUES.indexOf(day) + 1; }
function defaultSessionCount(level: GenerateProgramInput['level']): number { return level === 'beginner' ? 3 : level === 'advanced' ? 5 : 4; }

function evenlySpacedDays(days: Weekday[], count: number): Set<Weekday> {
  const safeCount = Math.max(1, Math.min(count, days.length));
  return new Set(Array.from({length: safeCount}, (_, index) => days[Math.floor(((index + 0.5) * days.length) / safeCount)]));
}

function focusFor(goals: readonly string[], index: number): string {
  if (goals.includes('fat_loss')) return ['Full Body Conditioning', 'Cardio & Core', 'Full Body Circuit'][index % 3];
  if (goals.includes('flexibility')) return ['Mobility & Flexibility', 'Gentle Flow', 'Mobility & Core'][index % 3];
  if (goals.includes('functional_fitness')) return ['Functional Full Body', 'Balance & Core', 'Movement Quality'][index % 3];
  return ['Full Body Strength', 'Lower Body & Core', 'Upper Body & Mobility'][index % 3];
}

function historyAdjustment(history: RuleHistorySummary | undefined) {
  if (!history || history.sessionCount === 0) return {setDelta: 0, rpeDelta: 0, restDelta: 0, summary: 'Conservative baseline for a new training history.', rationale: 'No recent workout history was available, so the plan starts at the baseline for the selected level.'};
  const sessionRate = Math.round(history.sessionCompletionRate * 100);
  const exerciseRate = Math.round(history.exerciseCompletionRate * 100);
  if (history.sessionCount >= 3 && history.sessionCompletionRate >= 0.8 && history.exerciseCompletionRate >= 0.8) return {setDelta: 1, rpeDelta: 1, restDelta: -5, summary: 'Small progression based on strong recent adherence.', rationale: `${history.completedSessions}/${history.sessionCount} sessions and ${exerciseRate}% of logged exercises were completed, so volume increases by one set with a small RPE progression.`};
  if (history.sessionCount >= 3 && (history.sessionCompletionRate < 0.5 || history.exerciseCompletionRate < 0.5)) return {setDelta: -1, rpeDelta: -1, restDelta: 15, summary: 'Reduced starting load to rebuild consistency.', rationale: `${sessionRate}% of recent sessions and ${exerciseRate}% of logged exercises were completed, so volume and RPE are reduced and rest is extended.`};
  return {setDelta: 0, rpeDelta: 0, restDelta: 0, summary: 'Baseline retained while adherence stabilizes.', rationale: `${history.completedSessions}/${history.sessionCount} recent sessions were completed; the signal is not strong enough for an automatic progression or regression.`};
}

function availableExercise(item: ExerciseTemplate, equipment: Set<AiExercise['equipment']>, limitations: Set<string>): boolean {
  return (item.equipment === 'none' || equipment.has(item.equipment)) && item.contraindicated_for.every((item) => !limitations.has(item));
}

function rotateTake<T>(items: T[], offset: number, count: number): T[] {
  if (items.length === 0) return [];
  return Array.from({length: Math.min(count, items.length)}, (_, index) => items[(offset + index) % items.length]);
}

function methodMix(schedule: AiGeneratedProgram['weekly_schedule']): AiGeneratedProgram['method_mix'] {
  const counts = {strength: 0, hypertrophy: 0, cardio: 0, mobility: 0, pilates: 0, bodyweight: 0, isometric: 0};
  for (const item of schedule.flatMap((session) => session.exercises)) counts[item.method === 'flexibility' ? 'mobility' : item.method] += 1;
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const entries = Object.entries(counts) as Array<[keyof typeof counts, number]>;
  const percentages = Object.fromEntries(entries.map(([key, value]) => [key, total === 0 ? 0 : Math.floor((value * 100) / total)])) as Record<keyof typeof counts, number>;
  const remaining = total === 0 ? 0 : 100 - Object.values(percentages).reduce((sum, value) => sum + value, 0);
  const ranked = entries.sort((a, b) => ((b[1] * 100) % total) - ((a[1] * 100) % total));
  for (let index = 0; index < remaining; index += 1) percentages[ranked[index % ranked.length][0]] += 1;
  return {strength_pct: percentages.strength, hypertrophy_pct: percentages.hypertrophy, cardio_pct: percentages.cardio, mobility_pct: percentages.mobility, pilates_pct: percentages.pilates, bodyweight_pct: percentages.bodyweight, isometric_pct: percentages.isometric};
}

function deterministicProgramId(input: GenerateProgramInput, history: RuleHistorySummary | undefined): string {
  const canonical = JSON.stringify({...input, goal: [...input.goal].sort(), exerciseStyles: [...input.exerciseStyles].sort(), equipment: [...input.equipment].sort(), limitations: [...input.limitations].sort(), restDays: [...(input.restDays ?? [])].sort(), history: history ?? null, engine: 'rules-v2'});
  return `rule-${createHash('sha256').update(canonical).digest('hex').slice(0, 20)}`;
}

/** Builds the deterministic, safety-filtered fallback using the same contract as AI output. */
export function buildRuleBasedProgram(input: GenerateProgramInput, options: RuleBasedProgramOptions = {}): AiGeneratedProgram {
  const restDays = input.restDays ?? [];
  const availableDays = WEEKDAY_VALUES.filter((day) => !restDays.includes(day));
  const sessions = evenlySpacedDays(availableDays, input.trainingDaysPerWeek ?? defaultSessionCount(input.level));
  const selectedMethods = [...new Set(input.exerciseStyles.map((style) => METHOD_BY_STYLE[style]).filter((method): method is AiMethod => Boolean(method)))];
  if (selectedMethods.length === 0) selectedMethods.push('bodyweight');
  const equipment = new Set(input.equipment.map((item) => EQUIPMENT_BY_QUIZ_ID[item] ?? 'none'));
  const limitations = new Set(input.limitations.filter((item) => item !== 'none'));
  const adaptation = historyAdjustment(options.history);
  const sets = Math.max(2, Math.min(5, (input.level === 'beginner' ? 2 : input.level === 'advanced' ? 4 : 3) + adaptation.setDelta));
  const rpe = Math.max(4, Math.min(8, (input.level === 'advanced' ? 7 : 6) + adaptation.rpeDelta));
  const restSeconds = Math.max(30, (input.level === 'beginner' ? 60 : 45) + adaptation.restDelta);
  let trainingIndex = 0;

  const weeklySchedule: AiGeneratedProgram['weekly_schedule'] = WEEKDAY_VALUES.map((day) => {
    if (!sessions.has(day)) return {day: isoDay(day), day_name: englishDayName(day), focus: 'Rest & Recovery', is_rest_day: true, warmup: [], exercises: [], cooldown: [], notes: restDays.includes(day) ? 'User-selected workout-free day.' : 'Recovery day added to match the weekly training frequency.'};
    const method = selectedMethods[trainingIndex % selectedMethods.length];
    const preferred = METHOD_EXERCISES[method].filter((item) => availableExercise(item, equipment, limitations));
    const source = preferred.length > 0 ? preferred : METHOD_EXERCISES.flexibility.filter((item) => availableExercise(item, equipment, limitations));
    const exercises = rotateTake(source, trainingIndex, 3).map((item, exerciseIndex) => ({...item, id: `rule-${day}-${exerciseIndex + 1}`, sets, reps: item.method === 'cardio' || item.method === 'isometric' ? '30 seconds' : input.level === 'advanced' ? '10-15' : '8-12', rest_seconds: restSeconds, rpe}));
    const focus = focusFor(input.goal, trainingIndex);
    trainingIndex += 1;
    return {day: isoDay(day), day_name: englishDayName(day), focus, warmup: [{name: 'Easy warm-up', duration_seconds: 180, purpose: 'Prepare joints and breathing for the session.'}], exercises, cooldown: [{name: 'Easy breathing and stretch', duration_seconds: 120, purpose: 'Bring the session to a calm finish.'}], notes: preferred.length === 0 ? `The selected ${method} method had no catalog exercise compatible with all reported limitations and equipment, so a gentle safety substitution was used.` : 'Use a pain-free range of motion and stop if you feel sharp or worsening pain.'};
  });

  const activeLimitations = [...limitations];
  return {
    mode: activeLimitations.length > 0 ? 'injury_focused' : input.equipment.length === 1 && input.equipment[0] === 'none' ? 'equipment_limited' : 'general',
    program_id: deterministicProgramId(input, options.history), rest_days: [...restDays], method_mix: methodMix(weeklySchedule), weekly_schedule: weeklySchedule,
    progression_plan: {weeks_1_2: 'Learn the movements at a comfortable pace and leave repetitions in reserve.', weeks_3_5: adaptation.setDelta > 0 ? 'Use the prescribed extra set while technique and recovery remain consistent.' : 'Add one or two repetitions per set only when every movement feels controlled.', week_6: 'Keep movement quality high and review adherence and recovery before the next progression.', overload_variables: ['repetitions', 'sets', 'range of motion', 'rest time']},
    adjustments: {summary: adaptation.summary, progression: ['Increase repetitions first; add load or difficulty only after all prescribed work is comfortable.'], regression: ['Reduce range, sets, or difficulty and extend rest when comfort or technique deteriorates.'], rationale: adaptation.rationale},
    warnings: activeLimitations.map((item) => `Exercises flagged for the reported ${item.replace(/_/g, ' ')} limitation were excluded; use only a pain-free range and seek professional guidance when needed.`),
    notes: `Rules-based plan using ${sessions.size} training days, selected goals, level, equipment, styles, explicit workout-free days, reported limitations, and recent adherence when available.`,
    disclaimer: 'This starter plan is general fitness information, not medical advice. Stop if you experience pain, dizziness, chest pain, severe shortness of breath, numbness, weakness, or worsening symptoms, and consult a qualified clinician when appropriate.',
  };
}
