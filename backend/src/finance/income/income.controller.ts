import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IncomeService } from './income.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { QueryIncomeDto } from './dto/query-income.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Roles(Role.FINANCE_OFFICER, Role.ADMINISTRATOR)
@Controller('finance/income')
export class IncomeController {
  constructor(private incomeService: IncomeService) {}

  @Get()
  findAll(@Query() query: QueryIncomeDto) {
    return this.incomeService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateIncomeDto, @CurrentUser() user: CurrentUserPayload) {
    return this.incomeService.create(dto, user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateIncomeDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.incomeService.update(id, dto, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.incomeService.remove(id, user.userId);
  }
}
