import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalDecision, IncomeSourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { FinanceAuditService } from '../../services/financeAuditService';
import { LedgerService } from '../ledger/ledger.service';
import { baseFeeFor } from '../../common/constants/fee-rules';
import { ETHIOPIAN_MONTHS, monthLabel } from '../../common/constants/ethiopian-calendar';
import { CreateIncomeDto } from './dto/create-income.dto';
import { ApproveTransactionDto } from './dto/approve-transaction.dto';
import { QueryIncomeDto } from './dto/query-income.dto';

@Injectable()
export class IncomeService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private financeAudit: FinanceAuditService,
    private ledger: LedgerService,
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
    if (dto.sourceType === IncomeSourceType.STUDENT_FEE) {
      throw new BadRequestException(
        'Student-fee income is derived automatically from MonthlyPayment records; record the payment via the student-fee endpoints instead',
      );
    }
    if (dto.monthlyPaymentId) {
      throw new BadRequestException('monthlyPaymentId can only be set when sourceType is STUDENT_FEE');
    }

    if (dto.receiptId) {
      const receipt = await this.prisma.receipt.findUnique({ where: { id: dto.receiptId } });
      if (!receipt) throw new NotFoundException('Receipt record not found');
    }

    // Balance update (Account.currentBalance) + the ledger row (runningBalance)
    // commit atomically under a row lock — no path can update one without the
    // other. Corrections are append-only REVERSAL entries, never edits/deletes.
    const income = await this.prisma.$transaction(async (tx) => {
      const { newBalance } = await this.ledger.apply(tx, dto.accountId, dto.amount, 'IN');
      return tx.income.create({
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
          runningBalance: newBalance,
          receiptId: dto.receiptId ?? null,
          studentId: dto.studentId ?? null,
          recordedById: userId,
        },
      });
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
   * Automatic monthly student-fee generation. On the 26th of every Ethiopian
   * month the scheduler calls this for the current month. It creates one UNPAID
   * MonthlyPayment row per ACTIVE student that does not already have a row for
   * the month (amount = the class/working-member fee rule — 20/30/50 for regular
   * students, 2% of salary for working members). It NEVER assumes a payment
   * happened: no Income rows are written here, and existing rows (paid or
   * unpaid) are never overwritten. Actual revenue is derived from PAID
   * MonthlyPayment rows only. Idempotent via the natural (student, year, month)
   * unique key.
   */
  async autoRecordMonthlyFees(year: number, monthOrder: number) {
    const monthEnum = ETHIOPIAN_MONTHS.find((m) => m.order === monthOrder)?.value;
    if (!monthEnum) throw new BadRequestException('Invalid Ethiopian month');

    const students = await this.prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: {
        class: true,
        monthlyPayments: { where: { ethiopianYear: year, month: monthEnum } },
      },
    });

    const results = [];
    let created = 0;
    let skipped = 0;

    for (const s of students) {
      const existing = s.monthlyPayments[0];
      if (existing) {
        skipped++;
        results.push({ studentCode: s.studentCode, amount: Number(existing.amount), status: 'SKIPPED' });
        continue;
      }

      const amount = Math.round(
        baseFeeFor({
          classLevel: s.class.level,
          isWorkingMember: s.isWorkingMember,
          monthlySalary: s.monthlySalary ? Number(s.monthlySalary) : null,
        }) * 100,
      ) / 100;

      await this.prisma.monthlyPayment.create({
        data: {
          studentId: s.id,
          ethiopianYear: year,
          month: monthEnum,
          status: 'UNPAID',
          baseAmount: amount,
          penaltyAmount: 0,
          amount,
        },
      });
      created++;
      results.push({ studentCode: s.studentCode, amount, status: 'CREATED' });
    }

    return {
      ethiopianYear: year,
      month: monthEnum,
      monthLabel: monthLabel(monthEnum),
      created,
      skipped,
      alreadyRecorded: created === 0,
      results,
    };
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

  /**
   * Append-only correction path. Income is never edited or deleted: reversing an
   * income books an offsetting Expense (category REVERSAL) linked back to the
   * original row, going through the same locked ledger so the running balance
   * and current balance stay correct. A row can be reversed at most once, and
   * a reversal row itself can never be reversed.
   */
  async reverse(id: string, userId: string) {
    const reversal = await this.prisma.$transaction(async (tx) => {
      const original = await tx.income.findUnique({ where: { id } });
      if (!original) throw new NotFoundException('Income record not found');
      if (original.reversesExpenseId) {
        throw new BadRequestException('A reversal entry cannot itself be reversed');
      }
      const alreadyReversed = await tx.expense.count({ where: { reversesIncomeId: id } });
      if (alreadyReversed > 0) {
        throw new BadRequestException('This income has already been reversed');
      }

      const { newBalance } = await this.ledger.apply(tx, original.accountId, Number(original.amount), 'OUT');

      return tx.expense.create({
        data: {
          date: new Date(),
          amount: original.amount,
          category: 'REVERSAL',
          paymentMethod: original.paymentMethod,
          description: `Reversal of income${original.description ? ` (${original.description})` : ''}`,
          notes: original.notes,
          accountId: original.accountId,
          recordedById: userId,
          runningBalance: newBalance,
          reversesIncomeId: original.id,
        },
      });
    });

    await this.audit.log({
      userId,
      changedBy: userId,
      action: 'INCOME_REVERSED',
      entityType: 'Expense',
      entityId: reversal.id,
      newValue: reversal,
    });

    return reversal;
  }
}
