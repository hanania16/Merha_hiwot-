import { Module } from '@nestjs/common';
import { AttendanceAnalyticsService } from './analytics.service';
import { AttendanceAnalyticsController } from './analytics.controller';

@Module({
  providers: [AttendanceAnalyticsService],
  controllers: [AttendanceAnalyticsController],
})
export class AttendanceAnalyticsModule {}
