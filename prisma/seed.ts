/**
 * Seed script for Apex Home Fitness.
 *
 * Populates the database with:
 *   - 40 exercises (5 per category x 8 categories: Yoga, HIIT,
 *     Calisthenics, Pilates, Mobility, Isometric, Resistance Band,
 *     Animal Flow)
 *   - a demo user
 *   - a sample 4-week program (one exercise per category)
 *   - a quiz response and a completed workout session for the demo user
 *
 * Idempotent — safe to run repeatedly (upserts by name / email).
 *
 * Run with:
 *   npx prisma db seed
 * or directly:
 *   npx ts-node seed.ts
 */

import {
  PrismaClient,
  ExerciseCategory,
  DifficultyLevel,
} from "@prisma/client";

const prisma = new PrismaClient();

type ExerciseSeed = {
  name: string;
  description: string;
  category: ExerciseCategory;
  equipment: string[];
  difficulty: DifficultyLevel;
  durationSeconds: number;
  reps?: number;
  sets?: number;
  restSeconds?: number;
  instructions: string[];
};

const exercises: ExerciseSeed[] = [
  // ===============================================================
  // YOGA (5)
  // ===============================================================
  {
    name: "Downward-Facing Dog",
    description:
      "Foundational inverted V pose that lengthens the spine and opens the shoulders and hamstrings.",
    category: ExerciseCategory.YOGA,
    equipment: ["yoga mat"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 60,
    sets: 3,
    restSeconds: 15,
    instructions: [
      "Start on hands and knees with wrists under shoulders.",
      "Tuck the toes and lift the hips up and back into an inverted V.",
      "Press through the palms and heels; hold for 5 breaths.",
    ],
  },
  {
    name: "Warrior II",
    description:
      "Standing lunge pose that builds leg strength and opens the hips.",
    category: ExerciseCategory.YOGA,
    equipment: ["yoga mat"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 30,
    sets: 2,
    restSeconds: 15,
    instructions: [
      "Step the feet wide and turn the front foot out.",
      "Bend the front knee to 90 degrees with the back leg straight.",
      "Extend the arms parallel to the floor; hold 30 seconds per side.",
    ],
  },
  {
    name: "Tree Pose",
    description:
      "Balance pose that strengthens the ankles, legs and core.",
    category: ExerciseCategory.YOGA,
    equipment: ["yoga mat"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 30,
    sets: 2,
    restSeconds: 15,
    instructions: [
      "Stand tall and shift the weight onto one foot.",
      "Place the other foot on the inner thigh or calf, never the knee.",
      "Bring the palms to heart center; hold 30 seconds, then switch sides.",
    ],
  },
  {
    name: "Chaturanga Dandasana (Low Plank)",
    description:
      "Strength pose that builds arm, shoulder and core control.",
    category: ExerciseCategory.YOGA,
    equipment: ["yoga mat"],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 20,
    sets: 3,
    restSeconds: 20,
    instructions: [
      "From a high plank, shift the weight slightly forward onto the toes.",
      "Lower the body in one straight line until the elbows reach 90 degrees.",
      "Keep the elbows tucked and the core braced; hold or press back up.",
    ],
  },
  {
    name: "Crow Pose (Bakasana)",
    description:
      "Arm-balance pose that develops wrist strength and body awareness.",
    category: ExerciseCategory.YOGA,
    equipment: ["yoga mat", "yoga block (optional)"],
    difficulty: DifficultyLevel.ADVANCED,
    durationSeconds: 15,
    sets: 3,
    restSeconds: 30,
    instructions: [
      "Squat down and place the palms flat, shoulder-width apart.",
      "Lift the hips and bring the knees high onto the upper arms.",
      "Lean forward, shift the weight into the hands, and lift one foot at a time.",
    ],
  },

  // ===============================================================
  // HIIT (5)
  // ===============================================================
  {
    name: "Burpee",
    description:
      "Full-body explosive move combining a squat, plank and jump.",
    category: ExerciseCategory.HIIT,
    equipment: [],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 45,
    restSeconds: 30,
    instructions: [
      "Squat down and place the hands on the floor.",
      "Jump or step back to a plank, then perform a push-up.",
      "Jump the feet back in and explode upward into a jump.",
    ],
  },
  {
    name: "Jump Squats",
    description:
      "Explosive squat variation that builds power in the legs.",
    category: ExerciseCategory.HIIT,
    equipment: [],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 40,
    restSeconds: 30,
    instructions: [
      "Lower into a squat with the chest up and weight in the heels.",
      "Drive through the feet and jump as high as possible.",
      "Land softly and immediately lower into the next rep.",
    ],
  },
  {
    name: "Mountain Climbers",
    description:
      "Fast plank-based cardio move that engages the whole core.",
    category: ExerciseCategory.HIIT,
    equipment: ["yoga mat (optional)"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 30,
    restSeconds: 20,
    instructions: [
      "Start in a high plank with the shoulders over the wrists.",
      "Drive one knee toward the chest, then quickly switch legs.",
      "Keep the hips low and the core tight throughout.",
    ],
  },
  {
    name: "High Knees",
    description:
      "Sprint-in-place drill that spikes the heart rate quickly.",
    category: ExerciseCategory.HIIT,
    equipment: [],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 30,
    restSeconds: 20,
    instructions: [
      "Stand tall and run in place, driving the knees to hip height.",
      "Pump the arms in rhythm with the legs.",
      "Stay light on the balls of the feet.",
    ],
  },
  {
    name: "Skater Jumps",
    description:
      "Lateral plyometric drill that builds agility and leg strength.",
    category: ExerciseCategory.HIIT,
    equipment: [],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 40,
    restSeconds: 30,
    instructions: [
      "Stand on one leg with the other foot lifted behind.",
      "Leap sideways and land on the opposite leg.",
      "Swing the arms to help drive each lateral bound.",
    ],
  },

  // ===============================================================
  // CALISTHENICS (5)
  // ===============================================================
  {
    name: "Push-Up",
    description:
      "Classic upper-body exercise for the chest, shoulders and triceps.",
    category: ExerciseCategory.CALISTHENICS,
    equipment: [],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 45,
    reps: 10,
    sets: 3,
    restSeconds: 30,
    instructions: [
      "Start in a high plank with hands slightly wider than the shoulders.",
      "Lower the chest toward the floor with elbows at 45 degrees.",
      "Press back up, keeping the body in one straight line.",
    ],
  },
  {
    name: "Pull-Up",
    description:
      "Vertical pulling movement that builds back and bicep strength.",
    category: ExerciseCategory.CALISTHENICS,
    equipment: ["pull-up bar"],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 30,
    reps: 6,
    sets: 3,
    restSeconds: 60,
    instructions: [
      "Hang from the bar with an overhand grip, shoulder-width apart.",
      "Drive the elbows down and pull the chin over the bar.",
      "Lower under control to a full hang.",
    ],
  },
  {
    name: "Chair Dips",
    description:
      "Triceps and shoulder exercise using a sturdy chair or bench.",
    category: ExerciseCategory.CALISTHENICS,
    equipment: ["chair or bench"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 30,
    reps: 10,
    sets: 3,
    restSeconds: 30,
    instructions: [
      "Sit on the edge of a chair with hands gripping the edge beside the hips.",
      "Slide the hips off and lower until the elbows reach 90 degrees.",
      "Press back up without locking out harshly.",
    ],
  },
  {
    name: "Pistol Squat",
    description:
      "Advanced single-leg squat that demands balance and mobility.",
    category: ExerciseCategory.CALISTHENICS,
    equipment: [],
    difficulty: DifficultyLevel.ADVANCED,
    durationSeconds: 20,
    reps: 5,
    sets: 3,
    restSeconds: 45,
    instructions: [
      "Stand on one leg and extend the other leg forward.",
      "Sit down as low as possible while keeping the heel down.",
      "Drive through the heel to stand back up.",
    ],
  },
  {
    name: "Plank to Push-Up",
    description:
      "Dynamic plank variation that alternates forearm and high plank.",
    category: ExerciseCategory.CALISTHENICS,
    equipment: ["yoga mat (optional)"],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 40,
    reps: 10,
    sets: 3,
    restSeconds: 30,
    instructions: [
      "Begin in a forearm plank with the core braced.",
      "Press one hand, then the other, up into a high plank.",
      "Lower back to the forearms and repeat, alternating the lead hand.",
    ],
  },

  // ===============================================================
  // PILATES (5)
  // ===============================================================
  {
    name: "The Hundred",
    description:
      "Signature Pilates warm-up that fires up the entire core.",
    category: ExerciseCategory.PILATES,
    equipment: ["yoga mat"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 60,
    sets: 1,
    restSeconds: 30,
    instructions: [
      "Lie on the back, lift the legs to tabletop and curl the head up.",
      "Pump the arms briskly: inhale for 5 pumps, exhale for 5.",
      "Hold for 10 breath cycles (100 pumps).",
    ],
  },
  {
    name: "Roll-Up",
    description:
      "Spinal articulation exercise that stretches and strengthens the abs.",
    category: ExerciseCategory.PILATES,
    equipment: ["yoga mat"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 30,
    reps: 8,
    sets: 2,
    restSeconds: 20,
    instructions: [
      "Lie flat with the arms extended overhead.",
      "Reach forward and roll the spine up one vertebra at a time.",
      "Reach toward the toes, then roll back down slowly.",
    ],
  },
  {
    name: "Single-Leg Circle",
    description:
      "Hip-mobility exercise that challenges core stability.",
    category: ExerciseCategory.PILATES,
    equipment: ["yoga mat"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 30,
    reps: 8,
    sets: 2,
    restSeconds: 15,
    instructions: [
      "Lie on the back with one leg extended toward the ceiling.",
      "Circle the leg across the body and down, then back around.",
      "Switch direction and repeat on the other leg.",
    ],
  },
  {
    name: "Teaser",
    description:
      "Advanced control exercise for the entire core.",
    category: ExerciseCategory.PILATES,
    equipment: ["yoga mat"],
    difficulty: DifficultyLevel.ADVANCED,
    durationSeconds: 20,
    reps: 6,
    sets: 3,
    restSeconds: 30,
    instructions: [
      "Lie back with the arms overhead and the legs extended.",
      "Lift the arms, head and legs into a V shape, balancing on the sit bones.",
      "Roll down slowly with control.",
    ],
  },
  {
    name: "Side Kick (Side Leg Lifts)",
    description:
      "Lateral leg-strengthening move for the glutes and inner thighs.",
    category: ExerciseCategory.PILATES,
    equipment: ["yoga mat"],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 30,
    reps: 10,
    sets: 2,
    restSeconds: 20,
    instructions: [
      "Lie on one side, propped on a forearm, with the legs stacked.",
      "Kick the top leg forward, then sweep it back.",
      "Keep the hips stacked and the core engaged; switch sides.",
    ],
  },

  // ===============================================================
  // MOBILITY (5)
  // ===============================================================
  {
    name: "World's Greatest Stretch",
    description:
      "Full-body lunge stretch that opens the hips, spine and hamstrings.",
    category: ExerciseCategory.MOBILITY,
    equipment: ["yoga mat (optional)"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 45,
    reps: 3,
    restSeconds: 15,
    instructions: [
      "From a deep lunge, drop the back knee and plant the same-side hand.",
      "Rotate the torso and reach the other arm toward the ceiling.",
      "Sink deeper with each exhale, then switch sides.",
    ],
  },
  {
    name: "Cat-Cow",
    description:
      "Gentle spinal wave that improves back mobility.",
    category: ExerciseCategory.MOBILITY,
    equipment: ["yoga mat"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 30,
    reps: 8,
    restSeconds: 10,
    instructions: [
      "Start on the hands and knees with a neutral spine.",
      "Inhale and drop the belly, lifting the chest and tailbone (cow).",
      "Exhale and round the spine, tucking the chin (cat).",
    ],
  },
  {
    name: "90/90 Hip Switch",
    description:
      "Hip-rotation drill that builds external and internal range.",
    category: ExerciseCategory.MOBILITY,
    equipment: ["yoga mat (optional)"],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 40,
    reps: 6,
    restSeconds: 20,
    instructions: [
      "Sit with one leg forward and the other out to the side, knees at 90 degrees.",
      "Lift and rotate both knees to the opposite side in one motion.",
      "Keep the chest tall and move with control.",
    ],
  },
  {
    name: "Deep Squat Hold",
    description:
      "Hip, ankle and back mobility exercise in a resting squat.",
    category: ExerciseCategory.MOBILITY,
    equipment: [],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 45,
    reps: 3,
    restSeconds: 15,
    instructions: [
      "Stand with the feet slightly wider than shoulder-width.",
      "Sit down into a deep squat with heels down and elbows inside the knees.",
      "Hold and breathe, letting the hips open.",
    ],
  },
  {
    name: "Shoulder Dislocates",
    description:
      "Band or dowel pass-through that opens the shoulders and chest.",
    category: ExerciseCategory.MOBILITY,
    equipment: ["resistance band or dowel"],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 30,
    reps: 8,
    restSeconds: 15,
    instructions: [
      "Hold a band or dowel with a wide grip in front of you.",
      "Keeping the arms straight, raise it overhead and behind you.",
      "Return to the front with control.",
    ],
  },

  // ===============================================================
  // ISOMETRIC (5)
  // ===============================================================
  {
    name: "Wall Sit",
    description:
      "Isometric squat against a wall that builds leg endurance.",
    category: ExerciseCategory.ISOMETRIC,
    equipment: ["wall"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 45,
    sets: 3,
    restSeconds: 30,
    instructions: [
      "Slide down a wall until the knees reach 90 degrees.",
      "Press the back flat against the wall and hold.",
      "Breathe steadily; stand up when the time is up.",
    ],
  },
  {
    name: "Plank Hold",
    description:
      "Full-body isometric hold for core and shoulder stability.",
    category: ExerciseCategory.ISOMETRIC,
    equipment: ["yoga mat (optional)"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 45,
    sets: 3,
    restSeconds: 30,
    instructions: [
      "Hold a forearm or high plank with a straight line from head to heels.",
      "Squeeze the glutes and brace the abs.",
      "Keep breathing; do not let the hips sag.",
    ],
  },
  {
    name: "Glute Bridge Hold",
    description:
      "Isometric glute and hamstring hold performed on the floor.",
    category: ExerciseCategory.ISOMETRIC,
    equipment: ["yoga mat"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 40,
    sets: 3,
    restSeconds: 20,
    instructions: [
      "Lie on the back with the knees bent and feet flat.",
      "Lift the hips until the body forms a straight line.",
      "Squeeze the glutes and hold at the top.",
    ],
  },
  {
    name: "Hollow Body Hold",
    description:
      "Advanced core hold that teaches whole-body tension.",
    category: ExerciseCategory.ISOMETRIC,
    equipment: ["yoga mat (optional)"],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 30,
    sets: 3,
    restSeconds: 30,
    instructions: [
      "Lie on the back and press the lower back into the floor.",
      "Lift the shoulders and legs off the floor.",
      "Hold the banana shape with the arms extended overhead.",
    ],
  },
  {
    name: "L-Sit Hold",
    description:
      "Advanced isometric hold on bars or the floor.",
    category: ExerciseCategory.ISOMETRIC,
    equipment: ["parallel bars (or sturdy chairs)"],
    difficulty: DifficultyLevel.ADVANCED,
    durationSeconds: 15,
    sets: 3,
    restSeconds: 45,
    instructions: [
      "Sit with the legs extended and hands pressed into the bars or floor.",
      "Press down hard and lift the hips off the support.",
      "Keep the legs straight and the toes pointed; hold.",
    ],
  },

  // ===============================================================
  // RESISTANCE BAND (5)
  // ===============================================================
  {
    name: "Banded Lateral Walk",
    description:
      "Glute-activating side-step drill with a band around the legs.",
    category: ExerciseCategory.RESISTANCE_BAND,
    equipment: ["resistance band"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 40,
    reps: 10,
    sets: 3,
    restSeconds: 20,
    instructions: [
      "Place a loop band around the ankles or knees.",
      "Sink into a quarter squat and step sideways.",
      "Keep tension in the band; alternate directions.",
    ],
  },
  {
    name: "Banded Bicep Curl",
    description:
      "Band curl that builds arm strength with constant tension.",
    category: ExerciseCategory.RESISTANCE_BAND,
    equipment: ["resistance band"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 40,
    reps: 12,
    sets: 3,
    restSeconds: 30,
    instructions: [
      "Stand on the band and hold the handles with palms facing up.",
      "Curl the hands to the shoulders, keeping the elbows pinned.",
      "Lower slowly back to the start.",
    ],
  },
  {
    name: "Banded Row",
    description:
      "Back-strengthening row using a band anchored under the feet.",
    category: ExerciseCategory.RESISTANCE_BAND,
    equipment: ["resistance band"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 40,
    reps: 12,
    sets: 3,
    restSeconds: 30,
    instructions: [
      "Anchor the band under both feet and hinge slightly forward.",
      "Pull the handles to the ribs, squeezing the shoulder blades.",
      "Extend the arms fully between reps.",
    ],
  },
  {
    name: "Banded Glute Kickback",
    description:
      "Isolation move that fires the glutes under constant tension.",
    category: ExerciseCategory.RESISTANCE_BAND,
    equipment: ["resistance band"],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 30,
    reps: 12,
    sets: 3,
    restSeconds: 20,
    instructions: [
      "Attach the band to a low anchor and loop it around one ankle.",
      "Hinge forward slightly and kick the leg straight back.",
      "Squeeze the glute at the top; control the return.",
    ],
  },
  {
    name: "Banded Pull-Apart",
    description:
      "Shoulder and upper-back strengthener using a band.",
    category: ExerciseCategory.RESISTANCE_BAND,
    equipment: ["resistance band"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 30,
    reps: 12,
    sets: 3,
    restSeconds: 20,
    instructions: [
      "Hold the band at shoulder height with the arms extended.",
      "Pull the band apart, squeezing the shoulder blades together.",
      "Return slowly without letting the band sag.",
    ],
  },

  // ===============================================================
  // ANIMAL FLOW (5)
  // ===============================================================
  {
    name: "Beast Hold",
    description:
      "Quadruped position that builds wrist, shoulder and core strength.",
    category: ExerciseCategory.ANIMAL_FLOW,
    equipment: ["yoga mat (optional)"],
    difficulty: DifficultyLevel.BEGINNER,
    durationSeconds: 40,
    sets: 3,
    restSeconds: 20,
    instructions: [
      "Start on the hands and knees, then lift the knees an inch off the floor.",
      "Keep the back flat and the shoulders over the wrists.",
      "Hold while breathing steadily.",
    ],
  },
  {
    name: "Crab Reach",
    description:
      "Open-hipped flow that builds shoulder and hip mobility.",
    category: ExerciseCategory.ANIMAL_FLOW,
    equipment: ["yoga mat (optional)"],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 40,
    reps: 5,
    restSeconds: 20,
    instructions: [
      "From a crab position, reach one hand overhead toward the floor behind you.",
      "Rotate the hips open and follow the hand with your gaze.",
      "Return to the crab and repeat on the other side.",
    ],
  },
  {
    name: "Ape Gait",
    description:
      "Low, squatting locomotion that builds leg strength and coordination.",
    category: ExerciseCategory.ANIMAL_FLOW,
    equipment: ["yoga mat (optional)"],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 40,
    reps: 8,
    restSeconds: 30,
    instructions: [
      "Squat low with the hands planted just inside the feet.",
      "Walk forward on the hands while the feet hop to follow.",
      "Keep the hips low and the movement continuous.",
    ],
  },
  {
    name: "Frog Jump (Frog Leap)",
    description:
      "Explosive quadruped jump that develops power and control.",
    category: ExerciseCategory.ANIMAL_FLOW,
    equipment: ["yoga mat (optional)"],
    difficulty: DifficultyLevel.ADVANCED,
    durationSeconds: 30,
    reps: 5,
    restSeconds: 40,
    instructions: [
      "From a crouched frog stance, plant the hands in front.",
      "Drive through the feet and leap the legs toward the hands.",
      "Land softly and immediately reset.",
    ],
  },
  {
    name: "Lateral Roll",
    description:
      "Rolling transition that teaches controlled spinal movement.",
    category: ExerciseCategory.ANIMAL_FLOW,
    equipment: ["yoga mat"],
    difficulty: DifficultyLevel.INTERMEDIATE,
    durationSeconds: 30,
    reps: 4,
    restSeconds: 20,
    instructions: [
      "Lie on one side in a tucked position with the hands together.",
      "Roll across the back to the other side, following the hands.",
      "Keep the body tight and roll in a straight line.",
    ],
  },
];

function summarize(counts: Record<ExerciseCategory, number>): string {
  return Object.entries(counts)
    .map(([category, count]) => `${category}: ${count}`)
    .join(", ");
}

async function main() {
  console.log("Seeding Apex Home Fitness...");

  // 1) Exercises — 5 per category, upserted by name (idempotent)
  const counts = Object.fromEntries(
    Object.values(ExerciseCategory).map((category) => [category, 0]),
  ) as Record<ExerciseCategory, number>;

  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: exercise,
      create: exercise,
    });
    counts[exercise.category] += 1;
  }

  console.log(`Exercises seeded (${exercises.length} total):`);
  console.log("  " + summarize(counts));

  // 2) Demo user
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@apexhomefitness.com" },
    update: {},
    create: {
      email: "demo@apexhomefitness.com",
      name: "Demo Athlete",
      passwordHash: "demo-hash-not-for-production",
      fitnessGoal: "Build strength and mobility at home",
      fitnessLevel: DifficultyLevel.BEGINNER,
    },
  });
  console.log(`Demo user ready: ${demoUser.email}`);

  // 3) Sample program — one exercise per category
  const sampleExercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
    take: 8,
  });
  const program = await prisma.program.upsert({
    where: { name: "Apex Starter Program" },
    update: {},
    create: {
      name: "Apex Starter Program",
      description:
        "A 4-week, full-body introduction that touches all eight Apex Home Fitness categories.",
      level: DifficultyLevel.BEGINNER,
      durationWeeks: 4,
      sessionsPerWeek: 3,
      ownerId: demoUser.id,
    },
  });
  await prisma.programExercise.deleteMany({ where: { programId: program.id } });
  await prisma.programExercise.createMany({
    data: sampleExercises.map((exercise, index) => ({
      programId: program.id,
      exerciseId: exercise.id,
      order: index + 1,
      sets: 2,
      reps: 10,
      restSeconds: 45,
    })),
  });
  console.log(
    `Program ready: ${program.name} (${sampleExercises.length} exercises linked)`,
  );

  // 4) Quiz response for the demo user (recreated so re-seeding stays clean)
  await prisma.quizResponse.deleteMany({ where: { userId: demoUser.id } });
  await prisma.quizResponse.create({
    data: {
      userId: demoUser.id,
      answers: {
        goal: "fatLoss",
        experience: "beginner",
        timePerSessionMin: 30,
        availableEquipment: ["yoga mat", "resistance band"],
        preferredCategories: ["HIIT", "PILATES", "MOBILITY"],
      },
      recommendedProgramId: program.id,
      score: 0.85,
    },
  });
  console.log("Quiz response created for the demo user.");

  // 5) One completed workout session
  await prisma.workoutSession.deleteMany({ where: { userId: demoUser.id } });
  const sessionExercises = await prisma.exercise.findMany({
    where: { category: ExerciseCategory.HIIT },
    orderBy: { name: "asc" },
    take: 3,
  });
  await prisma.workoutSession.create({
    data: {
      userId: demoUser.id,
      programId: program.id,
      startedAt: new Date(),
      completedAt: new Date(),
      durationSeconds: 25 * 60,
      caloriesBurned: 210,
      notes: "Seeded sample session",
      exercises: {
        create: sessionExercises.map((exercise, index) => ({
          exerciseId: exercise.id,
          order: index + 1,
          completed: true,
          actualSets: 3,
          actualReps: 12,
        })),
      },
    },
  });
  console.log("Workout session created for the demo user.");

  console.log(`\nSeed complete. Total exercises: ${exercises.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
