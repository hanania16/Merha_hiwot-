import { Module } from '@nestjs/common';
import { WeeklyDigestService } from './digest.service';
import { DigestController } from './digest.controller';
import { AttendanceRecordsModule } from '../../attendance/attendance-records/attendance-records.module';
import { StudentFeesModule } from '../../finance/student-fees/student-fees.module';

@Module({
  imports: [AttendanceRecordsModule, StudentFeesModule],
  providers: [WeeklyDigestService],
  controllers: [DigestController],
})
export class DigestModule {}
