import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { currentEthiopianYear } from '../../common/constants/ethiopian-calendar';

@Injectable()
export class FinanceDashboardService {
  constructor(private prisma: PrismaService) {}

  private startOfMonth() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
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
  private startOfYear() {
    return new Date(new Date().getFullYear(), 0, 1);
  }

  async getSummary() {
    const [
      monthlyIncomeAgg,
      monthlyExpenseAgg,
      todayIncomeAgg,
      todayExpenseAgg,
      allIncomeAgg,
      allExpenseAgg,
      yearIncomeAgg,
      yearExpenseAgg,
      studentFeesThisMonthAgg,
    ] = await Promise.all([
      this.prisma.income.aggregate({ _sum: { amount: true }, where: { date: { gte: this.startOfMonth() } } }),
      this.prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: this.startOfMonth() } } }),
      this.prisma.income.aggregate({ _sum: { amount: true }, where: { date: { gte: this.startOfDay(), lte: this.endOfDay() } } }),
      this.prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: this.startOfDay(), lte: this.endOfDay() } } }),
      this.prisma.income.aggregate({ _sum: { amount: true } }),
      this.prisma.expense.aggregate({ _sum: { amount: true } }),
      this.prisma.income.aggregate({ _sum: { amount: true }, where: { date: { gte: this.startOfYear() } } }),
      this.prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: this.startOfYear() } } }),
      this.prisma.monthlyPayment.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID', paidDate: { gte: this.startOfMonth() } },
      }),
    ]);

    const ethiopianYear = currentEthiopianYear();
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

    const totalIncome = Number(allIncomeAgg._sum.amount ?? 0);
    const totalExpense = Number(allExpenseAgg._sum.amount ?? 0);

    return {
      monthlyIncome: monthlyIncomeAgg._sum.amount ?? 0,
      monthlyExpenses: monthlyExpenseAgg._sum.amount ?? 0,
      currentBalance: totalIncome - totalExpense,
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
    const since = this.startOfMonth();
    const [payments, incomes, expenses] = await Promise.all([
      this.prisma.monthlyPayment.findMany({
        where: { status: 'PAID', paidDate: { gte: since } },
        include: { student: { select: { fullName: true } } },
        orderBy: { paidDate: 'desc' },
        take: 20,
      }),
      this.prisma.income.findMany({ where: { date: { gte: since } }, orderBy: { date: 'desc' }, take: 20 }),
      this.prisma.expense.findMany({ where: { date: { gte: since } }, orderBy: { date: 'desc' }, take: 20 }),
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
