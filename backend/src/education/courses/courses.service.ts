import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassLevel, AcademicSemester } from '@prisma/client';

export interface CreateCourseDto {
  code: string;
  name: string;
  nameAmharic: string;
  classLevel: ClassLevel;
  targetGrade?: string;
  scheduleTime?: string;
  semester?: AcademicSemester;
  maxScore?: number;
  passScore?: number;
  description?: string;
  teacherId?: string;
}

export interface UpdateCourseDto {
  name?: string;
  nameAmharic?: string;
  classLevel?: ClassLevel;
  targetGrade?: string;
  scheduleTime?: string;
  semester?: AcademicSemester;
  maxScore?: number;
  passScore?: number;
  description?: string;
  teacherId?: string;
  isActive?: boolean;
}

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async findAll(classLevel?: ClassLevel) {
    const where = classLevel ? { classLevel, isActive: true } : { isActive: true };
    return this.prisma.course.findMany({
      where,
      include: {
        teacher: {
          select: { id: true, fullName: true, email: true },
        },
        _count: {
          select: { grades: true },
        },
      },
      orderBy: [{ classLevel: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        teacher: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(dto: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        nameAmharic: dto.nameAmharic.trim(),
        classLevel: dto.classLevel,
        targetGrade: dto.targetGrade?.trim(),
        scheduleTime: dto.scheduleTime?.trim(),
        semester: dto.semester || AcademicSemester.SEMESTER_1,
        maxScore: dto.maxScore ?? 100,
        passScore: dto.passScore ?? 50,
        description: dto.description?.trim(),
        teacherId: dto.teacherId || null,
      },
    });
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findOne(id);
    return this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.nameAmharic && { nameAmharic: dto.nameAmharic.trim() }),
        ...(dto.classLevel && { classLevel: dto.classLevel }),
        ...(dto.targetGrade !== undefined && { targetGrade: dto.targetGrade?.trim() || null }),
        ...(dto.scheduleTime !== undefined && { scheduleTime: dto.scheduleTime?.trim() || null }),
        ...(dto.semester && { semester: dto.semester }),
        ...(dto.maxScore !== undefined && { maxScore: dto.maxScore }),
        ...(dto.passScore !== undefined && { passScore: dto.passScore }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.teacherId !== undefined && { teacherId: dto.teacherId || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.course.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
