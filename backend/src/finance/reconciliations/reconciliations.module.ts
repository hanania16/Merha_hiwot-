import { Module } from '@nestjs/common';
import { ReconciliationsService } from './reconciliations.service';
import { ReconciliationsController } from './reconciliations.controller';
import { FinanceAuditService } from '../../services/financeAuditService';

@Module({
  providers: [ReconciliationsService, FinanceAuditService],
  controllers: [ReconciliationsController],
  exports: [ReconciliationsService],
})
export class ReconciliationsModule {}
