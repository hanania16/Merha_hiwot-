import { Controller, Get, Query } from '@nestjs/common';
import { AttendanceAnalyticsService } from './analytics.service';

@Controller('attendance/analytics')
export class AttendanceAnalyticsController {
  constructor(private analyticsService: AttendanceAnalyticsService) {}

  @Get('trend')
  trend(@Query('days') days?: string) {
    return this.analyticsService.attendanceTrend(days ? Number(days) : 30);
  }

  @Get('by-class')
  byClass() {
    return this.analyticsService.attendanceByClass();
  }

  @Get('present-vs-absent')
  presentVsAbsent(@Query('days') days?: string) {
    return this.analyticsService.presentVsAbsent(days ? Number(days) : 30);
  }

  @Get('absence-buckets')
  absenceBuckets() {
    return this.analyticsService.absenceBuckets();
  }

  @Get('registration-trend')
  registrationTrend(@Query('months') months?: string) {
    return this.analyticsService.registrationTrend(months ? Number(months) : 12);
  }

  @Get('most-absent')
  mostAbsent(@Query('limit') limit?: string) {
    return this.analyticsService.mostFrequentlyAbsent(limit ? Number(limit) : 10);
  }
}
