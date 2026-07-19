import { Module } from '@nestjs/common';
import { StudentFeesService } from './student-fees.service';
import { StudentFeesController } from './student-fees.controller';

@Module({
  providers: [StudentFeesService],
  controllers: [StudentFeesController],
  exports: [StudentFeesService],
})
export class StudentFeesModule {}
