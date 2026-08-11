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
}
