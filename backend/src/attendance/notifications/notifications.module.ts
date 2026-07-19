import { Module } from '@nestjs/common';
import { AttendanceNotificationsService } from './notifications.service';
import { AttendanceNotificationsController } from './notifications.controller';

@Module({
  providers: [AttendanceNotificationsService],
  controllers: [AttendanceNotificationsController],
})
export class AttendanceNotificationsModule {}
