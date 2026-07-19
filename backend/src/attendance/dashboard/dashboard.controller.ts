import { Controller, Get } from '@nestjs/common';
import { AttendanceDashboardService } from './dashboard.service';

@Controller('attendance/dashboard')
export class AttendanceDashboardController {
  constructor(private dashboardService: AttendanceDashboardService) {}

  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('warnings')
  getWarnings() {
    return this.dashboardService.getWarningStudents();
  }
}
