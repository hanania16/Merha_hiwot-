/**
 * One-time finance rework backfill (idempotent).
 *
 * Post-`finance_audit_rework` migration the new Income/Expense columns are
 * NOT NULL, so historical rows can only exist if the migration ran while the
 * tables were empty (true for this project). This script still performs the
 * documented backfill safely for any environment where data exists:
 *
 *   1. Seeds the default cash/bank accounts (Main Cash, Main Bank).
 *   2. Assigns every Income/Expense row to the Main Cash account where the
 *      accountId is missing.
 *   3. Sets sourceType = STUDENT_FEE where a monthlyPaymentId link exists,
 *      otherwise OTHER.
 *   4. Marks all pre-existing rows APPROVED (historical entries bypass the
 *      new approval workflow).
 *   5. Defaults paymentMethod to CASH where unknown.
 *
 * Run with: npx ts-node scripts/backfillFinanceData.ts
 */
import { PrismaClient, AccountType, IncomeSourceType, PaymentMethod, TransactionStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ACCOUNTS: { name: string; type: AccountType; bankName?: string; accountNumber?: string }[] = [
  { name: 'Main Cash', type: AccountType.CASH },
  { name: 'Main Bank', type: AccountType.BANK, bankName: 'Bank of Abyssinia' },
];

async function seedAccounts(): Promise<Record<string, string>> {
  const accounts: Record<string, string> = {};
  for (const spec of DEFAULT_ACCOUNTS) {
    const existing = await prisma.account.findFirst({ where: { name: spec.name, type: spec.type } });
    const account =
      existing ??
      (await prisma.account.create({
        data: { name: spec.name, type: spec.type, bankName: spec.bankName, accountNumber: spec.accountNumber },
      }));
    accounts[spec.type] = account.id;
    console.log(`Account ready: ${spec.name} (${spec.type}) -> ${account.id}`);
  }
  return accounts;
}

async function main() {
  const accounts = await seedAccounts();
  const cashId = accounts[AccountType.CASH];

  const [incomeRows, expenseRows] = await Promise.all([
    prisma.income.findMany({ select: { id: true, accountId: true, monthlyPaymentId: true, paymentMethod: true, sourceType: true, status: true } }),
    prisma.expense.findMany({ select: { id: true, accountId: true, paymentMethod: true, status: true } }),
  ]);

  let incomeUpdated = 0;
  for (const row of incomeRows) {
    const data: Record<string, unknown> = {};
    if (!row.accountId) data.accountId = cashId;
    if (!row.sourceType) data.sourceType = row.monthlyPaymentId ? IncomeSourceType.STUDENT_FEE : IncomeSourceType.OTHER;
    if (!row.paymentMethod) data.paymentMethod = PaymentMethod.CASH;
    if (row.status === TransactionStatus.PENDING_APPROVAL) data.status = TransactionStatus.APPROVED;
    if (Object.keys(data).length > 0) {
      await prisma.income.update({ where: { id: row.id }, data });
      incomeUpdated++;
    }
  }

  let expenseUpdated = 0;
  for (const row of expenseRows) {
    const data: Record<string, unknown> = {};
    if (!row.accountId) data.accountId = cashId;
    if (!row.paymentMethod) data.paymentMethod = PaymentMethod.CASH;
    if (row.status === TransactionStatus.PENDING_APPROVAL) data.status = TransactionStatus.APPROVED;
    if (Object.keys(data).length > 0) {
      await prisma.expense.update({ where: { id: row.id }, data });
      expenseUpdated++;
    }
  }

  console.log(`Backfill complete. Income rows touched: ${incomeUpdated}/${incomeRows.length}, Expense rows touched: ${expenseUpdated}/${expenseRows.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
