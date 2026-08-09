import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalDecision, IncomeSourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { FinanceAuditService } from '../../services/financeAuditService';
import { baseFeeFor } from '../../common/constants/fee-rules';
import { ETHIOPIAN_MONTHS, monthLabel } from '../../common/constants/ethiopian-calendar';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { ApproveTransactionDto } from './dto/approve-transaction.dto';
import { QueryIncomeDto } from './dto/query-income.dto';

@Injectable()
export class IncomeService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private financeAudit: FinanceAuditService,
  ) {}

  findAll(query: QueryIncomeDto) {
    return this.prisma.income.findMany({
      where: {
        category: query.category,
        sourceType: query.sourceType,
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
        student: { select: { id: true, fullName: true, studentCode: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async create(dto: CreateIncomeDto, userId: string) {
    let studentId = dto.studentId ?? null;

    if (dto.sourceType === IncomeSourceType.STUDENT_FEE) {
      if (!dto.monthlyPaymentId) {
        throw new BadRequestException('monthlyPaymentId is required when sourceType is STUDENT_FEE');
      }
      const payment = await this.prisma.monthlyPayment.findUnique({ where: { id: dto.monthlyPaymentId } });
      if (!payment) throw new NotFoundException('Monthly payment record not found');
      studentId = payment.studentId;
    } else if (dto.monthlyPaymentId) {
      throw new BadRequestException('monthlyPaymentId can only be set when sourceType is STUDENT_FEE');
    }

    if (dto.receiptId) {
      const receipt = await this.prisma.receipt.findUnique({ where: { id: dto.receiptId } });
      if (!receipt) throw new NotFoundException('Receipt record not found');
    }

    const income = await this.prisma.income.create({
      data: {
        date: new Date(dto.date),
        amount: dto.amount,
        category: dto.category,
        sourceType: dto.sourceType,
        paymentMethod: dto.paymentMethod,
        description: dto.description,
        referenceNumber: dto.referenceNumber,
        notes: dto.notes,
        accountId: dto.accountId,
        receiptId: dto.receiptId ?? null,
        monthlyPaymentId: dto.monthlyPaymentId ?? null,
        studentId,
        recordedById: userId,
      },
    });

    await this.audit.log({
      userId,
      changedBy: userId,
      action: 'INCOME_RECORDED',
      entityType: 'Income',
      entityId: income.id,
      newValue: income,
    });

    return income;
  }

  /**
   * Automatic monthly student-fee income. On the 26th of every Ethiopian month
   * the scheduler calls this for the current month. It creates ONE income record
   * per class level (amount = sum of each active student's monthly fee — 20/30/50
   * for regular students, 2% of salary for working members). It does NOT touch
   * per-student paid status. Idempotent: a marker in referenceNumber prevents a
   * month from ever being recorded twice.
   */
  async autoRecordMonthlyFees(year: number, monthOrder: number, userId?: string) {
    const monthEnum = ETHIOPIAN_MONTHS.find((m) => m.order === monthOrder)?.value;
    if (!monthEnum) throw new BadRequestException('Invalid Ethiopian month');

    const marker = `AUTO:STUDENT_FEES:${year}:${monthOrder}`;
    const existing = await this.prisma.income.findFirst({
      where: { sourceType: IncomeSourceType.STUDENT_FEE, referenceNumber: marker },
    });
    if (existing) {
      return { alreadyRecorded: true, results: [] };
    }

    const account = await this.prisma.account.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!account) {
      throw new BadRequestException('No active account available for automatic fee recording');
    }

    let recordedById = userId;
    if (!recordedById) {
      const systemUser = await this.prisma.user.findFirst();
      recordedById = systemUser?.id;
    }
    if (!recordedById) {
      throw new BadRequestException('No user available to attribute the automatic fee records');
    }

    const students = await this.prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: { class: true },
    });

    const byLevel = new Map<string, { total: number; count: number }>();
    for (const s of students) {
      const amount = baseFeeFor({
        classLevel: s.class.level,
        isWorkingMember: s.isWorkingMember,
        monthlySalary: s.monthlySalary ? Number(s.monthlySalary) : null,
      });
      const g = byLevel.get(s.class.level) ?? { total: 0, count: 0 };
      g.total += amount;
      g.count += 1;
      byLevel.set(s.class.level, g);
    }

    const monthName = monthLabel(monthEnum);
    const results = [];

    for (const [level, g] of byLevel) {
      const total = Math.round(g.total * 100) / 100;
      const levelLabel = level.replace('CLASS_', '').replace('_', '-');
      const income = await this.prisma.income.create({
        data: {
          date: new Date(),
          amount: total,
          category: 'STUDENT_FEES',
          sourceType: 'STUDENT_FEE',
          paymentMethod: 'CASH',
          description: `Auto class ${levelLabel} fee — ${monthName} ${year} (${g.count} students)`,
          referenceNumber: marker,
          accountId: account.id,
          recordedById,
        },
      });

      await this.audit.log({
        userId: recordedById,
        changedBy: recordedById,
        action: 'AUTO_MONTHLY_FEES_RECORDED',
        entityType: 'Income',
        entityId: income.id,
        newValue: { month: monthEnum, ethiopianYear: year, classLevel: level, amount: total, studentCount: g.count },
      });

      results.push({ classLevel: level, studentCount: g.count, amount: total, incomeId: income.id });
    }

    return { alreadyRecorded: false, results };
  }

  async update(id: string, dto: UpdateIncomeDto, userId: string) {
    const { reason, ...changes } = dto;
    return this.financeAudit.auditedUpdate({
      entityType: 'Income',
      id,
      changes,
      changedBy: userId,
      reason,
    });
  }

  async approve(id: string, dto: ApproveTransactionDto, userId: string) {
    return this.financeAudit.approveTransaction({
      entityType: 'Income',
      id,
      approverId: userId,
      decision: dto.decision as ApprovalDecision,
      comments: dto.comments,
    });
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.income.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Income record not found');
    await this.prisma.income.delete({ where: { id } });
    await this.audit.log({
      userId,
      changedBy: userId,
      action: 'INCOME_DELETED',
      entityType: 'Income',
      entityId: id,
      oldValue: existing,
    });
    return { success: true };
  }
}
