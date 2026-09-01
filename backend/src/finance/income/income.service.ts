import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalDecision, AccountType, ClassLevel, EthiopianMonth, IncomeCategory, IncomeSourceType, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { FinanceAuditService } from '../../services/financeAuditService';
import { LedgerService } from '../ledger/ledger.service';
import { baseFeeFor } from '../../common/constants/fee-rules';
import { ETHIOPIAN_MONTHS, monthLabel } from '../../common/constants/ethiopian-calendar';
import { CreateIncomeDto } from './dto/create-income.dto';
import { ApproveTransactionDto } from './dto/approve-transaction.dto';
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

  /** Format a ClassLevel enum as the readable "1-3" / "4-6" / "7-12" label. */
  private classLevelLabel(level: ClassLevel): string {
    return level.replace('CLASS_', '').replace('_', '-');
  }

  /**
   * Batched class income recording — the ONLY path that turns PAID
   * MonthlyPayment rows into aggregated STUDENT_FEES Income rows.
   *
   * Reads every row where status = PAID that has NOT yet been included
   * (includedInIncomeAt IS NULL) — regardless of which Ethiopian month/year the
   * payment belongs to — groups them by (class level, Ethiopian year, month),
   * and creates one Income row per level/month equal to that level's total.
   * Grouping by (level, year, month) means each income row still represents one
   * class level for one specific month, and a payment is always booked to the
   * month/year it was actually paid for — never to the month the job happens to
   * run in.
   *
   * This sweeping of EVERY unincluded row (instead of just the current month) is
   * what closes the boundary gaps: Pagume (the short, final month whose days are
   * always < 26) is booked as soon as any run occurs; a same-month payment made
   * after the previous 00:30 run is caught by the next run; and a catch-up /
   * back-dated payment for a non-current month is booked too. So no PAID fee is
   * ever left as includedInIncomeAt = null indefinitely.
   *
   * `year` / `monthOrder` are optional narrowing filters (used by the manual
   * trigger); when omitted, ALL unincluded PAID rows are swept. The scheduled
   * run omits them.
   *
   * Idempotency: because the query only pulls includedInIncomeAt IS NULL rows, a
   * second run naturally finds zero new rows for shipments already processed. The
   * timestamp in the referenceNumber only prevents a uniqueness collision if two
   * runs in the same microsecond hit the same level/month; it is not the
   * idempotency guarantee.
   */
  async recordMonthlyClassIncome(year?: number, monthOrder?: number) {
    const monthEnum = monthOrder != null
      ? ETHIOPIAN_MONTHS.find((m) => m.order === monthOrder)?.value
      : undefined;
    if (monthOrder != null && !monthEnum) throw new BadRequestException('Invalid Ethiopian month');

    const account = await this.prisma.account.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!account) {
      throw new BadRequestException('No active account available to record class fee income');
    }

    const recordedById = (await this.prisma.user.findFirst())?.id;
    if (!recordedById) {
      throw new BadRequestException('No user available to attribute the class fee income');
    }

    const batchTimestamp = Date.now();

    return this.prisma.$transaction(async (tx) => {
      const payments = await tx.monthlyPayment.findMany({
        where: {
          status: 'PAID',
          includedInIncomeAt: null,
          ...(year != null ? { ethiopianYear: year } : {}),
          ...(monthEnum ? { month: monthEnum } : {}),
        },
        include: { student: { include: { class: true } } },
      });

      // Group by (class level, Ethiopian year, month) so each income row still
      // maps to one class level for one specific month.
      const byLevelMonth = new Map<
        string,
        { level: ClassLevel; year: number; month: string; rows: Prisma.MonthlyPaymentGetPayload<{ include: { student: { include: { class: true } } } }>[] }
      >();
      for (const p of payments) {
        const key = `${p.student.class.level}:${p.ethiopianYear}:${p.month}`;
        const bucket = byLevelMonth.get(key) ?? {
          level: p.student.class.level,
          year: p.ethiopianYear,
          month: p.month,
          rows: [],
        };
        bucket.rows.push(p);
        byLevelMonth.set(key, bucket);
      }

      const createdRows = [];

      for (const { level, year: rowYear, month: rowMonth, rows } of byLevelMonth.values()) {
        const total = Math.round(
          rows.reduce((sum, p) => sum + Number(p.amount), 0) * 100,
        ) / 100;

        const referenceNumber = `STUDENT_FEES:${level}:${rowYear}:${rowMonth}:${batchTimestamp}`;

        const { newBalance } = await this.ledger.apply(tx, account.id, total, 'IN');

        const income = await tx.income.create({
          data: {
            date: new Date(),
            amount: total,
            category: 'STUDENT_FEES',
            sourceType: 'STUDENT_FEE',
            paymentMethod: 'CASH',
            description: `Class ${this.classLevelLabel(level)} fees — ${monthLabel(rowMonth as EthiopianMonth)} ${rowYear}`,
            referenceNumber,
            accountId: account.id,
            runningBalance: newBalance,
            recordedById,
          },
        });

        // Mark every included row AFTER its income row exists, in the same tx.
        await tx.monthlyPayment.updateMany({
          where: { id: { in: rows.map((r) => r.id) } },
          data: { includedInIncomeAt: new Date() },
        });

        createdRows.push({
          classLevel: level,
          classLabel: this.classLevelLabel(level),
          ethiopianYear: rowYear,
          month: rowMonth,
          studentCount: rows.length,
          amount: total,
          incomeId: income.id,
        });
      }

      return {
        batchTimestamp,
        alreadyRecorded: createdRows.length === 0,
        results: createdRows,
      };
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
