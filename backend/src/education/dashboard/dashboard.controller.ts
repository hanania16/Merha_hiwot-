import { Controller, Get } from '@nestjs/common';
import { EducationDashboardService } from './dashboard.service';

@Controller('education/dashboard')
export class EducationDashboardController {
  constructor(private readonly dashboardService: EducationDashboardService) {}

  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }
}
