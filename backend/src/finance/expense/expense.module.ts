import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { NotificationsService } from '../notifications/notifications.service';
import { FinanceAuditService } from '../../services/financeAuditService';

@Module({
  providers: [ExpenseService, NotificationsService, FinanceAuditService],
  controllers: [ExpenseController],
  exports: [ExpenseService],
})
export class ExpenseModule {}
