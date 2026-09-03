-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFa" TEXT,
    "aliases" JSONB,
    "taxonomy" JSONB,
    "description" JSONB,
    "instructions" JSONB,
    "coachingCues" JSONB,
    "provenance" JSONB NOT NULL,
    "versioning" JSONB NOT NULL,
    "exerciseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Movement_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovementRelationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceSlug" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetSlug" TEXT NOT NULL,
    "note" TEXT
);

-- CreateTable
CREATE TABLE "MovementMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movementSlug" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "contentHash" TEXT,
    "fallbackUrl" TEXT,
    "captionKey" TEXT,
    "validated" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "Movement_slug_key" ON "Movement"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Movement_nameEn_key" ON "Movement"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "Movement_exerciseId_key" ON "Movement"("exerciseId");

-- CreateIndex
CREATE INDEX "Movement_nameEn_idx" ON "Movement"("nameEn");

-- CreateIndex
CREATE INDEX "MovementRelationship_sourceSlug_idx" ON "MovementRelationship"("sourceSlug");

-- CreateIndex
CREATE INDEX "MovementRelationship_targetSlug_idx" ON "MovementRelationship"("targetSlug");

-- CreateIndex
CREATE INDEX "MovementMedia_movementSlug_idx" ON "MovementMedia"("movementSlug");

