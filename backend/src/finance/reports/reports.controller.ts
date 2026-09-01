import { Body, Controller, Delete, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { FinanceReportsService } from './reports.service';
import { exportToExcel, exportToPdf } from './export.util';
import { exportAuditPdf } from './audit-pdf.export';
import { exportAuditExcel } from './audit-excel.export';
import { AuditReport } from './audit-report.types';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { currentEthiopianYear, toEthiopian } from '../../common/constants/ethiopian-calendar';
import { enumLabel, normLang } from './export-labels';

const EXPORT_FORMATS = ['pdf', 'excel'];

@Roles(Role.FINANCE_OFFICER, Role.ADMINISTRATOR)
@Controller('finance/reports')
export class FinanceReportsController {
  constructor(private reportsService: FinanceReportsService) {}

  @Get('financial')
  financial(@Query('from') from: string, @Query('to') to: string, @Query('period') period?: 'week' | 'month' | 'year') {
    const range = period ? this.periodToRange(period) : { from: new Date(from), to: new Date(to) };
    return this.reportsService.buildFinancialReport(range.from, range.to);
  }

  private periodToRange(period: 'week' | 'month' | 'year') {
    const to = new Date();
    const from = new Date();
    if (period === 'week') from.setDate(to.getDate() - 7);
    else if (period === 'month') from.setDate(1);
    else from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }

  @Get('student-fees')
  studentFees(@Query('year') year?: string) {
    return this.reportsService.studentFeeReport(year ? Number(year) : currentEthiopianYear());
  }

  @Get('monthly')
  monthly(@Query('year') year?: string, @Query('month') month?: string) {
    const today = toEthiopian(new Date());
    const y = year ? Number(year) : today.year;
    const m = month ? Number(month) : today.month;
    return this.reportsService.monthlyReport(y, m);
  }

  @Get('yearly')
  yearly(@Query('year') year?: string) {
    const y = year ? Number(year) : currentEthiopianYear();
    return this.reportsService.yearlyReport(y);
  }

  @Post('snapshot')
  snapshot(
    @Body() body: { type: 'MONTHLY' | 'YEARLY'; year?: number; month?: number },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const y = body.year ?? currentEthiopianYear();
    return this.reportsService.snapshotNow(body.type, y, body.month, user.userId);
  }

  @Get('history')
  history() {
    return this.reportsService.listReportHistory();
  }

  @Get('history/:id')
  historyOne(@Param('id') id: string) {
    return this.reportsService.getReportSnapshot(id);
  }

  @Delete('history/:id')
  historyRemove(@Param('id') id: string) {
    return this.reportsService.removeReportSnapshot(id);
  }

  @Get('monthly/export')
  async monthlyExport(
    @Res() res: Response,
    @Req() req: Request,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('format') format = 'pdf',
    @Query('lang') lang?: string,
  ) {
    const today = toEthiopian(new Date());
    const y = year ? Number(year) : today.year;
    const m = month ? Number(month) : today.month;
    const report = await this.reportsService.monthlyReport(y, m);
    await this.writeExport(res, format, `audit-report-monthly-${y}-${m}`, report, this.currentUserEmail(req), normLang(lang));
  }

  @Get('yearly/export')
  async yearlyExport(
    @Res() res: Response,
    @Req() req: Request,
    @Query('year') year?: string,
    @Query('format') format = 'pdf',
    @Query('lang') lang?: string,
  ) {
    const y = year ? Number(year) : currentEthiopianYear();
    const report = await this.reportsService.yearlyReport(y);
    await this.writeExport(res, format, `audit-report-yearly-${y}`, report, this.currentUserEmail(req), normLang(lang));
  }

  private currentUserEmail(req: Request): string | undefined {
    return (req.user as { email?: string } | undefined)?.email;
  }

  private async writeExport(res: Response, format: string, filename: string, report: AuditReport, generatedBy?: string, lang: 'en' | 'am' = 'am') {
    const fmt = EXPORT_FORMATS.includes(format) ? format : 'pdf';
    const by = generatedBy ?? 'system';
    if (fmt === 'excel') {
      await exportAuditExcel(res, report, filename, by, lang);
    } else {
      await exportAuditPdf(res, report, filename, by, lang);
    }
  }

  @Get('financial/export/excel')
  async financialExcel(@Query('from') from: string, @Query('to') to: string, @Res() res: Response, @Query('lang') lang?: string) {
    const report = await this.reportsService.buildFinancialReport(new Date(from), new Date(to));
    const language = normLang(lang);
    await exportToExcel(
      res,
      'financial-report',
      [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Type', key: 'type', width: 12 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Description', key: 'description', width: 30 },
      ],
      [
        ...report.incomes.map((i) => ({
          date: i.date.toISOString().slice(0, 10),
          type: 'Income',
          category: enumLabel(i.category, language),
          amount: Number(i.amount),
          description: i.description ?? '',
        })),
        ...report.expenses.map((e) => ({
          date: e.date.toISOString().slice(0, 10),
          type: 'Expense',
          category: enumLabel(e.category, language),
          amount: Number(e.amount),
          description: e.description ?? '',
        })),
      ],
      report.lastStudentFeeBatchTime
        ? `Student fee totals current as of ${report.lastStudentFeeBatchTime.toISOString().slice(0, 10)} (last daily batch)`
        : undefined,
    );
  }

  @Get('financial/export/pdf')
  async financialPdf(@Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    const report = await this.reportsService.buildFinancialReport(new Date(from), new Date(to));
    exportToPdf(res, 'financial-report', `Financial Report: ${from} to ${to}`, [
      `Total Income: ${report.totalIncome.toLocaleString()} ETB`,
      `Total Expense: ${report.totalExpense.toLocaleString()} ETB`,
      `Balance: ${report.balance.toLocaleString()} ETB`,
      `Collection Rate: ${report.collectionRate}%`,
      `Donations: ${report.donations.toLocaleString()} ETB`,
      `Outstanding Fee Months: ${report.outstandingFeeMonths}`,
      report.lastStudentFeeBatchTime
        ? `Student fee totals current as of ${report.lastStudentFeeBatchTime.toISOString().slice(0, 10)} (last daily batch)`
        : '',
    ].filter(Boolean));
  }
}
