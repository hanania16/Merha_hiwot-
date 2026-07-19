import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { currentEthiopianYear } from '../../common/constants/ethiopian-calendar';

@Injectable()
export class AttendanceDashboardService {
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

  async getSummary() {
    const [totalStudents, activeStudents, inactiveStudents, newThisMonth] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.student.count({ where: { status: 'ACTIVE' } }),
      this.prisma.student.count({ where: { status: 'INACTIVE' } }),
      this.prisma.student.count({ where: { registrationDate: { gte: this.startOfMonth() } } }),
    ]);

    const todayRecords = await this.prisma.attendance.findMany({
      where: { event: { date: { gte: this.startOfDay(), lte: this.endOfDay() } } },
    });
    const presentToday = todayRecords.filter((r) => r.status === 'PRESENT').length;
    const absentToday = todayRecords.filter((r) => r.status === 'ABSENT').length;
    const permissionToday = todayRecords.filter((r) => r.status === 'PERMISSION').length;
    const lateToday = todayRecords.filter((r) => r.status === 'LATE').length;
    const attendancePercentageToday = todayRecords.length
      ? Math.round(((presentToday + lateToday) / todayRecords.length) * 1000) / 10
      : 0;

    // Read-only finance summary (Attendance dashboard never edits financial data)
    const ethiopianYear = currentEthiopianYear();
    const activeStudentList = await this.prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: { monthlyPayments: { where: { ethiopianYear } } },
    });
    let studentsPaid = 0;
    let studentsUnpaid = 0;
    for (const s of activeStudentList) {
      const paid = s.monthlyPayments.filter((p) => p.status === 'PAID').length;
      if (paid === 13) studentsPaid++;
      else studentsUnpaid++;
    }

    return {
      totalStudents,
      activeStudents,
      inactiveStudents,
      newRegistrationsThisMonth: newThisMonth,
      presentToday,
      absentToday,
      permissionToday,
      lateToday,
      attendancePercentageToday,
      financeSummary: { studentsPaid, studentsUnpaid },
    };
  }

  async getWarningStudents() {
    const students = await this.prisma.student.findMany({ where: { status: 'ACTIVE' } });
    const warnings = [];
    for (const student of students) {
      const records = await this.prisma.attendance.findMany({
        where: { studentId: student.id },
        include: { event: true },
        orderBy: { event: { date: 'desc' } },
        take: 10,
      });
      let consecutive = 0;
      for (const r of records) {
        if (r.status === 'ABSENT') consecutive++;
        else break;
      }
      if (consecutive >= 2) {
        warnings.push({ studentId: student.id, fullName: student.fullName, consecutiveAbsences: consecutive });
      }
    }
    return warnings.sort((a, b) => b.consecutiveAbsences - a.consecutiveAbsences);
  }
}
