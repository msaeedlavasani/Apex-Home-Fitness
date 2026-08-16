-- CreateTable
CREATE TABLE "PhoneOtp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'SIGNIN',
    "requestId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PhoneOtp_requestId_key" ON "PhoneOtp"("requestId");

-- CreateIndex
CREATE INDEX "PhoneOtp_phone_purpose_idx" ON "PhoneOtp"("phone", "purpose");

-- CreateIndex
CREATE INDEX "PhoneOtp_consumedAt_idx" ON "PhoneOtp"("consumedAt");

-- CreateIndex
CREATE INDEX "PhoneOtp_expiresAt_idx" ON "PhoneOtp"("expiresAt");
