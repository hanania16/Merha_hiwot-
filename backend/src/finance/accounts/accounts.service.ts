import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /** Current expected balance per account: approved income minus approved expenses. */
  private async balanceFor(accountId: string): Promise<number> {
    const [income, expense] = await Promise.all([
      this.prisma.income.aggregate({
        _sum: { amount: true },
        where: { accountId, status: TransactionStatus.APPROVED },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: { accountId, status: TransactionStatus.APPROVED },
      }),
    ]);
    return Number(income._sum.amount ?? 0) - Number(expense._sum.amount ?? 0);
  }

  async findAll() {
    const accounts = await this.prisma.account.findMany({ orderBy: { name: 'asc' } });
    return Promise.all(
      accounts.map(async (a) => ({ ...a, balance: await this.balanceFor(a.id) })),
    );
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');
    return { ...account, balance: await this.balanceFor(id) };
  }

  /**
   * Per-account statement: every approved income/expense for the account in
   * chronological order with the running balance after each entry, so the
   * balance can be audited against the actual bank activity.
   */
  async getStatement(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');

    const [incomes, expenses] = await Promise.all([
      this.prisma.income.findMany({
        where: { accountId: id, status: TransactionStatus.APPROVED },
        select: {
          id: true,
          date: true,
          amount: true,
          category: true,
          description: true,
          referenceNumber: true,
          paymentMethod: true,
          createdAt: true,
          recordedBy: { select: { fullName: true } },
        },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.expense.findMany({
        where: { accountId: id, status: TransactionStatus.APPROVED },
        select: {
          id: true,
          date: true,
          amount: true,
          category: true,
          description: true,
          referenceNumber: true,
          paymentMethod: true,
          createdAt: true,
          recordedBy: { select: { fullName: true } },
        },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const lines = [
      ...incomes.map((i) => ({ ...i, type: 'INCOME' as const })),
      ...expenses.map((e) => ({ ...e, type: 'EXPENSE' as const })),
    ].sort(
      (a, b) => a.date.getTime() - b.date.getTime() || a.createdAt.getTime() - b.createdAt.getTime(),
    );

    let running = 0;
    const statement = lines.map((l) => {
      const amount = Number(l.amount);
      running += l.type === 'INCOME' ? amount : -amount;
      return {
        id: l.id,
        type: l.type,
        date: l.date,
        category: l.category,
        description: l.description,
        referenceNumber: l.referenceNumber,
        paymentMethod: l.paymentMethod,
        recordedBy: l.recordedBy?.fullName ?? null,
        amount,
        runningBalance: running,
      };
    });

    return { account, balance: running, statement };
  }

  async create(dto: CreateAccountDto, userId: string) {
    const account = await this.prisma.account.create({ data: dto });
    await this.audit.log({
      userId,
      changedBy: userId,
      action: 'ACCOUNT_CREATED',
      entityType: 'Account',
      entityId: account.id,
      newValue: account,
    });
    return account;
  }

  async update(id: string, dto: UpdateAccountDto, userId: string) {
    const existing = await this.prisma.account.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Account not found');

    const updated = await this.prisma.account.update({ where: { id }, data: dto });
    await this.audit.log({
      userId,
      changedBy: userId,
      action: 'ACCOUNT_UPDATED',
      entityType: 'Account',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });
    return updated;
  }

  /**
   * Deletes the account when nothing references it; otherwise soft-deactivates
   * (isActive = false) so historical ledger rows keep their FK.
   */
  async remove(id: string, userId: string) {
    const existing = await this.prisma.account.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Account not found');

    const [incomeCount, expenseCount, reconciliationCount] = await Promise.all([
      this.prisma.income.count({ where: { accountId: id } }),
      this.prisma.expense.count({ where: { accountId: id } }),
      this.prisma.reconciliation.count({ where: { accountId: id } }),
    ]);

    if (incomeCount === 0 && expenseCount === 0 && reconciliationCount === 0) {
      await this.prisma.account.delete({ where: { id } });
    } else {
      await this.prisma.account.update({ where: { id }, data: { isActive: false } });
    }

    await this.audit.log({
      userId,
      changedBy: userId,
      action: 'ACCOUNT_DELETED',
      entityType: 'Account',
      entityId: id,
      oldValue: existing,
    });
    return { success: true };
  }
}
