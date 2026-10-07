import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { ETHIOPIAN_MONTHS, toEthiopian } from '../../common/constants/ethiopian-calendar';

@Injectable()
export class ExpenseService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private ledger: LedgerService,
  ) {}

  findAll(query: QueryExpenseDto) {
    const periodFilter: any = {};
    if (query.ethiopianYear) {
      periodFilter.ethiopianYear = parseInt(query.ethiopianYear, 10);
      if (query.ethiopianMonth) periodFilter.ethiopianMonth = query.ethiopianMonth;
    } else if (query.from || query.to) {
      periodFilter.date = {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      };
    }

    return this.prisma.expense.findMany({
      where: {
        category: query.category,
        ...periodFilter,
      },
      include: {
        recordedBy: { select: { fullName: true } },
        account: { select: { name: true, type: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async create(dto: CreateExpenseDto, userId: string) {
    if (dto.category === ExpenseCategory.MISCELLANEOUS && !dto.description?.trim()) {
      throw new BadRequestException('Description is required when expense type is Others (MISCELLANEOUS)');
    }
    // Balance update (Account.currentBalance) + the ledger row (runningBalance)
    // commit atomically under a row lock — no path can update one without the
    // other. Corrections are append-only REVERSAL entries, never edits/deletes.
    const eth = toEthiopian(new Date(dto.date));
    const expense = await this.prisma.$transaction(async (tx) => {
      const { newBalance } = await this.ledger.apply(tx, dto.accountId, dto.amount, 'OUT');
      return tx.expense.create({
        data: {
          date: new Date(dto.date),
          amount: dto.amount,
          category: dto.category,
          paymentMethod: dto.paymentMethod,
          description: dto.description,
          referenceNumber: dto.referenceNumber,
          receiptDocumentUrl: dto.receiptDocumentUrl,
          notes: dto.notes,
          accountId: dto.accountId,
          runningBalance: newBalance,
          recordedById: userId,
          ethiopianYear: eth.year,
          ethiopianMonth: ETHIOPIAN_MONTHS.find((m) => m.order === eth.month)?.value as any,
        },
      });
    });

    await this.audit.log({
      userId,
      changedBy: userId,
      action: 'EXPENSE_RECORDED',
      entityType: 'Expense',
      entityId: expense.id,
      newValue: expense,
    });

    await this.notifications.notifyLargeExpenseIfNeeded(dto.amount, dto.category, expense.id);

    return expense;
  }

  /**
   * Append-only correction path. Expense is never edited or deleted: reversing
   * an expense books an offsetting Income (category REVERSAL) linked back to
   * the original row, going through the same locked ledger so the running
   * balance and current balance stay correct. A row can be reversed at most
   * once, and a reversal row itself can never be reversed.
   */
  async reverse(id: string, userId: string) {
    const { reversal, original } = await this.prisma.$transaction(async (tx) => {
      const original = await tx.expense.findUnique({ where: { id } });
      if (!original) throw new NotFoundException('Expense record not found');
      if (original.reversesIncomeId) {
        throw new BadRequestException('A reversal entry cannot itself be reversed');
      }
      const alreadyReversed = await tx.income.count({ where: { reversesExpenseId: id } });
      if (alreadyReversed > 0) {
        throw new BadRequestException('This expense has already been reversed');
      }

      const { newBalance } = await this.ledger.apply(tx, original.accountId, Number(original.amount), 'IN');

      const reversal = await tx.income.create({
        data: {
          date: original.date,
          amount: original.amount,
          category: 'REVERSAL',
          sourceType: 'OTHER',
          paymentMethod: original.paymentMethod,
          description: `Reversal of expense${original.description ? ` (${original.description})` : ''}`,
          notes: original.notes,
          accountId: original.accountId,
          recordedById: userId,
          runningBalance: newBalance,
          reversesExpenseId: original.id,
          ethiopianYear: original.ethiopianYear,
          ethiopianMonth: original.ethiopianMonth,
        },
      });

      return { reversal, original };
    });

    await this.audit.log({
      userId,
      changedBy: userId,
      action: 'EXPENSE_REVERSED',
      entityType: 'Income',
      entityId: reversal.id,
      newValue: reversal,
    });

    await this.notifications.create(
      'REVERSAL',
      'Expense reversed',
      `Expense of ${Number(original.amount).toLocaleString()} ETB (${original.category}) has been reversed.`,
      { incomeId: reversal.id, originalExpenseId: original.id },
    );

    return reversal;
  }
}
