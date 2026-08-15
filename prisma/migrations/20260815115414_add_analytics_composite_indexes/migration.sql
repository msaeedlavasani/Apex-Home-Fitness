-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "heightCm" INTEGER,
    "weightKg" REAL,
    "fitnessGoal" TEXT,
    "fitnessLevel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "equipment" JSONB NOT NULL,
    "difficulty" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "reps" INTEGER,
    "sets" INTEGER,
    "restSeconds" INTEGER,
    "instructions" JSONB NOT NULL,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "sessionsPerWeek" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT,
    CONSTRAINT "Program_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgramExercise" (
    "programId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "restSeconds" INTEGER,

    PRIMARY KEY ("programId", "exerciseId"),
    CONSTRAINT "ProgramExercise_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgramExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "programId" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "durationSeconds" INTEGER,
    "caloriesBurned" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutSessionExercise" (
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "actualSets" INTEGER,
    "actualReps" INTEGER,
    "durationSeconds" INTEGER,

    PRIMARY KEY ("sessionId", "exerciseId"),
    CONSTRAINT "WorkoutSessionExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutSessionExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "recommendedProgramId" TEXT,
    "score" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizResponse_recommendedProgramId_fkey" FOREIGN KEY ("recommendedProgramId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_key" ON "Exercise"("name");

-- CreateIndex
CREATE INDEX "Exercise_category_idx" ON "Exercise"("category");

-- CreateIndex
CREATE INDEX "Exercise_difficulty_idx" ON "Exercise"("difficulty");

-- CreateIndex
CREATE INDEX "Exercise_category_difficulty_idx" ON "Exercise"("category", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "Program_name_key" ON "Program"("name");

-- CreateIndex
CREATE INDEX "Program_ownerId_idx" ON "Program"("ownerId");

-- CreateIndex
CREATE INDEX "ProgramExercise_exerciseId_idx" ON "ProgramExercise"("exerciseId");

-- CreateIndex
CREATE INDEX "ProgramExercise_programId_order_idx" ON "ProgramExercise"("programId", "order");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_startedAt_idx" ON "WorkoutSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_completedAt_idx" ON "WorkoutSession"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "WorkoutSession_programId_idx" ON "WorkoutSession"("programId");

-- CreateIndex
CREATE INDEX "WorkoutSessionExercise_exerciseId_idx" ON "WorkoutSessionExercise"("exerciseId");

-- CreateIndex
CREATE INDEX "WorkoutSessionExercise_sessionId_completed_idx" ON "WorkoutSessionExercise"("sessionId", "completed");

-- CreateIndex
CREATE INDEX "QuizResponse_userId_createdAt_idx" ON "QuizResponse"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "QuizResponse_recommendedProgramId_idx" ON "QuizResponse"("recommendedProgramId");
