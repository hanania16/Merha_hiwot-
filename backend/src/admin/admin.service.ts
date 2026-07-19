import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { currentEthiopianYear } from '../common/constants/ethiopian-calendar';
import { baseFeeFor } from '../common/constants/fee-rules';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /** Single synchronized snapshot for the Admin dashboard — reads the same tables every other dashboard reads, no duplicate logic. */
  async getOverview() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalStudents, activeStudents, inactiveStudents, newRegistrations] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.student.count({ where: { status: 'ACTIVE' } }),
      this.prisma.student.count({ where: { status: 'INACTIVE' } }),
      this.prisma.student.count({ where: { registrationDate: { gte: startOfMonth } } }),
    ]);

    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.income.aggregate({ _sum: { amount: true } }),
      this.prisma.expense.aggregate({ _sum: { amount: true } }),
    ]);
    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpenses = Number(expenseAgg._sum.amount ?? 0);

    const ethiopianYear = currentEthiopianYear();
    const activeStudentList = await this.prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: { class: true, monthlyPayments: { where: { ethiopianYear } } },
    });
    let outstandingFees = 0;
    for (const s of activeStudentList) {
      const paid = s.monthlyPayments.filter((p) => p.status === 'PAID').length;
      const unpaid = 13 - paid;
      if (unpaid > 0) {
        const base = baseFeeFor({
          classLevel: s.class.level,
          isWorkingMember: s.isWorkingMember,
          monthlySalary: s.monthlySalary ? Number(s.monthlySalary) : null,
        });
        outstandingFees += unpaid * base;
      }
    }

    const [totalEvents, upcomingEvents] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.event.count({ where: { status: 'UPCOMING' } }),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);
    const todayAttendance = await this.prisma.attendance.findMany({
      where: { event: { date: { gte: todayStart, lte: todayEnd } } },
    });
    const presentToday = todayAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendancePercentageToday = todayAttendance.length
      ? Math.round((presentToday / todayAttendance.length) * 1000) / 10
      : 0;

    return {
      totalStudents,
      activeStudents,
      inactiveStudents,
      newRegistrationsThisMonth: newRegistrations,
      totalIncome,
      totalExpenses,
      currentBalance: totalIncome - totalExpenses,
      outstandingFees: Math.round(outstandingFees * 100) / 100,
      totalEvents,
      upcomingEvents,
      attendancePercentageToday,
      ethiopianYear,
    };
  }
}
