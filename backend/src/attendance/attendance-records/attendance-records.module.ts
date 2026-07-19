import { Module } from '@nestjs/common';
import { AttendanceRecordsService } from './attendance-records.service';
import { AttendanceRecordsController } from './attendance-records.controller';
import { AttendanceEventsModule } from '../attendance-events/attendance-events.module';

@Module({
  imports: [AttendanceEventsModule],
  providers: [AttendanceRecordsService],
  controllers: [AttendanceRecordsController],
  exports: [AttendanceRecordsService],
})
export class AttendanceRecordsModule {}
