import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AttendanceAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async attendanceTrend(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await this.prisma.attendanceEvent.findMany({
      where: { date: { gte: since } },
      include: { records: true },
      orderBy: { date: 'asc' },
    });

    return events.map((e) => {
      const present = e.records.filter((r) => r.status === 'PRESENT').length;
      const total = e.records.length;
      return {
        date: e.date.toISOString().slice(0, 10),
        present,
        absent: e.records.filter((r) => r.status === 'ABSENT').length,
        permission: e.records.filter((r) => r.status === 'PERMISSION').length,
        attendancePercentage: total ? Math.round((present / total) * 1000) / 10 : 0,
      };
    });
  }

  async attendanceByClass() {
    const classes = await this.prisma.classGroup.findMany({
      include: { students: { where: { status: 'ACTIVE' } } },
    });

    const results = [];
    for (const cls of classes) {
      const studentIds = cls.students.map((s) => s.id);
      const records = await this.prisma.attendance.findMany({ where: { studentId: { in: studentIds } } });
      const present = records.filter((r) => r.status === 'PRESENT').length;
      results.push({
        className: cls.name,
        attendancePercentage: records.length ? Math.round((present / records.length) * 1000) / 10 : 0,
        present,
        absent: records.filter((r) => r.status === 'ABSENT').length,
      });
    }
    return results;
  }

  async presentVsAbsent(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const records = await this.prisma.attendance.findMany({ where: { event: { date: { gte: since } } } });
    return {
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      permission: records.filter((r) => r.status === 'PERMISSION').length,
    };
  }

  async registrationTrend(months = 12) {
    const since = new Date();
    since.setMonth(since.getMonth() - months + 1);
    since.setDate(1);

    const students = await this.prisma.student.findMany({
      where: { registrationDate: { gte: since } },
      select: { registrationDate: true },
    });

    const buckets: Record<string, number> = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(since);
      d.setMonth(since.getMonth() + i);
      buckets[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    for (const s of students) {
      const key = `${s.registrationDate.getFullYear()}-${String(s.registrationDate.getMonth() + 1).padStart(2, '0')}`;
      if (key in buckets) buckets[key]++;
    }
    return Object.entries(buckets).map(([month, count]) => ({ month, count }));
  }

  /** Buckets active students by consecutive-absence length: 1-3, 4-6, 7-12 days. */
  async absenceBuckets() {
    const students = await this.prisma.student.findMany({ where: { status: 'ACTIVE' } });
    const buckets = { days1to3: 0, days4to6: 0, days7to12: 0 };

    for (const s of students) {
      const records = await this.prisma.attendance.findMany({
        where: { studentId: s.id },
        include: { event: true },
        orderBy: { event: { date: 'desc' } },
        take: 12,
      });
      let consecutive = 0;
      for (const r of records) {
        if (r.status === 'ABSENT') consecutive++;
        else break;
      }
      if (consecutive >= 1 && consecutive <= 3) buckets.days1to3++;
      else if (consecutive >= 4 && consecutive <= 6) buckets.days4to6++;
      else if (consecutive >= 7 && consecutive <= 12) buckets.days7to12++;
    }
    return buckets;
  }

  async mostFrequentlyAbsent(limit = 10, minAbsences = 2) {
    const students = await this.prisma.student.findMany({ where: { status: 'ACTIVE' } });
    const results = [];
    for (const s of students) {
      const absentCount = await this.prisma.attendance.count({ where: { studentId: s.id, status: 'ABSENT' } });
      if (absentCount >= minAbsences) {
        results.push({
          studentId: s.id,
          fullName: s.fullName,
          studentPhone: s.studentPhone,
          parentPhone: s.parentPhone,
          absentCount,
        });
      }
    }
    return results.sort((a, b) => b.absentCount - a.absentCount).slice(0, limit);
  }
}
