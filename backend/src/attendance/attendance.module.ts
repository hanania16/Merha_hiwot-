import { Module } from '@nestjs/common';
import { ClassGroupsModule } from './class-groups/class-groups.module';
import { TeachersModule } from './teachers/teachers.module';
import { AttendanceEventsModule } from './attendance-events/attendance-events.module';
import { AttendanceRecordsModule } from './attendance-records/attendance-records.module';
import { AttendanceDashboardModule } from './dashboard/dashboard.module';
import { AttendanceReportsModule } from './reports/reports.module';
import { AttendanceAnalyticsModule } from './analytics/analytics.module';
import { AttendanceNotificationsModule } from './notifications/notifications.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ClassGroupsModule,
    TeachersModule,
    AttendanceEventsModule,
    AttendanceRecordsModule,
    AttendanceDashboardModule,
    AttendanceReportsModule,
    AttendanceAnalyticsModule,
    AttendanceNotificationsModule,
    EventsModule,
  ],
})
export class AttendanceModule {}
