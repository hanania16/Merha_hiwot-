import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AttendanceNotificationsService {
  constructor(private prisma: PrismaService) {}

  create(type: 'ATTENDANCE_WARNING' | 'LONG_ABSENCE', title: string, message: string, metadata?: Record<string, unknown>) {
    return this.prisma.notification.create({ data: { type, title, message, metadata: metadata as any } });
  }

  /** Recomputes attendance-warning notifications; intended to run on a schedule after each recording session. */
  async refreshAttendanceWarnings() {
    const students = await this.prisma.student.findMany({ where: { status: 'ACTIVE' } });
    const created = [];

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

      if (consecutive >= 2 && consecutive <= 3) {
        created.push(
          await this.create(
            'ATTENDANCE_WARNING',
            'Attendance warning',
            `${student.fullName} has been absent ${consecutive} consecutive attendance days.`,
            { studentId: student.id, consecutive },
          ),
        );
      } else if (consecutive > 3) {
        created.push(
          await this.create(
            'LONG_ABSENCE',
            'Long consecutive absence',
            `${student.fullName} has been absent ${consecutive} consecutive attendance days.`,
            { studentId: student.id, consecutive },
          ),
        );
      }
    }
    return created;
  }

  findAll(unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        isRead: unreadOnly ? false : undefined,
        type: { in: ['ATTENDANCE_WARNING', 'LONG_ABSENCE'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
