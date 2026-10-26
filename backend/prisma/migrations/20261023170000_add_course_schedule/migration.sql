-- AlterTable
ALTER TABLE "courses" ADD COLUMN "targetGrade" TEXT;
ALTER TABLE "courses" ADD COLUMN "scheduleTime" TEXT;
ALTER TABLE "courses" ADD COLUMN "semester" "AcademicSemester" NOT NULL DEFAULT 'SEMESTER_1';
