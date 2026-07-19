import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  providers: [ExpenseService, NotificationsService],
  controllers: [ExpenseController],
  exports: [ExpenseService],
})
export class ExpenseModule {}
