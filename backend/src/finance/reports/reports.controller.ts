import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { FinanceReportsService } from './reports.service';
import { exportToExcel, exportToPdf } from './export.util';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { currentEthiopianYear } from '../../common/constants/ethiopian-calendar';

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

  @Get('financial/export/excel')
  async financialExcel(@Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    const report = await this.reportsService.buildFinancialReport(new Date(from), new Date(to));
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
          category: i.category,
          amount: Number(i.amount),
          description: i.description ?? '',
        })),
        ...report.expenses.map((e) => ({
          date: e.date.toISOString().slice(0, 10),
          type: 'Expense',
          category: e.category,
          amount: Number(e.amount),
          description: e.description ?? '',
        })),
      ],
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
    ]);
  }
}
