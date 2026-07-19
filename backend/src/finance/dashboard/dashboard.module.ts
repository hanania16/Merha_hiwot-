import { Module } from '@nestjs/common';
import { FinanceDashboardService } from './dashboard.service';
import { FinanceDashboardController } from './dashboard.controller';

@Module({
  providers: [FinanceDashboardService],
  controllers: [FinanceDashboardController],
})
export class FinanceDashboardModule {}
