import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EthiopianMonth } from '@prisma/client';
import { ETHIOPIAN_MONTHS } from '../../common/constants/ethiopian-calendar';
import { FEE_TRACKING_START_YEAR, feeMonthsElapsed, isWithinFeeTrackingWindow } from '../../common/constants/fee-rules';

const monthOrder = (month: EthiopianMonth) =>
  ETHIOPIAN_MONTHS.find((m) => m.value === month)?.order ?? 1;

const countPaidInWindow = (
  payments: { status: string; ethiopianYear: number; month: EthiopianMonth }[],
) => payments.filter((p) => p.status === 'PAID' && isWithinFeeTrackingWindow(p.ethiopianYear, monthOrder(p.month))).length;

@Injectable()
export class FinanceAnalyticsService {
  constructor(private prisma: PrismaService) {}

  /** Last N months of income vs expense, grouped by calendar month. */
  async incomeVsExpenseTrend(months = 12) {
    const since = new Date();
    since.setMonth(since.getMonth() - months + 1);
    since.setDate(1);

    const [incomes, expenses] = await Promise.all([
      this.prisma.income.findMany({ where: { date: { gte: since } }, select: { date: true, amount: true } }),
      this.prisma.expense.findMany({ where: { date: { gte: since } }, select: { date: true, amount: true } }),
    ]);

    const buckets: Record<string, { month: string; income: number; expense: number }> = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(since);
      d.setMonth(since.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = { month: key, income: 0, expense: 0 };
    }
    for (const inc of incomes) {
      const key = `${inc.date.getFullYear()}-${String(inc.date.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[key]) buckets[key].income += Number(inc.amount);
    }
    for (const exp of expenses) {
      const key = `${exp.date.getFullYear()}-${String(exp.date.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[key]) buckets[key].expense += Number(exp.amount);
    }

    return Object.values(buckets).map((b) => ({ ...b, balance: b.income - b.expense }));
  }

  async expensesByCategory() {
    const grouped = await this.prisma.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
    });
    return grouped.map((g) => ({ category: g.category, total: Number(g._sum.amount ?? 0) }));
  }

  async incomeByCategory() {
    const grouped = await this.prisma.income.groupBy({
      by: ['category'],
      _sum: { amount: true },
    });
    return grouped.map((g) => ({ category: g.category, total: Number(g._sum.amount ?? 0) }));
  }

  async donationTrend(months = 12) {
    const since = new Date();
    since.setMonth(since.getMonth() - months + 1);
    since.setDate(1);

    const donations = await this.prisma.income.findMany({
      where: { category: 'DONATIONS', date: { gte: since } },
      select: { date: true, amount: true },
    });

    const buckets: Record<string, number> = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(since);
      d.setMonth(since.getMonth() + i);
      buckets[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    for (const d of donations) {
      const key = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`;
      if (key in buckets) buckets[key] += Number(d.amount);
    }
    return Object.entries(buckets).map(([month, total]) => ({ month, total }));
  }

  async collectionRate(ethiopianYear: number) {
    const students = await this.prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: { monthlyPayments: { where: { ethiopianYear: { gte: FEE_TRACKING_START_YEAR } } } },
    });
    const elapsed = feeMonthsElapsed();
    const totalPossible = students.length * elapsed;
    const totalPaid = students.reduce(
      (sum, s) => sum + countPaidInWindow(s.monthlyPayments),
      0,
    );
    return {
      ethiopianYear,
      totalStudents: students.length,
      totalPossibleMonths: totalPossible,
      totalPaidMonths: totalPaid,
      collectionRatePercent: totalPossible ? Math.round((totalPaid / totalPossible) * 1000) / 10 : 0,
    };
  }

  /** Not paid / paid today / paid this month — for the Finance analytics tiles. Penalties are not tracked. */
  async paymentStatusBreakdown(ethiopianYear: number) {
    const students = await this.prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: { monthlyPayments: { where: { ethiopianYear: { gte: FEE_TRACKING_START_YEAR } } } },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const elapsed = feeMonthsElapsed();
    let notPaid = 0, paidToday = 0, paidThisMonth = 0;

    for (const s of students) {
      if (countPaidInWindow(s.monthlyPayments) < elapsed) notPaid++;

      const paidToday_ = s.monthlyPayments.some((p) => p.paidDate && p.paidDate >= todayStart);
      if (paidToday_) paidToday++;

      const paidThisMonth_ = s.monthlyPayments.some((p) => p.paidDate && p.paidDate >= monthStart);
      if (paidThisMonth_) paidThisMonth++;
    }

    return { notPaid, paidToday, paidThisMonth, totalActiveStudents: students.length };
  }

  async yearlyFinancialTrend(years = 5) {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - years + 1;
    const [incomes, expenses] = await Promise.all([
      this.prisma.income.findMany({
        where: { date: { gte: new Date(startYear, 0, 1) } },
        select: { date: true, amount: true },
      }),
      this.prisma.expense.findMany({
        where: { date: { gte: new Date(startYear, 0, 1) } },
        select: { date: true, amount: true },
      }),
    ]);

    const buckets: Record<number, { year: number; income: number; expense: number }> = {};
    for (let y = startYear; y <= currentYear; y++) buckets[y] = { year: y, income: 0, expense: 0 };
    for (const i of incomes) buckets[i.date.getFullYear()].income += Number(i.amount);
    for (const e of expenses) buckets[e.date.getFullYear()].expense += Number(e.amount);

    return Object.values(buckets);
  }
}
