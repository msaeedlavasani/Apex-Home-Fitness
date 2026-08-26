/**
 * Canonical AI Program-generation contracts (S-01 Shared Contract Ownership).
 *
 * These types describe the validated AI program output — the mirror of the
 * `ProgramSchema` in `src/app/api/generate-program/route.ts` (the shape of
 * `result.object`). They are produced by both the AI path and the rules engine
 * (`ruleBasedProgram.ts`) and consumed by `programService.ts` for persistence.
 *
 * Previously owned by the higher-level `@/services/programService` — moved
 * here so lower-level reusable modules never depend on a service
 * implementation for a shared contract. `programService.ts` re-exports these
 * types for backward compatibility; new code should import from this module.
 */

export type AiMethod =
  | 'strength'
  | 'hypertrophy'
  | 'cardio'
  | 'mobility'
  | 'pilates'
  | 'bodyweight'
  | 'isometric'
  | 'flexibility';

export type AiEquipment =
  | 'none'
  | 'dumbbell'
  | 'barbell'
  | 'kettlebell'
  | 'resistance_band'
  | 'pull_up_bar'
  | 'bench'
  | 'mat'
  | 'cardio_machine'
  | 'cable_machine'
  | 'jump_rope'
  | 'other';

export type AiProgramMode = 'general' | 'injury_focused' | 'equipment_limited';

/** A single exercise object inside the validated AI output. */
export interface AiExercise {
  id: string;
  name: string;
  method: AiMethod;
  equipment: AiEquipment;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  tempo: string | null;
  rpe: number | null;
  instruction_cue: string;
  alternatives: Array<{ name: string; equipment: string; reason: string }>;
  contraindicated_for: string[];
}

/** One training day inside the validated AI output. */
export interface AiWeeklySession {
  day: number;
  focus: string;
  /** Weekday of the session ("Monday"…"Sunday") — used to enforce rest days. */
  day_name?: string;
  /**
   * True for entries the enforcement pass rewrote because they landed on a
   * user-selected rest day; such entries carry NO exercises/warmup/cooldown
   * and are skipped by `buildProgramDraft`.
   */
  is_rest_day?: boolean;
  warmup: Array<{ name: string; duration_seconds: number; purpose: string }>;
  exercises: AiExercise[];
  cooldown: Array<{ name: string; duration_seconds: number; purpose: string }>;
  notes?: string;
}

/** The full validated AI program output (`ProgramSchema`). */
export interface AiGeneratedProgram {
  mode: AiProgramMode;
  program_id: string;
  /** The user's rest-day selection echoed into the output (weekday ids). */
  rest_days?: string[];
  method_mix: {
    strength_pct: number;
    hypertrophy_pct: number;
    cardio_pct: number;
    mobility_pct: number;
    pilates_pct: number;
    bodyweight_pct: number;
    isometric_pct: number;
  };
  weekly_schedule: AiWeeklySession[];
  progression_plan: {
    weeks_1_2: string;
    weeks_3_5: string;
    week_6: string;
    overload_variables: string[];
  };
  adjustments?: {
    summary: string;
    progression: string[];
    regression: string[];
    rationale: string;
  };
  warnings: string[];
  notes: string;
  disclaimer: string;
  /** Traceable source information returned with the generation response. */
  metadata?: {
    source: 'ai' | 'rules';
    provider: 'groq' | 'openai' | null;
    model: string | null;
    fallbackReason: string | null;
    engineVersion: string;
  };
}
