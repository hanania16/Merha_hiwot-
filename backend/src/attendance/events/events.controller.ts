import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { RecordEventAttendanceDto } from './dto/record-event-attendance.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('attendance/events-list')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Get('reports/participation')
  participationReport() {
    return this.eventsService.participationReport();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Roles(Role.ATTENDANCE_OFFICER, Role.ADMINISTRATOR)
  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() user: CurrentUserPayload) {
    return this.eventsService.create(dto, user.userId);
  }

  @Roles(Role.ATTENDANCE_OFFICER, Role.ADMINISTRATOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateEventDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.eventsService.update(id, dto, user.userId);
  }

  @Roles(Role.ATTENDANCE_OFFICER, Role.ADMINISTRATOR)
  @Post(':id/attendance')
  recordAttendance(@Param('id') id: string, @Body() dto: RecordEventAttendanceDto, @CurrentUser() user: CurrentUserPayload) {
    return this.eventsService.recordAttendance(id, dto, user.userId);
  }
}
