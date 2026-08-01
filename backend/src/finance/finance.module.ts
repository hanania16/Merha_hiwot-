import { Module } from '@nestjs/common';
import { FinanceDashboardModule } from './dashboard/dashboard.module';
import { StudentFeesModule } from './student-fees/student-fees.module';
import { IncomeModule } from './income/income.module';
import { ExpenseModule } from './expense/expense.module';
import { FinanceReportsModule } from './reports/reports.module';
import { FinanceAnalyticsModule } from './analytics/analytics.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { AccountsModule } from './accounts/accounts.module';
import { ReconciliationsModule } from './reconciliations/reconciliations.module';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';

@Module({
  imports: [
    FinanceDashboardModule,
    StudentFeesModule,
    IncomeModule,
    ExpenseModule,
    FinanceReportsModule,
    FinanceAnalyticsModule,
    ReceiptsModule,
    AccountsModule,
    ReconciliationsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class FinanceModule {}
