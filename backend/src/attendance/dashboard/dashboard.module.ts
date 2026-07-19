import { Module } from '@nestjs/common';
import { AttendanceDashboardService } from './dashboard.service';
import { AttendanceDashboardController } from './dashboard.controller';

@Module({
  providers: [AttendanceDashboardService],
  controllers: [AttendanceDashboardController],
})
export class AttendanceDashboardModule {}
