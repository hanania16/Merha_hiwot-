import { Module } from '@nestjs/common';
import { IncomeService } from './income.service';
import { IncomeController } from './income.controller';
import { IncomeAutoRecordScheduler } from './income.scheduler';
import { FinanceAuditService } from '../../services/financeAuditService';
import { LedgerModule } from '../ledger/ledger.module';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  imports: [LedgerModule],
  providers: [IncomeService, FinanceAuditService, IncomeAutoRecordScheduler, NotificationsService],
  controllers: [IncomeController],
  exports: [IncomeService],
})
export class IncomeModule {}
