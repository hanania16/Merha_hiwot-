-- CreateEnum
CREATE TYPE "FinanceReportType" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "finance_reports" (
    "id" TEXT NOT NULL,
    "type" "FinanceReportType" NOT NULL,
    "ethiopianYear" INTEGER NOT NULL,
    "month" "EthiopianMonth",
    "summary" JSONB NOT NULL,
    "data" JSONB NOT NULL,
    "generatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finance_reports_type_ethiopianYear_idx" ON "finance_reports"("type", "ethiopianYear");

-- CreateIndex
CREATE UNIQUE INDEX "finance_reports_type_ethiopianYear_month_key" ON "finance_reports"("type", "ethiopianYear", "month");

-- AddForeignKey
ALTER TABLE "finance_reports" ADD CONSTRAINT "finance_reports_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
