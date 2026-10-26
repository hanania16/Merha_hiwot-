import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GradeStatus } from '@prisma/client';

@Injectable()
export class EducationDashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalStudents,
      totalCourses,
      totalGrades,
      approvedGrades,
      submittedGrades,
      draftGrades,
      totalCertificates,
      recentMessages,
      recentGrades,
      classGroups,
    ] = await Promise.all([
      this.prisma.student.count({ where: { status: 'ACTIVE' } }),
      this.prisma.course.count({ where: { isActive: true } }),
      this.prisma.studentGrade.count(),
      this.prisma.studentGrade.count({ where: { status: GradeStatus.APPROVED } }),
      this.prisma.studentGrade.count({ where: { status: GradeStatus.SUBMITTED } }),
      this.prisma.studentGrade.count({ where: { status: GradeStatus.DRAFT } }),
      this.prisma.certificateRecord.count(),
      this.prisma.departmentMessage.findMany({
        take: 5,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          sender: { select: { fullName: true, role: true } },
        },
      }),
      this.prisma.studentGrade.findMany({
        take: 8,
        orderBy: { updatedAt: 'desc' },
        include: {
          student: { select: { fullName: true, fullNameAmharic: true, studentCode: true } },
          course: { select: { name: true, nameAmharic: true, code: true } },
        },
      }),
      this.prisma.classGroup.findMany({
        where: { isActive: true },
        include: {
          teachers: { select: { id: true, fullName: true } },
          _count: { select: { students: true } },
        },
        orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
      }),
    ]);

    // Calculate overall average and pass rate
    const allGrades = await this.prisma.studentGrade.findMany({
      select: { totalScore: true },
    });
    const totalCount = allGrades.length;
    let avgScore = 0;
    let passedCount = 0;
    if (totalCount > 0) {
      const sum = allGrades.reduce((acc, g) => acc + Number(g.totalScore), 0);
      avgScore = Number((sum / totalCount).toFixed(1));
      passedCount = allGrades.filter((g) => Number(g.totalScore) >= 50).length;
    }
    const passRate = totalCount > 0 ? Number(((passedCount / totalCount) * 100).toFixed(1)) : 0;

    return {
      totalStudents,
      totalCourses,
      totalGrades,
      approvedGrades,
      submittedGrades,
      draftGrades,
      totalCertificates,
      avgScore,
      passRate,
      recentMessages,
      recentGrades,
      classGroups: classGroups.map((cg) => ({
        id: cg.id,
        name: cg.name,
        level: cg.level,
        roomNumber: cg.roomNumber,
        teachers: cg.teachers,
        studentCount: cg._count.students,
      })),
    };
  }
}
