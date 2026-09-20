PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ProgramExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "restSeconds" INTEGER,
    CONSTRAINT "ProgramExercise_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgramExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_ProgramExercise" ("id", "programId", "exerciseId", "order", "sets", "reps", "restSeconds")
SELECT 'legacy:' || "programId" || ':' || "exerciseId", "programId", "exerciseId", "order", "sets", "reps", "restSeconds"
FROM "ProgramExercise";

DROP TABLE "ProgramExercise";
ALTER TABLE "new_ProgramExercise" RENAME TO "ProgramExercise";

CREATE UNIQUE INDEX "ProgramExercise_programId_order_key" ON "ProgramExercise"("programId", "order");
CREATE INDEX "ProgramExercise_exerciseId_idx" ON "ProgramExercise"("exerciseId");
CREATE INDEX "ProgramExercise_programId_order_idx" ON "ProgramExercise"("programId", "order");

PRAGMA foreign_keys=ON;
