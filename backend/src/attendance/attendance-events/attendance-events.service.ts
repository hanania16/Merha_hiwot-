import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class AttendanceEventsService {
  constructor(private prisma: PrismaService) {}

  /** Attendance works on ANY calendar day — not restricted to Sundays. */
  async findOrCreate(dto: CreateEventDto) {
    return this.prisma.attendanceEvent.upsert({
      where: {
        date_eventType_title: {
          date: new Date(dto.date),
          eventType: dto.eventType ?? 'SUNDAY_SCHOOL',
          title: dto.title ?? '',
        },
      },
      update: {},
      create: {
        date: new Date(dto.date),
        eventType: dto.eventType ?? 'SUNDAY_SCHOOL',
        title: dto.title,
      },
    });
  }

  /** Full monthly calendar view: which days have recorded events. */
  async findForMonth(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    return this.prisma.attendanceEvent.findMany({
      where: { date: { gte: start, lte: end } },
      include: { _count: { select: { records: true } } },
      orderBy: { date: 'asc' },
    });
  }

  async findByDate(date: string) {
    const day = new Date(date);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return this.prisma.attendanceEvent.findMany({ where: { date: { gte: start, lte: end } } });
  }
}
