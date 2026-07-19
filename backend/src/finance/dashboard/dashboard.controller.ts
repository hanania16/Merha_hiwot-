import { Controller, Get } from '@nestjs/common';
import { FinanceDashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Roles(Role.FINANCE_OFFICER, Role.ADMINISTRATOR)
@Controller('finance/dashboard')
export class FinanceDashboardController {
  constructor(private dashboardService: FinanceDashboardService) {}

  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('activities')
  getActivities() {
    return this.dashboardService.getMonthlyActivities();
  }
}
