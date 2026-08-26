-- CreateTable
CREATE TABLE "WeightEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weightKg" REAL NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeightEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WeightEntry_userId_recordedAt_idx" ON "WeightEntry"("userId", "recordedAt");

-- Backfill the current profile weight so existing users start with a history point.
INSERT INTO "WeightEntry" ("id", "userId", "weightKg", "recordedAt", "createdAt")
SELECT lower(hex(randomblob(16))), "id", "weightKg", "updatedAt", CURRENT_TIMESTAMP
FROM "User"
WHERE "weightKg" IS NOT NULL;
