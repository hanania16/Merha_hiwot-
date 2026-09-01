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
    const { registrationDate, ...rest } = dto;
    const student = await this.prisma.student.create({
      data: {
        ...rest,
        studentCode,
        dateOfBirth: new Date(dto.dateOfBirth),
        registrationDate: registrationDate ? new Date(registrationDate) : undefined,
        createdById: userId,
      },
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

  async remove(id: string, userId: string) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Student not found');

    await this.prisma.$transaction([
      this.prisma.receipt.deleteMany({ where: { studentId: id } }),
      this.prisma.monthlyPayment.deleteMany({ where: { studentId: id } }),
      this.prisma.student.delete({ where: { id } }),
    ]);

    await this.audit.log({
      userId,
      action: 'STUDENT_DELETED',
      entityType: 'Student',
      entityId: id,
      oldValue: existing,
    });
    return { success: true };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        monthlyPayments: { where: { ethiopianYear: currentEthiopianYear() } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const paidMonths = student.monthlyPayments.filter((p) => p.status === 'PAID').length;

    return {
      ...student,
      age: calculateAge(student.dateOfBirth),
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

    const results = students.map((s) => ({ ...s, age: calculateAge(s.dateOfBirth) }));

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
      results.length = 0;
      results.push(...withFee.filter((s) => s.computedFeeStatus === query.feeStatus));
    }

    return { data: results, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  findClasses() {
    return this.prisma.classGroup.findMany({ include: { teachers: true } });
  }
}
