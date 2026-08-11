import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

type LedgerLine = {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  date: Date;
  createdAt: Date;
  category: string;
  description: string | null;
  referenceNumber: string | null;
  paymentMethod: string;
  recordedBy: string | null;
  amount: number;
  runningBalance: number | null;
  isReversal: boolean;
  reversed: boolean;
};

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll() {
    const accounts = await this.prisma.account.findMany({ orderBy: { name: 'asc' } });
    return accounts.map((a) => ({ ...a, balance: Number(a.currentBalance) }));
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');
    return { ...account, balance: Number(account.currentBalance) };
  }

  /**
   * Per-account statement: every balance-tracking ledger row (income/expense
   * with a stamped runningBalance, including the OPENING_BALANCE entry and any
   * REVERSAL entries) in chronological order. The stored runningBalance is
   * returned as-is — never recalculated — so reading the statement top to
   * bottom reproduces the account's currentBalance exactly. Rows that don't
   * move a bank balance (e.g. system-derived student-fee revenue) are excluded.
   */
  async getStatement(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');

    const [incomes, expenses] = await Promise.all([
      this.prisma.income.findMany({
        where: { accountId: id, runningBalance: { not: null } },
        select: {
          id: true,
          date: true,
          amount: true,
          category: true,
          description: true,
          referenceNumber: true,
          paymentMethod: true,
          createdAt: true,
          runningBalance: true,
          reversesExpenseId: true,
          recordedBy: { select: { fullName: true } },
        },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.expense.findMany({
        where: { accountId: id, runningBalance: { not: null } },
        select: {
          id: true,
          date: true,
          amount: true,
          category: true,
          description: true,
          referenceNumber: true,
          paymentMethod: true,
          createdAt: true,
          runningBalance: true,
          reversesIncomeId: true,
          recordedBy: { select: { fullName: true } },
        },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    // Which rows already have a reversal (so the UI can grey out "Reverse").
    const [reversedIncomes, reversedExpenses] = await Promise.all([
      this.prisma.expense.findMany({
        where: { accountId: id, runningBalance: { not: null }, reversesIncomeId: { not: null } },
        select: { reversesIncomeId: true },
      }),
      this.prisma.income.findMany({
        where: { accountId: id, runningBalance: { not: null }, reversesExpenseId: { not: null } },
        select: { reversesExpenseId: true },
      }),
    ]);
    const reversedIncomeIds = new Set(reversedIncomes.map((r) => r.reversesIncomeId));
    const reversedExpenseIds = new Set(reversedExpenses.map((r) => r.reversesExpenseId));

    const lines: LedgerLine[] = [
      ...incomes.map((i) => ({
        id: i.id,
        type: 'INCOME' as const,
        date: i.date,
        createdAt: i.createdAt,
        category: i.category,
        description: i.description,
        referenceNumber: i.referenceNumber,
        paymentMethod: i.paymentMethod,
        recordedBy: i.recordedBy?.fullName ?? null,
        amount: Number(i.amount),
        runningBalance: i.runningBalance === null ? null : Number(i.runningBalance),
        isReversal: i.reversesExpenseId !== null,
        reversed: reversedIncomeIds.has(i.id),
      })),
      ...expenses.map((e) => ({
        id: e.id,
        type: 'EXPENSE' as const,
        date: e.date,
        createdAt: e.createdAt,
        category: e.category,
        description: e.description,
        referenceNumber: e.referenceNumber,
        paymentMethod: e.paymentMethod,
        recordedBy: e.recordedBy?.fullName ?? null,
        amount: Number(e.amount),
        runningBalance: e.runningBalance === null ? null : Number(e.runningBalance),
        isReversal: e.reversesIncomeId !== null,
        reversed: reversedExpenseIds.has(e.id),
      })),
    ].sort(
      (a, b) => a.date.getTime() - b.date.getTime() || a.createdAt.getTime() - b.createdAt.getTime(),
    );

    return {
      account,
      balance: Number(account.currentBalance),
      statement: lines,
    };
  }

  /**
   * Creates the account and, if an opening balance is given, records it as the
   * first ledger entry (an OPENING_BALANCE Income row with runningBalance =
   * opening amount) — atomically with setting currentBalance, so the audit
   * trail can explain the balance from entry #1 onward.
   */
  async create(dto: CreateAccountDto, userId: string) {
    const account = await this.prisma.$transaction(async (tx) => {
      const created = await tx.account.create({
        data: {
          name: dto.name,
          type: dto.type,
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          currentBalance: dto.initialBalance ?? 0,
        },
      });

      if (dto.initialBalance && dto.initialBalance > 0) {
        await tx.income.create({
          data: {
            date: new Date(),
            amount: dto.initialBalance,
            category: 'OPENING_BALANCE',
            sourceType: 'OTHER',
            paymentMethod: 'CASH',
            description: `Opening balance — ${created.name}`,
            accountId: created.id,
            runningBalance: Math.round(dto.initialBalance * 100) / 100,
            recordedById: userId,
          },
        });
      }

      return created;
    });

    await this.audit.log({
      userId,
      changedBy: userId,
      action: 'ACCOUNT_CREATED',
      entityType: 'Account',
      entityId: account.id,
      newValue: account,
    });

    return { ...account, balance: Number(account.currentBalance) };
  }

  async update(id: string, dto: UpdateAccountDto, userId: string) {
    const existing = await this.prisma.account.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Account not found');

    // currentBalance is never writable here — it only moves via LedgerService.
    const { currentBalance, ...safe } = dto as UpdateAccountDto & { currentBalance?: number };
    if (currentBalance !== undefined) {
      delete (safe as Record<string, unknown>).currentBalance;
    }

    const updated = await this.prisma.account.update({ where: { id }, data: safe });
    await this.audit.log({
      userId,
      changedBy: userId,
      action: 'ACCOUNT_UPDATED',
      entityType: 'Account',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });
    return { ...updated, balance: Number(updated.currentBalance) };
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
