-- Persist the enforced AI weekly schedule.
-- `restDays` was added by the earlier add_program_rest_days migration.
ALTER TABLE "Program" ADD COLUMN "weeklySchedule" TEXT;
