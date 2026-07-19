import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AttendanceRecordsService } from './attendance-records.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { AttendanceStatus } from '@prisma/client';

@Controller('attendance/records')
export class AttendanceRecordsController {
  constructor(private recordsService: AttendanceRecordsService) {}

  @Get('roster')
  getRoster(@Query('classId') classId: string | undefined, @Query('date') date: string) {
    return this.recordsService.getEntryRoster(classId, date);
  }

  @Get('student/:studentId/history')
  history(@Param('studentId') studentId: string) {
    return this.recordsService.historyForStudent(studentId);
  }

  @Get('warnings')
  warnings() {
    return this.recordsService.getWarnings();
  }

  @Get('upcoming-inactive')
  upcomingInactive() {
    return this.recordsService.getUpcomingInactive();
  }

  @Roles(Role.ATTENDANCE_OFFICER, Role.ADMINISTRATOR)
  @Post('bulk')
  recordBulk(@Body() dto: RecordAttendanceDto, @CurrentUser() user: CurrentUserPayload) {
    return this.recordsService.recordBulk(dto, user.userId);
  }

  @Roles(Role.ATTENDANCE_OFFICER, Role.ADMINISTRATOR)
  @Patch(':id')
  edit(@Param('id') id: string, @Body('status') status: AttendanceStatus, @CurrentUser() user: CurrentUserPayload) {
    return this.recordsService.editAttendance(id, status, user.userId);
  }
}
