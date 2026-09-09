import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface LedgerResult {
  balanceBefore: number;
  newBalance: number;
}

/**
 * Single, lock-guarded path for moving an Account's balance. Every balance
 * change must go through apply() — there is deliberately no user-facing
 * endpoint that writes Account.currentBalance directly.
 *
 * Callers must already be inside an interactive `prisma.$transaction`. The
 * account row is locked with `SELECT ... FOR UPDATE` so two concurrent writes
 * to the same account serialize instead of both reading the same starting
 * balance and losing one update.
 */
@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  async apply(
    tx: Prisma.TransactionClient,
    accountId: string,
    amount: number,
    direction: 'IN' | 'OUT',
  ): Promise<LedgerResult> {
    await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${accountId} FOR UPDATE`;

    const account = await tx.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account not found');

    const sign = direction === 'IN' ? 1 : -1;
    const current = Number(account.currentBalance);
    const newBalance = Math.round((current + sign * amount) * 100) / 100;

    await tx.account.update({
      where: { id: accountId },
      data: { currentBalance: newBalance },
    });

    return { balanceBefore: current, newBalance };
  }

  /**
   * After updating an existing Income or Expense row's amount, recompute the
   * runningBalance chain forward for all subsequent ledger entries on the same
   * account. Also updates Account.currentBalance to the final balance.
   *
   * Must be called inside an existing $transaction with the account row already
   * locked (via apply() or a manual FOR UPDATE).
   *
   * `updatedRowDate` is the date of the row that was modified — all entries
   * on the same account with date >= updatedRowDate (ordered by date, then id)
   * are recomputed.
   */
  async recomputeForward(
    tx: Prisma.TransactionClient,
    accountId: string,
    updatedRowDate: Date,
  ): Promise<void> {
    // Fetch all ledger entries for this account, ordered chronologically.
    const [incomes, expenses] = await Promise.all([
      tx.income.findMany({
        where: { accountId },
        select: { id: true, date: true, amount: true },
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
      }),
      tx.expense.findMany({
        where: { accountId },
        select: { id: true, date: true, amount: true },
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
      }),
    ]);

    // Merge into a single chronological ledger stream.
    const ledger: Array<{ id: string; date: Date; amount: number; type: 'INCOME' | 'EXPENSE' }> = [
      ...incomes.map((i) => ({ id: i.id, date: i.date, amount: Number(i.amount), type: 'INCOME' as const })),
      ...expenses.map((e) => ({ id: e.id, date: e.date, amount: Number(e.amount), type: 'EXPENSE' as const })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));

    // Find the starting balance: the runningBalance of the entry just before
    // the first entry that needs recomputing, or 0 if it's the first entry.
    const firstRecomputeIdx = ledger.findIndex(
      (e) => e.date.getTime() >= updatedRowDate.getTime(),
    );
    if (firstRecomputeIdx === -1) return; // nothing to recompute

    // The balance before the first recomputed entry is the runningBalance of
    // the previous entry, or the account's opening balance before any entries.
    let runningBalance: number;
    if (firstRecomputeIdx === 0) {
      // Recomputing from the very first entry — start from 0.
      runningBalance = 0;
    } else {
      // Use the runningBalance of the previous entry (which hasn't changed).
      // A NULL runningBalance mid-chain means the ledger is corrupt — fail
      // loudly rather than silently defaulting to 0, which would produce
      // wrong balances downstream.
      const prevEntry = ledger[firstRecomputeIdx - 1];
      let prevRunningBalance: number | null = null;
      if (prevEntry.type === 'INCOME') {
        const prev = await tx.income.findUnique({ where: { id: prevEntry.id }, select: { runningBalance: true } });
        prevRunningBalance = prev?.runningBalance != null ? Number(prev.runningBalance) : null;
      } else {
        const prev = await tx.expense.findUnique({ where: { id: prevEntry.id }, select: { runningBalance: true } });
        prevRunningBalance = prev?.runningBalance != null ? Number(prev.runningBalance) : null;
      }
      if (prevRunningBalance === null) {
        throw new Error(
          `Ledger corruption: entry ${prevEntry.id} (type=${prevEntry.type}) has NULL runningBalance mid-chain. ` +
          `All preceding entries must have non-NULL runningBalance before recomputeForward can proceed.`,
        );
      }
      runningBalance = prevRunningBalance;
    }

    // Recompute forward from the first affected entry.
    for (let i = firstRecomputeIdx; i < ledger.length; i++) {
      const entry = ledger[i];
      const sign = entry.type === 'INCOME' ? 1 : -1;
      runningBalance = Math.round((runningBalance + sign * entry.amount) * 100) / 100;

      if (entry.type === 'INCOME') {
        await tx.income.update({ where: { id: entry.id }, data: { runningBalance } });
      } else {
        await tx.expense.update({ where: { id: entry.id }, data: { runningBalance } });
      }
    }

    // Update Account.currentBalance to the final running balance.
    await tx.account.update({ where: { id: accountId }, data: { currentBalance: runningBalance } });
  }
}
