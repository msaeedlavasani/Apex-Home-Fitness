-- AlterTable
ALTER TABLE "QuizResponse" ADD COLUMN "clientRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "QuizResponse_clientRequestId_key" ON "QuizResponse"("clientRequestId");
