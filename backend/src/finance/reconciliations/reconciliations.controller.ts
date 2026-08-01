import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ReconciliationsService } from './reconciliations.service';
import { CreateReconciliationDto } from './dto/create-reconciliation.dto';
import { ResolveReconciliationDto } from './dto/resolve-reconciliation.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Roles(Role.FINANCE_OFFICER, Role.ADMINISTRATOR)
@Controller('finance/reconciliations')
export class ReconciliationsController {
  constructor(private reconciliationsService: ReconciliationsService) {}

  @Get()
  findAll(@Query('accountId') accountId?: string) {
    return this.reconciliationsService.findAll(accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reconciliationsService.findOne(id);
  }

  @Post()
  run(@Body() dto: CreateReconciliationDto, @CurrentUser() user: CurrentUserPayload) {
    return this.reconciliationsService.run(dto, user.userId);
  }

  @Patch(':id')
  resolve(@Param('id') id: string, @Body() dto: ResolveReconciliationDto, @CurrentUser() user: CurrentUserPayload) {
    return this.reconciliationsService.resolve(id, dto, user.userId);
  }
}
