import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinanceReportsService {
  constructor(private prisma: PrismaService) {}

  async buildFinancialReport(from: Date, to: Date) {
    const [incomes, expenses] = await Promise.all([
      this.prisma.income.findMany({ where: { date: { gte: from, lte: to } } }),
      this.prisma.expense.findMany({ where: { date: { gte: from, lte: to } } }),
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
}
