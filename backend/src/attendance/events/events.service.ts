import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateEventDto } from './dto/create-event.dto';
import { RecordEventAttendanceDto } from './dto/record-event-attendance.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll() {
    const events = await this.prisma.event.findMany({ orderBy: { date: 'desc' } });
    const results = [];
    for (const e of events) {
      const studentCount = e.participatingClassIds.length
        ? await this.prisma.student.count({ where: { classId: { in: e.participatingClassIds }, status: 'ACTIVE' } })
        : await this.prisma.student.count({ where: { status: 'ACTIVE' } });
      const attendanceCount = await this.prisma.eventAttendance.count({
        where: { eventId: e.id, status: { in: ['PRESENT', 'LATE'] } },
      });
      results.push({ ...e, studentCount, attendanceCount });
    }
    return results;
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { attendance: { include: { student: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async create(dto: CreateEventDto, userId: string) {
    const event = await this.prisma.event.create({
      data: { ...dto, date: new Date(dto.date), participatingClassIds: dto.participatingClassIds ?? [] },
    });
    await this.audit.log({ userId, action: 'EVENT_CREATED', entityType: 'Event', entityId: event.id, newValue: event });
    return event;
  }

  async update(id: string, dto: Partial<CreateEventDto>, userId: string) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');
    const updated = await this.prisma.event.update({
      where: { id },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
    });
    await this.audit.log({ userId, action: 'EVENT_UPDATED', entityType: 'Event', entityId: id, oldValue: existing, newValue: updated });
    return updated;
  }

  async recordAttendance(eventId: string, dto: RecordEventAttendanceDto, userId: string) {
    const results = [];
    for (const entry of dto.entries) {
      const record = await this.prisma.eventAttendance.upsert({
        where: { eventId_studentId: { eventId, studentId: entry.studentId } },
        update: { status: entry.status },
        create: { eventId, studentId: entry.studentId, status: entry.status },
      });
      results.push(record);
    }
    await this.audit.log({ userId, action: 'EVENT_ATTENDANCE_RECORDED', entityType: 'Event', entityId: eventId, newValue: { count: results.length } });
    return results;
  }

  /** Student participation report: how many events each active student attended. */
  async participationReport() {
    const students = await this.prisma.student.findMany({ where: { status: 'ACTIVE' } });
    const totalEvents = await this.prisma.event.count();

    const results = [];
    for (const s of students) {
      const attended = await this.prisma.eventAttendance.count({
        where: { studentId: s.id, status: { in: ['PRESENT', 'LATE'] } },
      });
      if (attended > 0) {
        results.push({ studentId: s.id, fullName: s.fullName, eventsAttended: attended, totalEvents });
      }
    }
    return results.sort((a, b) => b.eventsAttended - a.eventsAttended);
  }
}
