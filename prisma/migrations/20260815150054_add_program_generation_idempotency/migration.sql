-- CreateTable
CREATE TABLE "ProgramGenerationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "programId" TEXT,
    "responsePayload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProgramGenerationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgramGenerationRequest_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProgramGenerationRequest_programId_idx" ON "ProgramGenerationRequest"("programId");

-- CreateIndex
CREATE INDEX "ProgramGenerationRequest_updatedAt_idx" ON "ProgramGenerationRequest"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramGenerationRequest_userId_idempotencyKey_key" ON "ProgramGenerationRequest"("userId", "idempotencyKey");
