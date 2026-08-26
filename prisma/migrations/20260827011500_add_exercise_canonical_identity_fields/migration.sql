-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN "faName" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "slug" TEXT;

-- RedefineTables (SQLite table rebuild to add the UNIQUE index on Exercise.slug;
-- preserves all Program columns/indexes/FKs — lossless, additive)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "sessionsPerWeek" INTEGER,
    "restDays" JSONB,
    "weeklySchedule" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT,
    CONSTRAINT "Program_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Program" ("createdAt", "description", "durationWeeks", "id", "level", "name", "ownerId", "restDays", "sessionsPerWeek", "updatedAt", "weeklySchedule") SELECT "createdAt", "description", "durationWeeks", "id", "level", "name", "ownerId", "restDays", "sessionsPerWeek", "updatedAt", "weeklySchedule" FROM "Program";
DROP TABLE "Program";
ALTER TABLE "new_Program" RENAME TO "Program";
CREATE UNIQUE INDEX "Program_name_key" ON "Program"("name");
CREATE INDEX "Program_ownerId_idx" ON "Program"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");
