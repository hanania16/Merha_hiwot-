-- AlterEnum
ALTER TYPE "StudentStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

-- CreateEnum
CREATE TYPE "BehaviorStatus" AS ENUM ('EXCELLENT', 'GOOD', 'WARNING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BehaviorRecordType" AS ENUM ('COMMENDATION', 'WARNING', 'INFRACTION', 'SUSPENSION', 'GENERAL_NOTE');

-- AlterTable
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "behaviorStatus" "BehaviorStatus" NOT NULL DEFAULT 'GOOD';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "suspensionDate" TIMESTAMP(3);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "suspensionEndDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "student_behavior_records" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "BehaviorRecordType" NOT NULL DEFAULT 'GENERAL_NOTE',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actionTaken" TEXT,
    "incidentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedById" TEXT,
    "ethiopianYear" INTEGER NOT NULL DEFAULT 2018,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_behavior_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "student_behavior_records_studentId_idx" ON "student_behavior_records"("studentId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'student_behavior_records_studentId_fkey'
    ) THEN
        ALTER TABLE "student_behavior_records" ADD CONSTRAINT "student_behavior_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'student_behavior_records_reportedById_fkey'
    ) THEN
        ALTER TABLE "student_behavior_records" ADD CONSTRAINT "student_behavior_records_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
