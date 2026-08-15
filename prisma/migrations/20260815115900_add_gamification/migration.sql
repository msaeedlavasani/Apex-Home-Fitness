-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "heightCm" INTEGER,
    "weightKg" REAL,
    "fitnessGoal" TEXT,
    "fitnessLevel" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "badges" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "fitnessGoal", "fitnessLevel", "heightCm", "id", "name", "passwordHash", "updatedAt", "weightKg") SELECT "createdAt", "email", "fitnessGoal", "fitnessLevel", "heightCm", "id", "name", "passwordHash", "updatedAt", "weightKg" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_WorkoutSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "programId" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "durationSeconds" INTEGER,
    "caloriesBurned" INTEGER,
    "notes" TEXT,
    "xpAwarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkoutSession" ("caloriesBurned", "completedAt", "createdAt", "durationSeconds", "id", "notes", "programId", "startedAt", "updatedAt", "userId") SELECT "caloriesBurned", "completedAt", "createdAt", "durationSeconds", "id", "notes", "programId", "startedAt", "updatedAt", "userId" FROM "WorkoutSession";
DROP TABLE "WorkoutSession";
ALTER TABLE "new_WorkoutSession" RENAME TO "WorkoutSession";
CREATE INDEX "WorkoutSession_userId_startedAt_idx" ON "WorkoutSession"("userId", "startedAt");
CREATE INDEX "WorkoutSession_userId_completedAt_idx" ON "WorkoutSession"("userId", "completedAt");
CREATE INDEX "WorkoutSession_programId_idx" ON "WorkoutSession"("programId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
