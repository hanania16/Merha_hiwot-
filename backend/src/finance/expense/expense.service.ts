import { Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalDecision } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { FinanceAuditService } from '../../services/financeAuditService';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ApproveTransactionDto } from './dto/approve-transaction.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

@Injectable()
export class ExpenseService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private financeAudit: FinanceAuditService,
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
    const expense = await this.prisma.expense.create({
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
        recordedById: userId,
      },
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

  async update(id: string, dto: UpdateExpenseDto, userId: string) {
    const { reason, ...changes } = dto;
    return this.financeAudit.auditedUpdate({
      entityType: 'Expense',
      id,
      changes,
      changedBy: userId,
      reason,
    });
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

  async remove(id: string, userId: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense record not found');
    await this.prisma.expense.delete({ where: { id } });
    await this.audit.log({
      userId,
      changedBy: userId,
      action: 'EXPENSE_DELETED',
      entityType: 'Expense',
      entityId: id,
      oldValue: existing,
    });
    return { success: true };
  }
}
