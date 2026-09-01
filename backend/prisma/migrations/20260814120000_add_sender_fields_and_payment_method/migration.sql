-- AlterTable
ALTER TABLE "income" ADD COLUMN     "senderName" TEXT,
ADD COLUMN     "senderAccountNumber" TEXT;

-- AlterTable
ALTER TABLE "monthly_payments" ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "accountNumber" TEXT;
