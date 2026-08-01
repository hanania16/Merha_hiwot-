import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalDecision, IncomeSourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { FinanceAuditService } from '../../services/financeAuditService';
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
