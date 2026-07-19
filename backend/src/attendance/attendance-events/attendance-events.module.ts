import { Module } from '@nestjs/common';
import { AttendanceEventsService } from './attendance-events.service';
import { AttendanceEventsController } from './attendance-events.controller';

@Module({
  providers: [AttendanceEventsService],
  controllers: [AttendanceEventsController],
  exports: [AttendanceEventsService],
})
export class AttendanceEventsModule {}
