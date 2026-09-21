PRAGMA foreign_keys=OFF;

CREATE TABLE "new_WorkoutSessionExercise" (
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "actualSets" INTEGER,
    "actualReps" INTEGER,
    "durationSeconds" INTEGER,
    CONSTRAINT "WorkoutSessionExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutSessionExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    PRIMARY KEY ("sessionId", "order")
);

INSERT INTO "new_WorkoutSessionExercise" ("sessionId", "exerciseId", "order", "completed", "actualSets", "actualReps", "durationSeconds")
SELECT "sessionId", "exerciseId", "order", "completed", "actualSets", "actualReps", "durationSeconds"
FROM "WorkoutSessionExercise";

DROP TABLE "WorkoutSessionExercise";
ALTER TABLE "new_WorkoutSessionExercise" RENAME TO "WorkoutSessionExercise";

CREATE INDEX "WorkoutSessionExercise_exerciseId_idx" ON "WorkoutSessionExercise"("exerciseId");
CREATE INDEX "WorkoutSessionExercise_sessionId_exerciseId_idx" ON "WorkoutSessionExercise"("sessionId", "exerciseId");
CREATE INDEX "WorkoutSessionExercise_sessionId_completed_idx" ON "WorkoutSessionExercise"("sessionId", "completed");

PRAGMA foreign_keys=ON;
