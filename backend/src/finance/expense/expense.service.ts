import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalDecision, ExpenseCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { FinanceAuditService } from '../../services/financeAuditService';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ApproveTransactionDto } from './dto/approve-transaction.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

@Injectable()
export class ExpenseService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private financeAudit: FinanceAuditService,
    private ledger: LedgerService,
  ) {}

  findAll(query: QueryExpenseDto) {
    return this.prisma.expense.findMany({
      where: {
        category: query.category,
        status: query.status,
        date: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      include: {
        recordedBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
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

  async approve(id: string, dto: ApproveTransactionDto, userId: string) {
    return this.financeAudit.approveTransaction({
      entityType: 'Expense',
      id,
      approverId: userId,
      decision: dto.decision as ApprovalDecision,
      comments: dto.comments,
    });
  }

  /**
   * Append-only correction path. Expense is never edited or deleted: reversing
   * an expense books an offsetting Income (category REVERSAL) linked back to
   * the original row, going through the same locked ledger so the running
   * balance and current balance stay correct. A row can be reversed at most
   * once, and a reversal row itself can never be reversed.
   */
  async reverse(id: string, userId: string) {
    const reversal = await this.prisma.$transaction(async (tx) => {
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

      return tx.income.create({
        data: {
          date: new Date(),
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
        },
      });
    });

    await this.audit.log({
      userId,
      changedBy: userId,
      action: 'EXPENSE_REVERSED',
      entityType: 'Income',
      entityId: reversal.id,
      newValue: reversal,
    });

    return reversal;
  }
}
