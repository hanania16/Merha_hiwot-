import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  currentEthiopianYear,
  toEthiopian,
  toGregorian,
  ETHIOPIAN_MONTHS,
} from '../../common/constants/ethiopian-calendar';

@Injectable()
export class FinanceDashboardService {
  constructor(private prisma: PrismaService) {}

  private toUtcMidnight(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  private ethiopianMonthRange(year: number, month: number): { from: Date; to: Date } {
    const from = this.toUtcMidnight(toGregorian(year, month, 1));
    const to =
      month === 13
        ? this.toUtcMidnight(toGregorian(year + 1, 1, 1))
        : this.toUtcMidnight(toGregorian(year, month + 1, 1));
    return { from, to };
  }

  private ethiopianYearRange(year: number): { from: Date; to: Date } {
    return {
      from: this.toUtcMidnight(toGregorian(year, 1, 1)),
      to: this.toUtcMidnight(toGregorian(year + 1, 1, 1)),
    };
  }

  private startOfDay() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  private endOfDay() {
    const d = this.startOfDay();
    d.setHours(23, 59, 59, 999);
    return d;
  }

  async getSummary() {
    const ethiopianYear = currentEthiopianYear();
    const { month: ethiopianMonthNum } = toEthiopian(new Date());
    const ethiopianMonth = ETHIOPIAN_MONTHS.find((m) => m.order === ethiopianMonthNum)?.value as any;

    const [
      monthlyIncomeAgg,
      monthlyExpenseAgg,
      todayIncomeAgg,
      todayExpenseAgg,
      yearIncomeAgg,
      yearExpenseAgg,
      studentFeesThisMonthAgg,
    ] = await Promise.all([
      this.prisma.income.aggregate({ _sum: { amount: true }, where: { ethiopianYear, ethiopianMonth } }),
      this.prisma.expense.aggregate({ _sum: { amount: true }, where: { ethiopianYear, ethiopianMonth } }),
      this.prisma.income.aggregate({ _sum: { amount: true }, where: { date: { gte: this.startOfDay(), lte: this.endOfDay() } } }),
      this.prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: this.startOfDay(), lte: this.endOfDay() } } }),
      this.prisma.income.aggregate({ _sum: { amount: true }, where: { ethiopianYear } }),
      this.prisma.expense.aggregate({ _sum: { amount: true }, where: { ethiopianYear } }),
      this.prisma.monthlyPayment.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID', ethiopianYear, month: ethiopianMonth },
      }),
    ]);

    const activeStudents = await this.prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: { monthlyPayments: { where: { ethiopianYear } } },
    });

    const totalMonths = 13;
    let studentsPaid = 0;
    let studentsUnpaid = 0;
    let outstanding = 0;
    for (const s of activeStudents) {
      const paidCount = s.monthlyPayments.filter((p) => p.status === 'PAID').length;
      if (paidCount === totalMonths) studentsPaid++;
      else studentsUnpaid++;
      outstanding += totalMonths - paidCount;
    }

    return {
      monthlyIncome: monthlyIncomeAgg._sum.amount ?? 0,
      monthlyExpenses: monthlyExpenseAgg._sum.amount ?? 0,
      todayIncome: todayIncomeAgg._sum.amount ?? 0,
      todayExpenses: todayExpenseAgg._sum.amount ?? 0,
      studentFeesCollected: studentFeesThisMonthAgg._sum.amount ?? 0,
      studentsPaid,
      studentsUnpaid,
      outstandingStudentFeeMonths: outstanding,
      yearIncome: yearIncomeAgg._sum.amount ?? 0,
      yearExpenses: yearExpenseAgg._sum.amount ?? 0,
      ethiopianYear,
    };
  }

  async getMonthlyActivities() {
    const ethiopianYear = currentEthiopianYear();
    const { month: ethiopianMonthNum } = toEthiopian(new Date());
    const ethiopianMonth = ETHIOPIAN_MONTHS.find((m) => m.order === ethiopianMonthNum)?.value as any;
    const [payments, incomes, expenses] = await Promise.all([
      this.prisma.monthlyPayment.findMany({
        where: { status: 'PAID', ethiopianYear, month: ethiopianMonth },
        include: { student: { select: { fullName: true } } },
        orderBy: { paidDate: 'desc' },
        take: 20,
      }),
      this.prisma.income.findMany({ where: { ethiopianYear, ethiopianMonth }, orderBy: { date: 'desc' }, take: 20 }),
      this.prisma.expense.findMany({ where: { ethiopianYear, ethiopianMonth }, orderBy: { date: 'desc' }, take: 20 }),
    ]);

    const timeline = [
      ...payments.map((p) => ({
        type: 'PAYMENT' as const,
        date: p.paidDate,
        description: `${p.student.fullName} paid ${p.month} (${p.ethiopianYear})`,
        amount: p.amount,
      })),
      ...incomes.map((i) => ({
        type: 'INCOME' as const,
        date: i.date,
        description: i.description || i.category,
        amount: i.amount,
      })),
      ...expenses.map((e) => ({
        type: 'EXPENSE' as const,
        date: e.date,
        description: e.description || e.category,
        amount: e.amount,
      })),
    ].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

    return timeline.slice(0, 30);
  }
}
