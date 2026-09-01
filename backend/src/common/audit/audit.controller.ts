import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * Shared audit trail for both dashboards. Administrators see everything;
 * Finance officers can filter by entityType to see just their domain
 * (e.g. ?entityType=Expense) via the frontend's query.
 */
@Roles(Role.ADMINISTRATOR, Role.FINANCE_OFFICER)
@Controller('audit-log')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  findAll(@Query('entityType') entityType?: string) {
    return this.audit.findAll({ entityType });
  }
}
