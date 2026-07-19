import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentsService } from '../../students/students.service';

@Injectable()
export class AttendanceReportsService {
  constructor(private prisma: PrismaService, private studentsService: StudentsService) {}

  async dailyReport(date: string) {
    const day = new Date(date);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const events = await this.prisma.attendanceEvent.findMany({
      where: { date: { gte: start, lte: end } },
      include: { records: { include: { student: { include: { class: true } } } } },
    });

    return events.map((e) => ({
      date: e.date,
      eventType: e.eventType,
      title: e.title,
      records: e.records.map((r) => ({
        studentName: r.student.fullName,
        className: r.student.class.name,
        status: r.status,
      })),
    }));
  }

  async monthlyReport(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const events = await this.prisma.attendanceEvent.findMany({
      where: { date: { gte: start, lte: end } },
      include: { records: true },
      orderBy: { date: 'asc' },
    });

    return events.map((e) => ({
      date: e.date,
      eventType: e.eventType,
      present: e.records.filter((r) => r.status === 'PRESENT').length,
      absent: e.records.filter((r) => r.status === 'ABSENT').length,
      permission: e.records.filter((r) => r.status === 'PERMISSION').length,
    }));
  }

  async classReport(classId: string) {
    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      include: { attendanceRecords: true },
    });
    return students.map((s) => {
      const total = s.attendanceRecords.length;
      const present = s.attendanceRecords.filter((r) => r.status === 'PRESENT').length;
      return {
        fullName: s.fullName,
        totalRecords: total,
        present,
        absent: s.attendanceRecords.filter((r) => r.status === 'ABSENT').length,
        permission: s.attendanceRecords.filter((r) => r.status === 'PERMISSION').length,
        attendancePercentage: total ? Math.round((present / total) * 1000) / 10 : 0,
      };
    });
  }

  async registrationReport(from: Date, to: Date) {
    const students = await this.prisma.student.findMany({
      where: { registrationDate: { gte: from, lte: to } },
      include: { class: true },
      orderBy: { registrationDate: 'asc' },
    });
    return students.map((s) => ({
      fullName: s.fullName,
      className: s.class.name,
      registrationDate: s.registrationDate,
      gender: s.gender,
    }));
  }

  /** Weekly/monthly summary — same aggregation either way, just a different date range. Used by the Reports page's Weekly/Monthly tabs. */
  async attendanceSummary(from: Date, to: Date) {
    const records = await this.prisma.attendance.findMany({
      where: { event: { date: { gte: from, lte: to } } },
      include: { event: true, student: { include: { class: true } } },
    });

    const byClass: Record<string, { present: number; absent: number; late: number; permission: number }> = {};
    for (const r of records) {
      const key = r.student.class.name;
      byClass[key] ??= { present: 0, absent: 0, late: 0, permission: 0 };
      if (r.status === 'PRESENT') byClass[key].present++;
      else if (r.status === 'ABSENT') byClass[key].absent++;
      else if (r.status === 'LATE') byClass[key].late++;
      else if (r.status === 'PERMISSION') byClass[key].permission++;
    }

    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const permission = records.filter((r) => r.status === 'PERMISSION').length;

    return {
      period: { from, to },
      totalRecords: records.length,
      present,
      absent,
      late,
      permission,
      attendancePercentage: records.length ? Math.round(((present + late) / records.length) * 1000) / 10 : 0,
      byClass,
    };
  }

  /** Reuses StudentsService — never re-implements the inactivation query. */
  inactiveStudentsReport() {
    return this.studentsService.findInactiveStudents();
  }
}
