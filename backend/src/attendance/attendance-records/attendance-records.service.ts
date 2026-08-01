import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AttendanceEventsService } from '../attendance-events/attendance-events.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';

const INACTIVATION_THRESHOLD = 5;
const UPCOMING_INACTIVE_THRESHOLD = 4; // one absence away from auto-inactivation
const WARNING_THRESHOLD = 2;

@Injectable()
export class AttendanceRecordsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private eventsService: AttendanceEventsService,
  ) {}

  /** Fast single-page recording for an entire class/day at once — no per-student navigation. */
  async recordBulk(dto: RecordAttendanceDto, userId: string) {
    const event = await this.eventsService.findOrCreate({
      date: dto.date,
      eventType: dto.eventType,
      title: dto.title,
    });

    const results = [];
    const autoInactivated: { studentId: string; fullName: string }[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (const entry of dto.entries) {
      const existing = await this.prisma.attendance.findUnique({
        where: { studentId_eventId: { studentId: entry.studentId, eventId: event.id } },
      });

      const record = await this.prisma.attendance.upsert({
        where: { studentId_eventId: { studentId: entry.studentId, eventId: event.id } },
        update: { status: entry.status, recordedById: userId },
        create: { studentId: entry.studentId, eventId: event.id, status: entry.status, recordedById: userId },
      });

      if (existing) updatedCount++;
      else createdCount++;

      await this.audit.log({
        userId,
        action: existing ? 'ATTENDANCE_UPDATED' : 'ATTENDANCE_RECORDED',
        entityType: 'Attendance',
        entityId: record.id,
        oldValue: existing,
        newValue: record,
      });

      results.push(record);

      // Automatic inactivation check — never deletes the student record, only flips status.
      if (entry.status === 'ABSENT') {
        const inactivated = await this.checkAndApplyInactivation(entry.studentId);
        if (inactivated) autoInactivated.push(inactivated);
      }
    }
    return { event, records: results, autoInactivated, createdCount, updatedCount };
  }

  /** Runs after every ABSENT mark; auto-inactivates on the 5th consecutive absence. */
  private async checkAndApplyInactivation(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.status !== 'ACTIVE') return null;

    const records = await this.prisma.attendance.findMany({
      where: { studentId },
      include: { event: true },
      orderBy: { event: { date: 'desc' } },
      take: INACTIVATION_THRESHOLD,
    });

    let consecutive = 0;
    let lastAttendanceDate: Date | null = null;
    for (const r of records) {
      if (r.status === 'ABSENT') consecutive++;
      else break;
    }
    const lastPresent = records.find((r) => r.status !== 'ABSENT');
    lastAttendanceDate = lastPresent?.event.date ?? null;

    if (consecutive >= INACTIVATION_THRESHOLD) {
      await this.prisma.student.update({ where: { id: studentId }, data: { status: 'INACTIVE' } });
      await this.prisma.inactivationRecord.create({
        data: {
          studentId,
          consecutiveAbsentDays: consecutive,
          lastAttendanceDate,
          reason: `${consecutive} consecutive absences`,
        },
      });
      await this.audit.log({
        action: 'STUDENT_AUTO_INACTIVATED',
        entityType: 'Student',
        entityId: studentId,
        newValue: { consecutiveAbsentDays: consecutive },
      });
      return { studentId, fullName: student.fullName };
    }
    return null;
  }

  /** Roster for the fast-entry page: all active students in a class with today's status pre-filled if it exists. */
  async getEntryRoster(classId: string | undefined, date: string) {
    const students = await this.prisma.student.findMany({
      where: { status: 'ACTIVE', classId },
      include: { class: true },
      orderBy: { fullName: 'asc' },
    });

    const day = new Date(date);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const existingRecords = await this.prisma.attendance.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        event: { date: { gte: start, lte: end } },
      },
    });
    const recordMap = new Map(existingRecords.map((r) => [r.studentId, r]));

    return students.map((s) => {
      const rec = recordMap.get(s.id);
      return {
        studentId: s.id,
        fullName: s.fullName,
        fullNameAmharic: s.fullNameAmharic,
        studentCode: s.studentCode,
        className: s.class.name,
        currentStatus: rec?.status ?? null,
        attendanceId: rec?.id ?? null,
        createdAt: rec?.createdAt ?? null,
        updatedAt: rec?.updatedAt ?? null,
      };
    });
  }

  async editAttendance(id: string, status: 'PRESENT' | 'ABSENT' | 'PERMISSION' | 'LATE', userId: string) {
    const existing = await this.prisma.attendance.findUnique({ where: { id } });
    const updated = await this.prisma.attendance.update({ where: { id }, data: { status, recordedById: userId } });
    await this.audit.log({
      userId, action: 'ATTENDANCE_UPDATED', entityType: 'Attendance', entityId: id, oldValue: existing, newValue: updated,
    });
    if (status === 'ABSENT' && existing) {
      await this.checkAndApplyInactivation(existing.studentId);
    }
    return updated;
  }

  async historyForStudent(studentId: string) {
    return this.prisma.attendance.findMany({
      where: { studentId },
      include: { event: true },
      orderBy: { event: { date: 'desc' } },
    });
  }

  /**
   * Warning levels (student stays ACTIVE until the 5-consecutive-absence
   * threshold triggers automatic inactivation elsewhere):
   * - 2-3 consecutive absences -> "warning"
   * - 4 consecutive absences -> "upcoming inactive" (one more absence away)
   */
  async getWarnings() {
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

      if (consecutive >= WARNING_THRESHOLD) {
        warnings.push({
          studentId: student.id,
          fullName: student.fullName,
          consecutiveAbsences: consecutive,
          level: consecutive >= UPCOMING_INACTIVE_THRESHOLD ? 'UPCOMING_INACTIVE' : 'WARNING',
        });
      }
    }
    return warnings;
  }

  /** Students who will be auto-inactivated on their next absence — used for the Saturday digest. */
  async getUpcomingInactive() {
    const all = await this.getWarnings();
    return all.filter((w) => w.level === 'UPCOMING_INACTIVE');
  }
}
