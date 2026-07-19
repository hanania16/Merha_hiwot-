import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClassGroupsService {
  constructor(private prisma: PrismaService) {}

  /** Class 1-2, Class 3-6, Class 7-12 — fixed set, seeded once, never created ad hoc. */
  async findAllWithStats() {
    const classes = await this.prisma.classGroup.findMany({
      include: { teachers: true, students: { where: { status: 'ACTIVE' } } },
    });

    const results = [];
    for (const cls of classes) {
      const studentIds = cls.students.map((s) => s.id);
      const attendance = await this.prisma.attendance.findMany({
        where: { studentId: { in: studentIds } },
      });
      const present = attendance.filter((a) => a.status === 'PRESENT').length;
      const attendancePercentage = attendance.length ? Math.round((present / attendance.length) * 1000) / 10 : 0;

      results.push({
        id: cls.id,
        name: cls.name,
        level: cls.level,
        teachers: cls.teachers,
        studentCount: cls.students.length,
        attendancePercentage,
      });
    }
    return results;
  }

  async assignTeacher(classId: string, teacherId: string) {
    return this.prisma.classGroup.update({
      where: { id: classId },
      data: { teachers: { connect: { id: teacherId } } },
      include: { teachers: true },
    });
  }

  async unassignTeacher(classId: string, teacherId: string) {
    return this.prisma.classGroup.update({
      where: { id: classId },
      data: { teachers: { disconnect: { id: teacherId } } },
      include: { teachers: true },
    });
  }
}
