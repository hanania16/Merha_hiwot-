import { Module } from '@nestjs/common';
import { FinanceAnalyticsService } from './analytics.service';
import { FinanceAnalyticsController } from './analytics.controller';

@Module({
  providers: [FinanceAnalyticsService],
  controllers: [FinanceAnalyticsController],
})
export class FinanceAnalyticsModule {}
