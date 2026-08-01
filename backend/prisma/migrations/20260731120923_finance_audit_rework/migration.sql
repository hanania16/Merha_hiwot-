/*
  Warnings:

  - A unique constraint covering the columns `[receiptId]` on the table `income` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accountId` to the `expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `income` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `income` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceType` to the `income` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH', 'BANK');

-- CreateEnum
CREATE TYPE "IncomeSourceType" AS ENUM ('STUDENT_FEE', 'DONATION', 'CHURCH_CONTRIBUTION', 'FUNDRAISING', 'SPECIAL_OFFERING', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('MATCHED', 'DISCREPANCY_FOUND', 'UNDER_INVESTIGATION', 'RESOLVED');

-- DropIndex
DROP INDEX "expenses_category_idx";

-- DropIndex
DROP INDEX "expenses_date_idx";

-- DropIndex
DROP INDEX "income_category_idx";

-- DropIndex
DROP INDEX "income_date_idx";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "changedById" TEXT,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL,
ADD COLUMN     "receiptDocumentUrl" TEXT,
ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "income" ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "monthlyPaymentId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL,
ADD COLUMN     "receiptId" TEXT,
ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "sourceType" "IncomeSourceType" NOT NULL,
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
ADD COLUMN     "studentId" TEXT,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "monthly_payments" ALTER COLUMN "baseAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "penaltyAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "receipts" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_approvals" (
    "id" TEXT NOT NULL,
    "incomeId" TEXT,
    "expenseId" TEXT,
    "decision" "ApprovalDecision" NOT NULL,
    "approverId" TEXT NOT NULL,
    "comments" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliations" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "expectedBalance" DECIMAL(12,2) NOT NULL,
    "actualBalance" DECIMAL(12,2) NOT NULL,
    "discrepancy" DECIMAL(12,2) NOT NULL,
    "status" "ReconciliationStatus" NOT NULL,
    "performedById" TEXT NOT NULL,
    "resolutionNotes" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_type_idx" ON "accounts"("type");

-- CreateIndex
CREATE INDEX "transaction_approvals_incomeId_idx" ON "transaction_approvals"("incomeId");

-- CreateIndex
CREATE INDEX "transaction_approvals_expenseId_idx" ON "transaction_approvals"("expenseId");

-- CreateIndex
CREATE INDEX "reconciliations_accountId_idx" ON "reconciliations"("accountId");

-- CreateIndex
CREATE INDEX "reconciliations_periodStart_periodEnd_idx" ON "reconciliations"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "audit_logs_changedById_idx" ON "audit_logs"("changedById");

-- CreateIndex
CREATE INDEX "expenses_category_date_idx" ON "expenses"("category", "date");

-- CreateIndex
CREATE INDEX "expenses_accountId_idx" ON "expenses"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "income_receiptId_key" ON "income"("receiptId");

-- CreateIndex
CREATE INDEX "income_sourceType_date_idx" ON "income"("sourceType", "date");

-- CreateIndex
CREATE INDEX "income_accountId_idx" ON "income"("accountId");

-- CreateIndex
CREATE INDEX "income_category_date_idx" ON "income"("category", "date");

-- CreateIndex
CREATE INDEX "income_studentId_idx" ON "income"("studentId");

-- CreateIndex
CREATE INDEX "income_monthlyPaymentId_idx" ON "income"("monthlyPaymentId");

-- AddForeignKey
ALTER TABLE "transaction_approvals" ADD CONSTRAINT "transaction_approvals_incomeId_fkey" FOREIGN KEY ("incomeId") REFERENCES "income"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_approvals" ADD CONSTRAINT "transaction_approvals_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_approvals" ADD CONSTRAINT "transaction_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_monthlyPaymentId_fkey" FOREIGN KEY ("monthlyPaymentId") REFERENCES "monthly_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
