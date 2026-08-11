-- AlterEnum
ALTER TYPE "IncomeCategory" ADD VALUE 'OPENING_BALANCE';
ALTER TYPE "IncomeCategory" ADD VALUE 'REVERSAL';

-- AlterEnum
ALTER TYPE "ExpenseCategory" ADD VALUE 'REVERSAL';

-- AlterTable: per-account current balance. Only ever written by LedgerService
-- as part of the transaction-recording logic, never by a user-facing endpoint.
ALTER TABLE "accounts" ADD COLUMN "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable: stamped running balance (null for system-derived rows that don't
-- move a bank balance) + reversal cross-reference (Income reversing an Expense).
ALTER TABLE "income"
  ADD COLUMN "runningBalance" DECIMAL(12,2),
  ADD COLUMN "reversesExpenseId" TEXT;

-- AlterTable: stamped running balance + reversal cross-reference (Expense
-- reversing an Income).
ALTER TABLE "expenses"
  ADD COLUMN "runningBalance" DECIMAL(12,2),
  ADD COLUMN "reversesIncomeId" TEXT;

-- CreateIndex
CREATE INDEX "income_reversesExpenseId_idx" ON "income"("reversesExpenseId");

-- CreateIndex
CREATE INDEX "expenses_reversesIncomeId_idx" ON "expenses"("reversesIncomeId");

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_reversesExpenseId_fkey" FOREIGN KEY ("reversesExpenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_reversesIncomeId_fkey" FOREIGN KEY ("reversesIncomeId") REFERENCES "income"("id") ON DELETE SET NULL ON UPDATE CASCADE;
