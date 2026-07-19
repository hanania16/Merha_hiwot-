import { Module } from '@nestjs/common';
import { FinanceReportsService } from './reports.service';
import { FinanceReportsController } from './reports.controller';

@Module({
  providers: [FinanceReportsService],
  controllers: [FinanceReportsController],
})
export class FinanceReportsModule {}
