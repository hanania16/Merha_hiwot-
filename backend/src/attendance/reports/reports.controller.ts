import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AttendanceReportsService } from './reports.service';
import { exportToExcel, exportToPdf } from '../../finance/reports/export.util';

@Controller('attendance/reports')
export class AttendanceReportsController {
  constructor(private reportsService: AttendanceReportsService) {}

  @Get('daily')
  daily(@Query('date') date: string) {
    return this.reportsService.dailyReport(date);
  }

  @Get('monthly')
  monthly(@Query('year') year: string, @Query('month') month: string) {
    return this.reportsService.monthlyReport(Number(year), Number(month));
  }

  @Get('class/:classId')
  byClass(@Query('classId') classId: string) {
    return this.reportsService.classReport(classId);
  }

  @Get('registration')
  registration(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.registrationReport(new Date(from), new Date(to));
  }

  @Get('summary')
  summary(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.attendanceSummary(new Date(from), new Date(to));
  }

  @Get('inactive-students')
  inactiveStudents() {
    return this.reportsService.inactiveStudentsReport();
  }

  @Get('class/:classId/export/excel')
  async classExcel(@Query('classId') classId: string, @Res() res: Response) {
    const rows = await this.reportsService.classReport(classId);
    await exportToExcel(
      res,
      'class-attendance-report',
      [
        { header: 'Student', key: 'fullName', width: 25 },
        { header: 'Present', key: 'present', width: 12 },
        { header: 'Absent', key: 'absent', width: 12 },
        { header: 'Permission', key: 'permission', width: 12 },
        { header: 'Attendance %', key: 'attendancePercentage', width: 15 },
      ],
      rows,
    );
  }

  @Get('registration/export/pdf')
  async registrationPdf(@Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    const rows = await this.reportsService.registrationReport(new Date(from), new Date(to));
    exportToPdf(
      res,
      'registration-report',
      `Registration Report: ${from} to ${to}`,
      rows.map((r) => `${r.fullName} — ${r.className} — ${new Date(r.registrationDate).toLocaleDateString()}`),
    );
  }
}
