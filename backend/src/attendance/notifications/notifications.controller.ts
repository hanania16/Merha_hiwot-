import { Controller, Get, Post, Query } from '@nestjs/common';
import { AttendanceNotificationsService } from './notifications.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('attendance/notifications')
export class AttendanceNotificationsController {
  constructor(private notificationsService: AttendanceNotificationsService) {}

  @Get()
  findAll(@Query('unread') unread?: string) {
    return this.notificationsService.findAll(unread === 'true');
  }

  @Roles(Role.ATTENDANCE_OFFICER, Role.ADMINISTRATOR)
  @Post('refresh')
  refresh() {
    return this.notificationsService.refreshAttendanceWarnings();
  }
}
