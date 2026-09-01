import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReconciliationStatus, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toGregorian,
  toEthiopian,
  ETHIOPIAN_MONTHS,
  isLastDayOfEthiopianMonth,
  isLastDayOfEthiopianYear,
} from '../../common/constants/ethiopian-calendar';

const DISCREPANCY_STATUSES: ReconciliationStatus[] = [
  ReconciliationStatus.DISCREPANCY_FOUND,
  ReconciliationStatus.UNDER_INVESTIGATION,
];

const LEDGER_AUDIT_ENTITY_TYPES = ['Income', 'Expense'];

const REVIEW_CUTOFF_MS = 7 * 24 * 60 * 60 * 1000;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Normalise a converted Ethiopian date to UTC midnight so it matches how transaction dates are stored. */
function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** Gregorian [from, to) range for one Ethiopian month (13 = Pagume). */
function ethiopianMonthRange(year: number, month: number): { from: Date; to: Date } {
  const from = toUtcMidnight(toGregorian(year, month, 1));
  const to =
    month === 13
      ? toUtcMidnight(toGregorian(year + 1, 1, 1))
      : toUtcMidnight(toGregorian(year, month + 1, 1));
  return { from, to };
}

/** Gregorian [from, to) range for one Ethiopian year (Meskerem 1 → next Meskerem 1). */
function ethiopianYearRange(year: number): { from: Date; to: Date } {
  return {
    from: toUtcMidnight(toGregorian(year, 1, 1)),
    to: toUtcMidnight(toGregorian(year + 1, 1, 1)),
  };
}

@Injectable()
export class FinanceReportsService {
  constructor(private prisma: PrismaService) {}

  /** Full audit report for a Gregorian [from, to) window derived from an Ethiopian period. */
  private async auditRollup(kind: 'monthly' | 'yearly', from: Date, to: Date) {
    const [incomes, expenses, accounts, reconsInPeriod, auditLogs, lastStudentFeeBatchTime] = await Promise.all([
      this.prisma.income.findMany({        where: { date: { gte: from, lt: to } },
        include: {
          account: { select: { id: true, name: true, type: true } },
          student: { select: { id: true, fullName: true, studentCode: true } },
          recordedBy: { select: { fullName: true } },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.expense.findMany({
        where: { date: { gte: from, lt: to } },
        include: {
          account: { select: { id: true, name: true, type: true } },
          recordedBy: { select: { fullName: true } },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.account.findMany({
        where: { isActive: true },
        select: { id: true, name: true, type: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.reconciliation.findMany({
        where: { createdAt: { gte: from, lt: to } },
        include: { account: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        where: {
          entityType: { in: LEDGER_AUDIT_ENTITY_TYPES },
          reason: { not: null },
          createdAt: { gte: from, lt: to },
        },
        include: { changedBy: { select: { fullName: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.monthlyPayment.aggregate({ _max: { includedInIncomeAt: true } }).then((a) => a._max.includedInIncomeAt ?? null),
    ]);

    const approvedIncomes = incomes.filter((i) => i.status === TransactionStatus.APPROVED);
    const approvedExpenses = expenses.filter((e) => e.status === TransactionStatus.APPROVED);

    // 1 + 2. Approved income by sourceType / approved expense by category, with record IDs.
    const incomeBySourceType: Record<string, { total: number; count: number; recordIds: string[] }> = {};
    for (const i of approvedIncomes) {
      const g = (incomeBySourceType[i.sourceType] ??= { total: 0, count: 0, recordIds: [] });
      g.total = round2(g.total + Number(i.amount));
      g.count += 1;
      g.recordIds.push(i.id);
    }
    const expenseByCategory: Record<string, { total: number; count: number; recordIds: string[] }> = {};
    for (const e of approvedExpenses) {
      const g = (expenseByCategory[e.category] ??= { total: 0, count: 0, recordIds: [] });
      g.total = round2(g.total + Number(e.amount));
      g.count += 1;
      g.recordIds.push(e.id);
    }

    // 3. Expected vs actual per account — stored Reconciliation, never recomputed.
    //    For each account take the latest reconciliation whose periodEnd <= report end.
    const latestReconByAccount = new Map<string, (typeof allRecons)[number]>();
    const allRecons = await this.prisma.reconciliation.findMany({
      where: { periodEnd: { lte: to } },
      orderBy: [{ periodEnd: 'desc' }, { createdAt: 'desc' }],
    });
    for (const r of allRecons) {
      if (!latestReconByAccount.has(r.accountId)) latestReconByAccount.set(r.accountId, r);
    }
    const accountBalances = accounts.map((a) => {
      const rec = latestReconByAccount.get(a.id);
      return rec
        ? {
            accountId: a.id,
            accountName: a.name,
            accountType: a.type,
            reconciliationId: rec.id,
            expectedBalance: Number(rec.expectedBalance),
            actualBalance: Number(rec.actualBalance),
            discrepancy: Number(rec.discrepancy),
            status: rec.status,
            periodStart: rec.periodStart,
            periodEnd: rec.periodEnd,
          }
        : {
            accountId: a.id,
            accountName: a.name,
            accountType: a.type,
            reconciliationId: null,
            expectedBalance: null,
            actualBalance: null,
            discrepancy: null,
            status: null,
            periodStart: null,
            periodEnd: null,
          };
    });

    // 4. Discrepancies found during the period (DISCREPANCY_FOUND or UNDER_INVESTIGATION).
    const discrepancies = reconsInPeriod
      .filter((r) => DISCREPANCY_STATUSES.includes(r.status))
      .map((r) => ({
        reconciliationId: r.id,
        accountId: r.accountId,
        accountName: r.account.name,
        expectedBalance: Number(r.expectedBalance),
        actualBalance: Number(r.actualBalance),
        discrepancy: Number(r.discrepancy),
        status: r.status,
        resolutionNotes: r.resolutionNotes,
        resolvedAt: r.resolvedAt,
        createdAt: r.createdAt,
      }));

    // 5. Missing receipts — income in period with no receipt attached.
    const missingReceiptRows = incomes.filter((i) => i.receiptId === null);
    const missingReceipts = {
      total: missingReceiptRows.length,
      records: missingReceiptRows.map((i) => ({
        id: i.id,
        date: i.date,
        amount: Number(i.amount),
        sourceType: i.sourceType,
        status: i.status,
        accountId: i.accountId,
        description: i.description,
      })),
    };

    // 6. Pending approvals — regardless of when they were created.
    const [pendingIncome, pendingExpense] = await Promise.all([
      this.prisma.income.findMany({
        where: { status: TransactionStatus.PENDING_APPROVAL },
        select: { id: true, date: true, amount: true, sourceType: true, category: true, description: true, createdAt: true, accountId: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.expense.findMany({
        where: { status: TransactionStatus.PENDING_APPROVAL },
        select: { id: true, date: true, amount: true, category: true, description: true, createdAt: true, accountId: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const pendingApprovals = {
      total: pendingIncome.length + pendingExpense.length,
      income: pendingIncome.map((i) => ({ id: i.id, date: i.date, amount: Number(i.amount), sourceType: i.sourceType, createdAt: i.createdAt, accountId: i.accountId })),
      expense: pendingExpense.map((e) => ({ id: e.id, date: e.date, amount: Number(e.amount), category: e.category, createdAt: e.createdAt, accountId: e.accountId })),
    };

    // 7. Adjustments — audit trail entries for Income/Expense with a reason (post-creation edits, approvals, rejections).
    const adjustments = auditLogs.map((l) => ({
      id: l.id,
      entityType: l.entityType,
      entityId: l.entityId,
      action: l.action,
      reason: l.reason,
      changedById: l.changedById,
      changedByName: l.changedBy?.fullName ?? null,
      createdAt: l.createdAt,
      oldValue: l.oldValue,
      newValue: l.newValue,
    }));

    // 8. Flat "requires review" — unresolved discrepancies, missing receipts, pending approvals older than 7 days.
    const reviewCutoff = new Date(Date.now() - REVIEW_CUTOFF_MS);
    const overduePending = [
      ...pendingIncome.map((i) => ({ ...i, entityType: 'Income' as const })),
      ...pendingExpense.map((e) => ({ ...e, entityType: 'Expense' as const })),
    ].filter((p) => p.createdAt < reviewCutoff);

    const requiresReviewItems: Array<Record<string, unknown>> = [
      ...discrepancies.map((d) => ({
        type: 'RECONCILIATION_DISCREPANCY',
        reconciliationId: d.reconciliationId,
        accountId: d.accountId,
        accountName: d.accountName,
        expectedBalance: d.expectedBalance,
        actualBalance: d.actualBalance,
        amount: d.discrepancy,
      })),
      ...missingReceiptRows.map((i) => ({
        type: 'MISSING_RECEIPT',
        incomeId: i.id,
        accountId: i.accountId,
        amount: Number(i.amount),
      })),
      ...overduePending.map((p) => ({
        type: 'PENDING_APPROVAL',
        transactionId: p.id,
        entityType: p.entityType,
        accountId: p.accountId,
        amount: Number(p.amount),
        ageDays: Math.floor((Date.now() - p.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
      })),
    ];

    const totalIncome = approvedIncomes.reduce((s, i) => s + Number(i.amount), 0);
    const totalExpense = approvedExpenses.reduce((s, e) => s + Number(e.amount), 0);

    return {
      kind,
      period: { from, to },
      lastStudentFeeBatchTime,
      summary: {
        totalIncome: round2(totalIncome),
        totalExpense: round2(totalExpense),
        net: round2(totalIncome - totalExpense),
        incomeCount: approvedIncomes.length,
        expenseCount: approvedExpenses.length,
      },
      incomeBySourceType,
      expenseByCategory,
      accountBalances,
      discrepancies,
      missingReceipts,
      pendingApprovals,
      adjustments,
      requiresReview: { total: requiresReviewItems.length, items: requiresReviewItems },
      transactions: {
        income: incomes.map((i) => ({
          ...i,
          amount: Number(i.amount),
          recordedByName: i.recordedBy?.fullName ?? null,
        })),
        expense: expenses.map((e) => ({
          ...e,
          amount: Number(e.amount),
          recordedByName: e.recordedBy?.fullName ?? null,
        })),
      },
    };
  }

  async monthlyReport(year: number, month: number) {
    const { from, to } = ethiopianMonthRange(year, month);
    return this.auditRollup('monthly', from, to);
  }

  async yearlyReport(year: number) {
    const { from, to } = ethiopianYearRange(year);
    return this.auditRollup('yearly', from, to);
  }

  /** Last time student fees were swept into class-level STUDENT_FEES income (MAX includedInIncomeAt). */
  private async lastStudentFeeBatchTime(): Promise<Date | null> {
    const { _max } = await this.prisma.monthlyPayment.aggregate({ _max: { includedInIncomeAt: true } });
    return _max.includedInIncomeAt ?? null;
  }

  async buildFinancialReport(from: Date, to: Date) {
    const [incomes, expenses, lastStudentFeeBatchTime] = await Promise.all([
      this.prisma.income.findMany({ where: { date: { gte: from, lte: to } } }),
      this.prisma.expense.findMany({ where: { date: { gte: from, lte: to } } }),
      this.lastStudentFeeBatchTime(),
    ]);

    const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
    const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);

    const expenseByCategory: Record<string, number> = {};
    for (const e of expenses) {
      expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + Number(e.amount);
    }

    const incomeByCategory: Record<string, number> = {};
    for (const i of incomes) {
      incomeByCategory[i.category] = (incomeByCategory[i.category] ?? 0) + Number(i.amount);
    }

    const donations = incomes
      .filter((i) => i.category === 'DONATIONS')
      .reduce((s, i) => s + Number(i.amount), 0);

    const outstanding = await this.outstandingFees();

    return {
      period: { from, to },
      lastStudentFeeBatchTime,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      collectionRate: outstanding.collectionRatePercent,
      expenseByCategory,
      incomeByCategory,
      donations,
      outstandingFeeMonths: outstanding.outstandingMonths,
      incomes,
      expenses,
    };
  }

  private async outstandingFees() {
    const ethiopianYear = new Date().getFullYear() - 8;
    const students = await this.prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: { monthlyPayments: { where: { ethiopianYear } } },
    });
    const totalPossible = students.length * 13;
    const totalPaid = students.reduce(
      (sum, s) => sum + s.monthlyPayments.filter((p) => p.status === 'PAID').length,
      0,
    );
    return {
      outstandingMonths: totalPossible - totalPaid,
      collectionRatePercent: totalPossible ? Math.round((totalPaid / totalPossible) * 1000) / 10 : 0,
    };
  }

  async studentFeeReport(ethiopianYear: number) {
    const students = await this.prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: { class: true, monthlyPayments: { where: { ethiopianYear } } },
      orderBy: { fullName: 'asc' },
    });
    return students.map((s) => ({
      fullName: s.fullName,
      className: s.class.name,
      paidMonths: s.monthlyPayments.filter((p) => p.status === 'PAID').length,
      unpaidMonths: 13 - s.monthlyPayments.filter((p) => p.status === 'PAID').length,
      totalPaid: s.monthlyPayments.reduce((sum, p) => (p.status === 'PAID' ? sum + Number(p.amount) : sum), 0),
    }));
  }

  /** Deep-serialise a report (Dates become ISO strings) so it can be stored in a JSON column. */
  private serialize(report: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(report)) as Prisma.InputJsonValue;
  }

  /** Builds and permanently saves a MONTHLY or YEARLY report snapshot. Upserts by (type, year, month) so it never duplicates. */
  async snapshotNow(
    type: 'MONTHLY' | 'YEARLY',
    ethiopianYear: number,
    month?: number,
    generatedById?: string,
  ) {
    const report =
      type === 'MONTHLY'
        ? await this.monthlyReport(ethiopianYear, month ?? toEthiopian(new Date()).month)
        : await this.yearlyReport(ethiopianYear);

    const data = this.serialize(report);
    const summary = {
      totalIncome: round2(Number(report.summary.totalIncome)),
      totalExpense: round2(Number(report.summary.totalExpense)),
      net: round2(Number(report.summary.net)),
      incomeCount: report.summary.incomeCount,
      expenseCount: report.summary.expenseCount,
    };

    if (type === 'MONTHLY') {
      const monthOrder = month ?? toEthiopian(new Date()).month;
      const monthEnum = ETHIOPIAN_MONTHS.find((m) => m.order === monthOrder)?.value;
      if (!monthEnum) throw new NotFoundException('Invalid Ethiopian month');
      const saved = await this.prisma.financeReport.upsert({
        where: {
          type_ethiopianYear_month: {
            type,
            ethiopianYear,
            month: monthEnum,
          },
        },
        update: { summary, data, generatedById },
        create: {
          type,
          ethiopianYear,
          month: monthEnum,
          summary,
          data,
          generatedById,
        },
      });
      return { ...saved, data, summary };
    }

    const existing = await this.prisma.financeReport.findFirst({
      where: { type: 'YEARLY', ethiopianYear, month: null },
    });
    const saved = existing
      ? await this.prisma.financeReport.update({ where: { id: existing.id }, data: { summary, data, generatedById } })
      : await this.prisma.financeReport.create({
          data: { type, ethiopianYear, month: null, summary, data, generatedById },
        });
    return { ...saved, data, summary };
  }

  /** Called by the daily scheduler — auto-snapshots at the end of each Ethiopian month/year. */
  async generateCurrentSnapshots(generatedById?: string) {
    const now = new Date();
    const { year, month } = toEthiopian(now);
    const saved: Array<{ type: 'MONTHLY' | 'YEARLY'; ethiopianYear: number; month?: number }> = [];

    if (isLastDayOfEthiopianMonth(now)) {
      await this.snapshotNow('MONTHLY', year, month, generatedById);
      saved.push({ type: 'MONTHLY', ethiopianYear: year, month });
    }
    if (isLastDayOfEthiopianYear(now)) {
      await this.snapshotNow('YEARLY', year, undefined, generatedById);
      saved.push({ type: 'YEARLY', ethiopianYear: year });
    }
    return saved;
  }

  /** Summaries of every saved report snapshot, newest first. */
  listReportHistory() {
    return this.prisma.financeReport.findMany({
      orderBy: [{ ethiopianYear: 'desc' }, { month: 'desc' }],
      select: {
        id: true,
        type: true,
        ethiopianYear: true,
        month: true,
        summary: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getReportSnapshot(id: string) {
    const snapshot = await this.prisma.financeReport.findUnique({ where: { id } });
    if (!snapshot) throw new NotFoundException('Report snapshot not found');
    return snapshot;
  }

  async removeReportSnapshot(id: string) {
    const snapshot = await this.prisma.financeReport.findUnique({ where: { id } });
    if (!snapshot) throw new NotFoundException('Report snapshot not found');
    await this.prisma.financeReport.delete({ where: { id } });
    return { success: true };
  }
}
