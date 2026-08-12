-- AlterTable: stamp set only by the monthly class-income batch job
-- (recordMonthlyClassIncome). Null = this PAID MonthlyPayment has not yet been
-- rolled into an aggregated STUDENT_FEES Income row. Never written by
-- recordPayment/recordClassPayments.
ALTER TABLE "monthly_payments" ADD COLUMN "includedInIncomeAt" TIMESTAMP(3);