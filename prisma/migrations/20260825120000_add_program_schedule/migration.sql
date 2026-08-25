-- Persist the selected rest days and enforced AI weekly schedule.
ALTER TABLE "Program" ADD COLUMN "restDays" TEXT;
ALTER TABLE "Program" ADD COLUMN "weeklySchedule" TEXT;
