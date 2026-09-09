import { Module } from '@nestjs/common';
import { StudentFeesService } from './student-fees.service';
import { StudentFeesController } from './student-fees.controller';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  providers: [StudentFeesService],
  controllers: [StudentFeesController],
  exports: [StudentFeesService],
})
export class StudentFeesModule {}
