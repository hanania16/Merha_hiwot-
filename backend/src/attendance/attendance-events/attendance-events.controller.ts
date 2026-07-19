import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AttendanceEventsService } from './attendance-events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('attendance/events')
export class AttendanceEventsController {
  constructor(private eventsService: AttendanceEventsService) {}

  @Get('month')
  findForMonth(@Query('year') year: string, @Query('month') month: string) {
    return this.eventsService.findForMonth(Number(year), Number(month));
  }

  @Get('day')
  findByDate(@Query('date') date: string) {
    return this.eventsService.findByDate(date);
  }

  @Roles(Role.ATTENDANCE_OFFICER, Role.ADMINISTRATOR)
  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.findOrCreate(dto);
  }
}
