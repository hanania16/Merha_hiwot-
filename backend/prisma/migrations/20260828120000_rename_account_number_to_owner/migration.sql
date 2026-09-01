-- AlterTable
ALTER TABLE "monthly_payments" RENAME COLUMN "accountNumber" TO "accountOwner";
ALTER TABLE "monthly_payments" ADD COLUMN     "phoneNumber" TEXT;
