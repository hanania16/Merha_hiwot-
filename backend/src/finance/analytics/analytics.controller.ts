import { Controller, Get, Query } from '@nestjs/common';
import { FinanceAnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { currentEthiopianYear } from '../../common/constants/ethiopian-calendar';

@Roles(Role.FINANCE_OFFICER, Role.ADMINISTRATOR)
@Controller('finance/analytics')
export class FinanceAnalyticsController {
  constructor(private analyticsService: FinanceAnalyticsService) {}

  @Get('income-vs-expense')
  incomeVsExpense(@Query('months') months?: string) {
    return this.analyticsService.incomeVsExpenseTrend(months ? Number(months) : 12);
  }

  @Get('expenses-by-category')
  expensesByCategory() {
    return this.analyticsService.expensesByCategory();
  }

  @Get('income-by-category')
  incomeByCategory() {
    return this.analyticsService.incomeByCategory();
  }

  @Get('donation-trend')
  donationTrend(@Query('months') months?: string) {
    return this.analyticsService.donationTrend(months ? Number(months) : 12);
  }

  @Get('collection-rate')
  collectionRate(@Query('year') year?: string) {
    return this.analyticsService.collectionRate(year ? Number(year) : currentEthiopianYear());
  }

  @Get('payment-status')
  paymentStatus(@Query('year') year?: string) {
    return this.analyticsService.paymentStatusBreakdown(year ? Number(year) : currentEthiopianYear());
  }

  @Get('yearly-trend')
  yearlyTrend(@Query('years') years?: string) {
    return this.analyticsService.yearlyFinancialTrend(years ? Number(years) : 5);
  }
}
