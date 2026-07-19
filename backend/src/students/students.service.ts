import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { currentEthiopianYear } from '../common/constants/ethiopian-calendar';

function calculateAge(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private async nextStudentCode(): Promise<string> {
    const count = await this.prisma.student.count();
    return `MH-${String(count + 1).padStart(4, '0')}`;
  }

  async create(dto: CreateStudentDto, userId: string) {
    const studentCode = await this.nextStudentCode();
    const student = await this.prisma.student.create({
      data: { ...dto, studentCode, dateOfBirth: new Date(dto.dateOfBirth), createdById: userId },
      include: { class: true },
    });
    await this.audit.log({
      userId,
      action: 'STUDENT_CREATED',
      entityType: 'Student',
      entityId: student.id,
      newValue: student,
    });
    return { ...student, age: calculateAge(student.dateOfBirth) };
  }

  async update(id: string, dto: UpdateStudentDto, userId: string) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Student not found');

    const updated = await this.prisma.student.update({
      where: { id },
      data: { ...dto, dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined },
      include: { class: true },
    });

    await this.audit.log({
      userId,
      action: 'STUDENT_UPDATED',
      entityType: 'Student',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });
    return { ...updated, age: calculateAge(updated.dateOfBirth) };
  }

  /** Never deletes; toggling status is the only supported deactivation path. Manual override of the automatic inactivation. */
  async setStatus(id: string, status: 'ACTIVE' | 'INACTIVE', userId: string) {
    return this.update(id, { status } as UpdateStudentDto, userId);
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        monthlyPayments: { where: { ethiopianYear: currentEthiopianYear() } },
        inactivations: { orderBy: { dateMarkedInactive: 'desc' }, take: 1 },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const attendance = await this.prisma.attendance.findMany({
      where: { studentId: id },
      include: { event: true },
      orderBy: { event: { date: 'desc' } },
    });

    const presentCount = attendance.filter((a) => a.status === 'PRESENT').length;
    const absentCount = attendance.filter((a) => a.status === 'ABSENT').length;
    const permissionCount = attendance.filter((a) => a.status === 'PERMISSION').length;
    const lateCount = attendance.filter((a) => a.status === 'LATE').length;
    const attendancePercentage = attendance.length
      ? Math.round(((presentCount + lateCount) / attendance.length) * 1000) / 10
      : 0;

    const consecutiveAbsences = this.countConsecutiveAbsences(attendance);
    const paidMonths = student.monthlyPayments.filter((p) => p.status === 'PAID').length;

    return {
      ...student,
      age: calculateAge(student.dateOfBirth),
      attendanceHistory: attendance.map((a) => ({
        date: a.event.date,
        eventType: a.event.eventType,
        title: a.event.title,
        status: a.status,
      })),
      attendancePercentage,
      presentCount,
      absentCount,
      permissionCount,
      lateCount,
      consecutiveAbsenceCount: consecutiveAbsences,
      latestInactivation: student.inactivations[0] ?? null,
      feeStatus: {
        status: paidMonths === 13 ? 'PAID' : paidMonths === 0 ? 'UNPAID' : 'PARTIAL',
        unpaidMonths: 13 - paidMonths,
        lastPaidMonth:
          student.monthlyPayments
            .filter((p) => p.status === 'PAID')
            .sort((a, b) => (b.paidDate?.getTime() ?? 0) - (a.paidDate?.getTime() ?? 0))[0]?.month ?? null,
      },
    };
  }

  private countConsecutiveAbsences(attendance: { status: string; event: { date: Date } }[]): number {
    const sorted = [...attendance].sort((a, b) => b.event.date.getTime() - a.event.date.getTime());
    let count = 0;
    for (const record of sorted) {
      if (record.status === 'ABSENT') count++;
      else break;
    }
    return count;
  }

  async findAll(query: QueryStudentDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where = {
      classId: query.classId,
      gender: query.gender,
      status: query.status,
      OR: query.search
        ? [
            { fullName: { contains: query.search, mode: 'insensitive' as const } },
            { fullNameAmharic: { contains: query.search, mode: 'insensitive' as const } },
            { parentName: { contains: query.search, mode: 'insensitive' as const } },
            { parentPhone: { contains: query.search, mode: 'insensitive' as const } },
            { studentCode: { contains: query.search, mode: 'insensitive' as const } },
          ]
        : undefined,
      registrationDate: {
        gte: query.registeredFrom ? new Date(query.registeredFrom) : undefined,
        lte: query.registeredTo ? new Date(query.registeredTo) : undefined,
      },
    };

    const [total, students] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        include: { class: true },
        orderBy: { fullName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    let results = students.map((s) => ({ ...s, age: calculateAge(s.dateOfBirth) }));

    if (query.feeStatus) {
      const ethiopianYear = currentEthiopianYear();
      const withFee = await Promise.all(
        results.map(async (s) => {
          const paid = await this.prisma.monthlyPayment.count({
            where: { studentId: s.id, ethiopianYear, status: 'PAID' },
          });
          const status = paid === 13 ? 'PAID' : paid === 0 ? 'UNPAID' : 'PARTIAL';
          return { ...s, computedFeeStatus: status };
        }),
      );
      results = withFee.filter((s) => s.computedFeeStatus === query.feeStatus);
    }

    return { data: results, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  findClasses() {
    return this.prisma.classGroup.findMany({ include: { teachers: true } });
  }

  /** Inactive Students section: full history of automatic + manual inactivations. */
  async findInactiveStudents() {
    const students = await this.prisma.student.findMany({
      where: { status: 'INACTIVE' },
      include: { class: true, inactivations: { orderBy: { dateMarkedInactive: 'desc' }, take: 1 } },
      orderBy: { fullName: 'asc' },
    });
    return students.map((s) => ({
      studentId: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      className: s.class.name,
      consecutiveAbsentDays: s.inactivations[0]?.consecutiveAbsentDays ?? null,
      lastAttendanceDate: s.inactivations[0]?.lastAttendanceDate ?? null,
      dateMarkedInactive: s.inactivations[0]?.dateMarkedInactive ?? null,
      reason: s.inactivations[0]?.reason ?? 'Manually deactivated',
    }));
  }
}
