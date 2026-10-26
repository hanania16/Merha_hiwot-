import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import {
  CreateBehaviorRecordDto,
  ToggleSuspensionDto,
  UpdateBehaviorStatusDto,
} from './dto/behavior-student.dto';
import {
  CreateClassDto,
  UpdateClassDto,
  BulkCreateStudentsDto,
} from './dto/class.dto';
import { currentEthiopianYear } from '../common/constants/ethiopian-calendar';
import { BehaviorRecordType, BehaviorStatus, StudentStatus } from '@prisma/client';

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
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        suspensionDate: dto.suspensionDate ? new Date(dto.suspensionDate) : undefined,
        suspensionEndDate: dto.suspensionEndDate ? new Date(dto.suspensionEndDate) : undefined,
      },
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
  async setStatus(id: string, status: StudentStatus, userId: string) {
    return this.update(id, { status } as UpdateStudentDto, userId);
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Student not found');

    await this.prisma.$transaction([
      this.prisma.studentBehaviorRecord.deleteMany({ where: { studentId: id } }),
      this.prisma.receipt.deleteMany({ where: { studentId: id } }),
      this.prisma.monthlyPayment.deleteMany({ where: { studentId: id } }),
      this.prisma.studentGrade.deleteMany({ where: { studentId: id } }),
      this.prisma.certificateRecord.deleteMany({ where: { studentId: id } }),
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
        grades: {
          include: {
            course: {
              select: { id: true, code: true, name: true, nameAmharic: true, targetGrade: true, scheduleTime: true },
            },
            submittedBy: { select: { id: true, fullName: true } },
            approvedBy: { select: { id: true, fullName: true } },
          },
          orderBy: [{ ethiopianYear: 'desc' }, { semester: 'asc' }],
        },
        certificates: {
          orderBy: { createdAt: 'desc' },
        },
        behaviorRecords: {
          include: {
            reportedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { incidentDate: 'desc' },
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const paidMonths = student.monthlyPayments.filter((p) => p.status === 'PAID').length;
    const totalGrades = student.grades?.length || 0;
    const avgScore =
      totalGrades > 0
        ? Math.round(student.grades.reduce((sum, g) => sum + Number(g.totalScore), 0) / totalGrades)
        : null;

    return {
      ...student,
      age: calculateAge(student.dateOfBirth),
      avgScore,
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
    const pageSize = query.limit ?? query.pageSize ?? 50;

    const where: any = {
      classId: query.classId,
      class: query.classLevel ? { level: query.classLevel } : undefined,
      gender: query.gender,
      status: query.status,
      behaviorStatus: query.behaviorStatus,
      isSuspended: query.isSuspended !== undefined ? query.isSuspended : undefined,
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
        include: {
          class: true,
          grades: {
            select: {
              id: true,
              totalScore: true,
              letterGrade: true,
              status: true,
              course: { select: { nameAmharic: true, code: true } },
            },
          },
          behaviorRecords: {
            take: 3,
            orderBy: { incidentDate: 'desc' },
            include: { reportedBy: { select: { id: true, fullName: true } } },
          },
          _count: {
            select: {
              grades: true,
              certificates: true,
              behaviorRecords: true,
            },
          },
        },
        orderBy: { fullName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const results = students.map((s) => {
      const totalGrades = s.grades?.length || 0;
      const avgScore =
        totalGrades > 0
          ? Math.round(s.grades.reduce((sum, g) => sum + Number(g.totalScore), 0) / totalGrades)
          : null;
      return { ...s, age: calculateAge(s.dateOfBirth), avgScore };
    });

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

  async findClasses(includeInactive = false) {
    return this.prisma.classGroup.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        teachers: { select: { id: true, fullName: true, phone: true, email: true, role: true } },
        _count: { select: { students: true } },
      },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
    });
  }

  async findClassById(id: string) {
    const classGroup = await this.prisma.classGroup.findUnique({
      where: { id },
      include: {
        teachers: { select: { id: true, fullName: true, phone: true, email: true, role: true } },
        _count: { select: { students: true } },
      },
    });
    if (!classGroup) throw new NotFoundException('Class not found');
    return classGroup;
  }

  async createClass(dto: CreateClassDto, userId: string) {
    const { teacherIds, ...data } = dto;
    const classGroup = await this.prisma.classGroup.create({
      data: {
        ...data,
        teachers:
          teacherIds && teacherIds.length > 0
            ? { connect: teacherIds.map((tid) => ({ id: tid })) }
            : undefined,
      },
      include: {
        teachers: { select: { id: true, fullName: true, phone: true, email: true, role: true } },
        _count: { select: { students: true } },
      },
    });

    await this.audit.log({
      userId,
      action: 'CLASS_CREATED',
      entityType: 'ClassGroup',
      entityId: classGroup.id,
      newValue: classGroup,
    });

    return classGroup;
  }

  async updateClass(id: string, dto: UpdateClassDto, userId: string) {
    const existing = await this.prisma.classGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Class not found');

    const { teacherIds, ...data } = dto;
    const updated = await this.prisma.classGroup.update({
      where: { id },
      data: {
        ...data,
        teachers: teacherIds
          ? { set: teacherIds.map((tid) => ({ id: tid })) }
          : undefined,
      },
      include: {
        teachers: { select: { id: true, fullName: true, phone: true, email: true, role: true } },
        _count: { select: { students: true } },
      },
    });

    await this.audit.log({
      userId,
      action: 'CLASS_UPDATED',
      entityType: 'ClassGroup',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });

    return updated;
  }

  async deleteClass(id: string, userId: string) {
    const existing = await this.prisma.classGroup.findUnique({
      where: { id },
      include: { _count: { select: { students: true } } },
    });
    if (!existing) throw new NotFoundException('Class not found');

    if (existing._count.students > 0) {
      throw new BadRequestException(
        `ይህንን ክፍል ማጥፋት አይቻልም፤ ${existing._count.students} ተማሪዎች ተመዝግበውበታል። እባክዎ መጀመሪያ ተማሪዎቹን ወደ ሌላ ክፍል ያዛውሩ። (Cannot delete class with ${existing._count.students} enrolled students. Please reassign them first.)`,
      );
    }

    await this.prisma.classGroup.delete({ where: { id } });

    await this.audit.log({
      userId,
      action: 'CLASS_DELETED',
      entityType: 'ClassGroup',
      entityId: id,
      oldValue: existing,
    });

    return { success: true, message: 'Class deleted successfully' };
  }

  async bulkCreate(dto: BulkCreateStudentsDto, userId: string) {
    if (!dto.students || dto.students.length === 0) {
      throw new BadRequestException('No student records provided in bulk request');
    }

    const createdList = [];
    for (const item of dto.students) {
      const studentCode = await this.nextStudentCode();
      const { registrationDate, ...rest } = item;
      const student = await this.prisma.student.create({
        data: {
          ...rest,
          studentCode,
          dateOfBirth: new Date(item.dateOfBirth),
          registrationDate: registrationDate ? new Date(registrationDate) : undefined,
          createdById: userId,
        },
        include: { class: true },
      });
      createdList.push({
        ...student,
        age: calculateAge(student.dateOfBirth),
      });
    }

    await this.audit.log({
      userId,
      action: 'STUDENTS_BULK_CREATED',
      entityType: 'Student',
      entityId: 'bulk',
      newValue: { count: createdList.length },
    });

    return {
      success: true,
      count: createdList.length,
      students: createdList,
    };
  }

  // --------------------------------------------------------------------------
  // BEHAVIOR & DISCIPLINE MANAGEMENT
  // --------------------------------------------------------------------------

  async getBehaviorRecords(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    return this.prisma.studentBehaviorRecord.findMany({
      where: { studentId },
      include: {
        reportedBy: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { incidentDate: 'desc' },
    });
  }

  async addBehaviorRecord(studentId: string, dto: CreateBehaviorRecordDto, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    const record = await this.prisma.studentBehaviorRecord.create({
      data: {
        studentId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        actionTaken: dto.actionTaken,
        incidentDate: dto.incidentDate ? new Date(dto.incidentDate) : new Date(),
        ethiopianYear: dto.ethiopianYear || currentEthiopianYear(),
        reportedById: userId,
      },
      include: {
        reportedBy: { select: { id: true, fullName: true, role: true } },
      },
    });

    // Auto update behavior status or suspension flags if applicable
    let behaviorStatusUpdate: BehaviorStatus | undefined;
    let isSuspendedUpdate: boolean | undefined;
    let suspensionReasonUpdate: string | null | undefined;

    if (dto.type === BehaviorRecordType.SUSPENSION) {
      behaviorStatusUpdate = BehaviorStatus.SUSPENDED;
      isSuspendedUpdate = true;
      suspensionReasonUpdate = dto.description;
    } else if (dto.type === BehaviorRecordType.WARNING && student.behaviorStatus !== BehaviorStatus.SUSPENDED) {
      behaviorStatusUpdate = BehaviorStatus.WARNING;
    } else if (dto.type === BehaviorRecordType.COMMENDATION && student.behaviorStatus !== BehaviorStatus.SUSPENDED) {
      behaviorStatusUpdate = BehaviorStatus.EXCELLENT;
    }

    if (behaviorStatusUpdate || isSuspendedUpdate !== undefined) {
      await this.prisma.student.update({
        where: { id: studentId },
        data: {
          behaviorStatus: behaviorStatusUpdate,
          isSuspended: isSuspendedUpdate,
          status: isSuspendedUpdate ? StudentStatus.SUSPENDED : undefined,
          suspensionReason: suspensionReasonUpdate,
          suspensionDate: isSuspendedUpdate ? new Date() : undefined,
        },
      });
    }

    await this.audit.log({
      userId,
      action: 'STUDENT_BEHAVIOR_LOGGED',
      entityType: 'StudentBehaviorRecord',
      entityId: record.id,
      newValue: record,
    });

    return record;
  }

  async toggleSuspension(studentId: string, dto: ToggleSuspensionDto, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    const isSuspended = dto.isSuspended;
    const now = new Date();

    const updated = await this.prisma.student.update({
      where: { id: studentId },
      data: {
        isSuspended,
        status: isSuspended ? StudentStatus.SUSPENDED : StudentStatus.ACTIVE,
        behaviorStatus: isSuspended ? BehaviorStatus.SUSPENDED : BehaviorStatus.GOOD,
        suspensionReason: isSuspended ? dto.suspensionReason || 'የዲሲፕሊን እገዳ' : null,
        suspensionDate: isSuspended ? now : null,
        suspensionEndDate: isSuspended && dto.suspensionEndDate ? new Date(dto.suspensionEndDate) : null,
      },
      include: { class: true },
    });

    // Log a behavior record for the action
    await this.prisma.studentBehaviorRecord.create({
      data: {
        studentId,
        type: isSuspended ? BehaviorRecordType.SUSPENSION : BehaviorRecordType.GENERAL_NOTE,
        title: isSuspended ? 'የተማሪ እገዳ ተጥሏል (Suspension Issued)' : 'የተማሪ እገዳ ተነስቷል (Suspension Lifted)',
        description: isSuspended
          ? dto.suspensionReason || 'ተማሪው ከሰንበት ት/ቤት በዲሲፕሊን ምክንያት ታግዷል።'
          : 'ተማሪው የነበረበት እገዳ ተነስቶ ወደ መደበኛ ትምህርት ተመልሷል።',
        actionTaken: isSuspended ? 'እገዳ ተጥሏል' : 'እገዳ ተነስቷል',
        incidentDate: now,
        reportedById: userId,
        ethiopianYear: currentEthiopianYear(),
      },
    });

    await this.audit.log({
      userId,
      action: isSuspended ? 'STUDENT_SUSPENDED' : 'STUDENT_UNSUSPENDED',
      entityType: 'Student',
      entityId: studentId,
      oldValue: { isSuspended: student.isSuspended, status: student.status },
      newValue: { isSuspended, status: updated.status },
    });

    return { ...updated, age: calculateAge(updated.dateOfBirth) };
  }

  async updateBehaviorStatus(studentId: string, dto: UpdateBehaviorStatusDto, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    const isSuspended = dto.behaviorStatus === BehaviorStatus.SUSPENDED;

    const updated = await this.prisma.student.update({
      where: { id: studentId },
      data: {
        behaviorStatus: dto.behaviorStatus,
        isSuspended,
        status: isSuspended ? StudentStatus.SUSPENDED : student.status === StudentStatus.SUSPENDED ? StudentStatus.ACTIVE : student.status,
      },
      include: { class: true },
    });

    await this.audit.log({
      userId,
      action: 'STUDENT_BEHAVIOR_STATUS_UPDATED',
      entityType: 'Student',
      entityId: studentId,
      newValue: dto.behaviorStatus,
    });

    return { ...updated, age: calculateAge(updated.dateOfBirth) };
  }
}
