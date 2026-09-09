import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType, IncomeCategory, IncomeSourceType, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { baseFeeFor } from '../../common/constants/fee-rules';
import { ETHIOPIAN_MONTHS, monthLabel } from '../../common/constants/ethiopian-calendar';
import { CreateIncomeDto } from './dto/create-income.dto';
import { QueryIncomeDto } from './dto/query-income.dto';

/**
 * Legacy category for an income source. The Income form no longer lets users
 * pick a category — `sourceType` is the source of truth. This only keeps the
 * historical, non-null `category` column populated so category-based reports
 * and filters never show empty buckets for new records.
 */
function defaultCategoryFor(sourceType: IncomeSourceType): IncomeCategory {
  switch (sourceType) {
    case IncomeSourceType.STUDENT_FEE:
      return IncomeCategory.STUDENT_FEES;
    case IncomeSourceType.OTHER:
      return IncomeCategory.OTHERS;
    case IncomeSourceType.DEBRE_TABOR_FEAST:
    case IncomeSourceType.NEW_YEAR:
    case IncomeSourceType.MESKEL_FEAST:
    case IncomeSourceType.DONATION:
    case IncomeSourceType.CHURCH_CONTRIBUTION:
    case IncomeSourceType.FUNDRAISING:
    case IncomeSourceType.SPECIAL_OFFERING:
      return IncomeCategory.DONATIONS;
    default:
      return IncomeCategory.OTHERS;
  }
}

@Injectable()
export class IncomeService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private ledger: LedgerService,
  ) {}

  findAll(query: QueryIncomeDto) {
    return this.prisma.income.findMany({
      where: {
        category: query.category,
        sourceType: query.sourceType,
        date: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      include: {
        recordedBy: { select: { fullName: true } },
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

    const isTransfer = dto.paymentMethod === PaymentMethod.BANK_TRANSFER;
    if (isTransfer && !dto.senderName?.trim()) {
      throw new BadRequestException('Account owner name is required for bank transfer income');
    }

    if (dto.receiptId) {
      const receipt = await this.prisma.receipt.findUnique({ where: { id: dto.receiptId } });
      if (!receipt) throw new NotFoundException('Receipt record not found');
    }

    // The account dropdown was removed from the UI. The internal account to
    // credit is now derived from the payment method: bank transfers hit a BANK
    // account, cash hits a CASH account, with fallback to any active account.
    let accountId = dto.accountId;
    if (!accountId) {
      const account = await this.prisma.account.findFirst({
        where: {
          isActive: true,
          type: dto.paymentMethod === PaymentMethod.BANK_TRANSFER ? AccountType.BANK : AccountType.CASH,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!account) {
        const fallback = await this.prisma.account.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
        if (!fallback) {
          throw new BadRequestException('No active account available to record this income');
        }
        accountId = fallback.id;
      } else {
        accountId = account.id;
      }
    }

    // Balance update (Account.currentBalance) + the ledger row (runningBalance)
    // commit atomically under a row lock — no path can update one without the
    // other. Corrections are append-only REVERSAL entries, never edits/deletes.
    // Transfer metadata is only stored for bank-transfer income; non-transfer
    // records always persist null so the fields never carry stale values.
    const income = await this.prisma.$transaction(async (tx) => {
      const { newBalance } = await this.ledger.apply(tx, accountId, dto.amount, 'IN');
      return tx.income.create({
        data: {
          date: new Date(dto.date),
          amount: dto.amount,
          category: dto.category ?? defaultCategoryFor(dto.sourceType),
          sourceType: dto.sourceType,
          paymentMethod: dto.paymentMethod,
          description: dto.description,
          senderName: isTransfer ? (dto.senderName ?? null) : null,
          senderAccountNumber: isTransfer ? (dto.senderAccountNumber ?? null) : null,
          referenceNumber: dto.referenceNumber,
          notes: dto.notes,
          accountId,
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

  /**
   * Student-fee income grouped by class level. Each group contains the
   * individual income rows for that class level, plus a subtotal.
   * referenceNumber format: STUDENT_FEE:CLASS_1_3:2018:NEHASE
   */
  async getStudentFeesSummary() {
    const rows = await this.prisma.income.findMany({
      where: { sourceType: 'STUDENT_FEE' },
      include: {
        recordedBy: { select: { fullName: true } },
      },
      orderBy: { date: 'desc' },
    });

    const groups: Record<string, { label: string; rows: typeof rows; total: number }> = {};

    for (const row of rows) {
      const parts = row.referenceNumber?.split(':');
      const levelKey = parts?.[1] ?? 'UNKNOWN';
      const label = levelKey.replace('CLASS_', '').replace('_', '-');

      if (!groups[levelKey]) {
        groups[levelKey] = { label, rows: [], total: 0 };
      }
      groups[levelKey].rows.push(row);
      groups[levelKey].total += Number(row.amount);
    }

    // Sort groups by class level order (1-3, 4-6, 7-12)
    const order = ['CLASS_1_3', 'CLASS_4_6', 'CLASS_7_12'];
    return order
      .filter((k) => groups[k])
      .map((k) => ({
        classLevel: k,
        label: groups[k].label,
        total: Math.round(groups[k].total * 100) / 100,
        rows: groups[k].rows,
      }));
  }
}
