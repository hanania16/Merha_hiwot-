-- AlterTable: Add ethiopianYear and ethiopianMonth to Income
ALTER TABLE "income" ADD COLUMN "ethiopianYear" INTEGER;
ALTER TABLE "income" ADD COLUMN "ethiopianMonth" "EthiopianMonth";

-- AlterTable: Add ethiopianYear and ethiopianMonth to Expense
ALTER TABLE "expenses" ADD COLUMN "ethiopianYear" INTEGER;
ALTER TABLE "expenses" ADD COLUMN "ethiopianMonth" "EthiopianMonth";

-- CreateIndex: Fast period-based queries
CREATE INDEX "income_ethiopianYear_ethiopianMonth_idx" ON "income"("ethiopianYear", "ethiopianMonth");
CREATE INDEX "expenses_ethiopianYear_ethiopianMonth_idx" ON "expenses"("ethiopianYear", "ethiopianMonth");
