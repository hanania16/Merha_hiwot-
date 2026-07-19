import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

@Injectable()
export class ExpenseService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  findAll(query: QueryExpenseDto) {
    return this.prisma.expense.findMany({
      where: {
        category: query.category,
        date: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      include: {
        recordedBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
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
        description: dto.description,
        approvedById: dto.approvedById,
        recordedById: userId,
      },
    });

    await this.audit.log({
      userId,
      action: 'EXPENSE_RECORDED',
      entityType: 'Expense',
      entityId: expense.id,
      newValue: expense,
    });

    await this.notifications.notifyLargeExpenseIfNeeded(dto.amount, dto.category, expense.id);

    return expense;
  }

  async update(id: string, dto: Partial<CreateExpenseDto>, userId: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense record not found');

    const updated = await this.prisma.expense.update({
      where: { id },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
    });

    await this.audit.log({
      userId,
      action: 'EXPENSE_UPDATED',
      entityType: 'Expense',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });
    return updated;
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense record not found');
    await this.prisma.expense.delete({ where: { id } });
    await this.audit.log({
      userId,
      action: 'EXPENSE_DELETED',
      entityType: 'Expense',
      entityId: id,
      oldValue: existing,
    });
    return { success: true };
  }
}
