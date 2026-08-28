-- Add canonical exercise identity fields introduced by S02.
ALTER TABLE "Exercise" ADD COLUMN "faName" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");
