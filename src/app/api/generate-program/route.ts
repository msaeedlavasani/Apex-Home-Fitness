import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { loadSystemPrompt, PromptMode } from '@/lib/ai/prompts';
import { NextResponse } from 'next/server';

import { saveGeneratedProgram } from '@/services/programService';
import { UnauthenticatedError } from '@/services/userService';

// Schema for the exercise object in the AI output
const ExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  method: z.enum(['strength', 'hypertrophy', 'cardio', 'mobility', 'pilates', 'bodyweight', 'isometric', 'flexibility']),
  equipment: z.enum(['none', 'dumbbell', 'barbell', 'kettlebell', 'resistance_band', 'pull_up_bar', 'bench', 'mat', 'cardio_machine', 'other']),
  sets: z.number().nullable(),
  reps: z.string().nullable(),
  rest_seconds: z.number().nullable(),
  tempo: z.string().nullable(),
  rpe: z.number().nullable(),
  instruction_cue: z.string(),
  alternatives: z.array(z.object({
    name: z.string(),
    equipment: z.string(),
    reason: z.string(),
  })),
  contraindicated_for: z.array(z.string()),
});

// Full program schema
const ProgramSchema = z.object({
  mode: z.enum(['general', 'injury_focused', 'equipment_limited']),
  program_id: z.string(),
  method_mix: z.object({
    strength_pct: z.number(),
    hypertrophy_pct: z.number(),
    cardio_pct: z.number(),
    mobility_pct: z.number(),
    pilates_pct: z.number(),
    bodyweight_pct: z.number(),
    isometric_pct: z.number(),
  }),
  weekly_schedule: z.array(z.object({
    day: z.number(),
    focus: z.string(),
    warmup: z.array(z.object({
      name: z.string(),
      duration_seconds: z.number(),
      purpose: z.string(),
    })),
    exercises: z.array(ExerciseSchema),
    cooldown: z.array(z.object({
      name: z.string(),
      duration_seconds: z.number(),
      purpose: z.string(),
    })),
    notes: z.string().optional(),
  })),
  progression_plan: z.object({
    weeks_1_2: z.string(),
    weeks_3_5: z.string(),
    week_6: z.string(),
    overload_variables: z.array(z.string()),
  }),
  warnings: z.array(z.string()),
  notes: z.string(),
  disclaimer: z.string(),
});

export async function POST(req: Request) {
  try {
    const { level, goal, equipment, limitations, limitationsDetails } = await req.json();

    // Determine mode
    let mode: PromptMode = 'general';
    if (limitations && limitations.length > 0) {
      mode = 'injury_focused';
    } else if (!equipment || equipment.length === 0 || (equipment.length === 1 && equipment[0] === 'none')) {
      mode = 'equipment_limited';
    }

    const systemPrompt = await loadSystemPrompt(mode);

    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: ProgramSchema,
      prompt: `Generate a workout program for a user with the following profile:
        - Level: ${level}
        - Goal: ${goal}
        - Available Equipment: ${equipment.join(', ')}
        - Injuries/Limitations: ${limitations.join(', ')}
        - Details: ${limitationsDetails || 'None'}
      `,
      system: systemPrompt,
    });

    // Persist the validated program into `Program` / `ProgramExercise`,
    // linked to the current authenticated user (transactional).
    const program = await saveGeneratedProgram({
      program: result.object,
      level,
      goal,
    });

    return NextResponse.json({
      program, // persisted DB record (Program + ProgramExercise links)
      generated: result.object, // full validated AI output (warmups, cooldowns, progression…)
    });
  } catch (error) {
    console.error('Error generating program:', error);
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to generate program' }, { status: 500 });
  }
}
