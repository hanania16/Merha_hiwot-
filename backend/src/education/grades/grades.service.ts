import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassLevel, AcademicSemester, GradeStatus } from '@prisma/client';

export interface SubmitGradeItemDto {
  studentId: string;
  courseId: string;
  ethiopianYear?: number;
  semester?: AcademicSemester;
  assessmentScore?: number;
  midExamScore?: number;
  finalExamScore?: number;
  conductScore?: number;
  remarks?: string;
  teacherSignature?: string;
  status?: GradeStatus;
}

export interface BatchSubmitGradesDto {
  courseId: string;
  ethiopianYear: number;
  semester: AcademicSemester;
  teacherSignature?: string;
  grades: {
    studentId: string;
    assessmentScore?: number;
    midExamScore?: number;
    finalExamScore?: number;
    conductScore?: number;
    remarks?: string;
  }[];
  submitForApproval?: boolean;
}

export function computeGrade(total: number): string {
  if (total >= 95) return 'A+';
  if (total >= 90) return 'A';
  if (total >= 85) return 'A-';
  if (total >= 80) return 'B+';
  if (total >= 75) return 'B';
  if (total >= 70) return 'B-';
  if (total >= 65) return 'C+';
  if (total >= 50) return 'C';
  if (total >= 40) return 'D';
  return 'F';
}

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  async getGrades(query: {
    classLevel?: ClassLevel;
    courseId?: string;
    ethiopianYear?: number;
    semester?: AcademicSemester;
    studentId?: string;
  }) {
    const year = query.ethiopianYear ? Number(query.ethiopianYear) : 2018;
    const semester = query.semester || AcademicSemester.SEMESTER_1;

    const where: any = {
      ethiopianYear: year,
      semester,
    };

    if (query.courseId) {
      where.courseId = query.courseId;
    }

    if (query.studentId) {
      where.studentId = query.studentId;
    }

    if (query.classLevel) {
      where.student = {
        class: {
          level: query.classLevel,
        },
      };
    }

    const grades = await this.prisma.studentGrade.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            fullNameAmharic: true,
            gender: true,
            class: { select: { id: true, name: true, level: true } },
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAmharic: true,
            classLevel: true,
            maxScore: true,
            passScore: true,
          },
        },
        submittedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ totalScore: 'desc' }],
    });

    return grades;
  }

  async submitSingleGrade(dto: SubmitGradeItemDto, userId: string) {
    const ethiopianYear = dto.ethiopianYear ?? 2018;
    const semester = dto.semester ?? AcademicSemester.SEMESTER_1;
    const assessment = dto.assessmentScore ?? 0;
    const mid = dto.midExamScore ?? 0;
    const final = dto.finalExamScore ?? 0;
    const conduct = dto.conductScore ?? 0;
    const totalScore = Math.min(100, Math.max(0, assessment + mid + final + conduct));
    const letterGrade = computeGrade(totalScore);

    const grade = await this.prisma.studentGrade.upsert({
      where: {
        studentId_courseId_ethiopianYear_semester: {
          studentId: dto.studentId,
          courseId: dto.courseId,
          ethiopianYear,
          semester,
        },
      },
      update: {
        assessmentScore: assessment,
        midExamScore: mid,
        finalExamScore: final,
        conductScore: conduct,
        totalScore,
        letterGrade,
        status: dto.status ?? GradeStatus.SUBMITTED,
        remarks: dto.remarks?.trim(),
        teacherSignature: dto.teacherSignature || undefined,
        submittedById: userId,
      },
      create: {
        studentId: dto.studentId,
        courseId: dto.courseId,
        ethiopianYear,
        semester,
        assessmentScore: assessment,
        midExamScore: mid,
        finalExamScore: final,
        conductScore: conduct,
        totalScore,
        letterGrade,
        status: dto.status ?? GradeStatus.SUBMITTED,
        remarks: dto.remarks?.trim(),
        teacherSignature: dto.teacherSignature || null,
        submittedById: userId,
      },
      include: {
        student: { select: { fullName: true, fullNameAmharic: true } },
        course: { select: { name: true, nameAmharic: true } },
      },
    });

    await this.recalculateRanks(dto.courseId, ethiopianYear, semester);
    return grade;
  }

  async batchSubmitGrades(dto: BatchSubmitGradesDto, userId: string) {
    const ethiopianYear = dto.ethiopianYear ?? 2018;
    const semester = dto.semester ?? AcademicSemester.SEMESTER_1;
    const status = dto.submitForApproval ? GradeStatus.SUBMITTED : GradeStatus.DRAFT;

    const results = [];
    for (const item of dto.grades) {
      const assessment = item.assessmentScore ?? 0;
      const mid = item.midExamScore ?? 0;
      const final = item.finalExamScore ?? 0;
      const conduct = item.conductScore ?? 0;
      const totalScore = Math.min(100, Math.max(0, assessment + mid + final + conduct));
      const letterGrade = computeGrade(totalScore);

      const record = await this.prisma.studentGrade.upsert({
        where: {
          studentId_courseId_ethiopianYear_semester: {
            studentId: item.studentId,
            courseId: dto.courseId,
            ethiopianYear,
            semester,
          },
        },
        update: {
          assessmentScore: assessment,
          midExamScore: mid,
          finalExamScore: final,
          conductScore: conduct,
          totalScore,
          letterGrade,
          status,
          remarks: item.remarks?.trim(),
          ...(dto.teacherSignature && { teacherSignature: dto.teacherSignature }),
          submittedById: userId,
        },
        create: {
          studentId: item.studentId,
          courseId: dto.courseId,
          ethiopianYear,
          semester,
          assessmentScore: assessment,
          midExamScore: mid,
          finalExamScore: final,
          conductScore: conduct,
          totalScore,
          letterGrade,
          status,
          remarks: item.remarks?.trim(),
          teacherSignature: dto.teacherSignature || null,
          submittedById: userId,
        },
      });
      results.push(record);
    }

    await this.recalculateRanks(dto.courseId, ethiopianYear, semester);
    return { count: results.length, grades: results };
  }

  private async recalculateRanks(courseId: string, ethiopianYear: number, semester: AcademicSemester) {
    const all = await this.prisma.studentGrade.findMany({
      where: { courseId, ethiopianYear, semester },
      orderBy: { totalScore: 'desc' },
      select: { id: true, totalScore: true },
    });

    let currentRank = 1;
    for (let i = 0; i < all.length; i++) {
      if (i > 0 && Number(all[i].totalScore) < Number(all[i - 1].totalScore)) {
        currentRank = i + 1;
      }
      await this.prisma.studentGrade.update({
        where: { id: all[i].id },
        data: { rank: currentRank },
      });
    }
  }

  async approveGrades(gradeIds: string[], userId: string) {
    return this.prisma.studentGrade.updateMany({
      where: { id: { in: gradeIds } },
      data: {
        status: GradeStatus.APPROVED,
        approvedById: userId,
      },
    });
  }

  async getReportCard(
    studentId: string,
    ethiopianYear = 2018,
    semester: AcademicSemester = AcademicSemester.SEMESTER_1,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const grades = await this.prisma.studentGrade.findMany({
      where: {
        studentId,
        ethiopianYear,
        semester,
      },
      include: {
        course: true,
      },
      orderBy: { course: { code: 'asc' } },
    });

    const totalCourses = grades.length;
    const totalScoreSum = grades.reduce((acc, g) => acc + Number(g.totalScore), 0);
    const averageScore = totalCourses > 0 ? Number((totalScoreSum / totalCourses).toFixed(2)) : 0;
    const overallGrade = computeGrade(averageScore);

    return {
      student,
      ethiopianYear,
      semester,
      grades,
      totalCourses,
      totalScoreSum,
      averageScore,
      overallGrade,
      conductScore: grades.length > 0 ? grades[0].conductScore : 10,
    };
  }
}
