import { Module } from '@nestjs/common';
import { FinanceReportsService } from './reports.service';
import { FinanceReportsController } from './reports.controller';
import { FinanceReportsScheduler } from './reports.scheduler';

@Module({
  providers: [FinanceReportsService, FinanceReportsScheduler],
  controllers: [FinanceReportsController],
  exports: [FinanceReportsService],
})
export class FinanceReportsModule {}
