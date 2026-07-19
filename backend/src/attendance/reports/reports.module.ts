import { Module } from '@nestjs/common';
import { AttendanceReportsService } from './reports.service';
import { AttendanceReportsController } from './reports.controller';
import { StudentsModule } from '../../students/students.module';

@Module({
  imports: [StudentsModule],
  providers: [AttendanceReportsService],
  controllers: [AttendanceReportsController],
})
export class AttendanceReportsModule {}
