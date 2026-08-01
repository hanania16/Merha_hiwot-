import { Module } from '@nestjs/common';
import { IncomeService } from './income.service';
import { IncomeController } from './income.controller';
import { FinanceAuditService } from '../../services/financeAuditService';

@Module({
  providers: [IncomeService, FinanceAuditService],
  controllers: [IncomeController],
  exports: [IncomeService],
})
export class IncomeModule {}
