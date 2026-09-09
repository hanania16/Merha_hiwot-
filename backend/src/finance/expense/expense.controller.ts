import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Roles(Role.FINANCE_OFFICER, Role.ADMINISTRATOR)
@Controller('finance/expenses')
export class ExpenseController {
  constructor(private expenseService: ExpenseService) {}

  @Get()
  findAll(@Query() query: QueryExpenseDto) {
    return this.expenseService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: CurrentUserPayload) {
    return this.expenseService.create(dto, user.userId);
  }

  /** Append-only correction: books an offsetting REVERSAL Income, never edits/deletes. */
  @Post(':id/reverse')
  reverse(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.expenseService.reverse(id, user.userId);
  }
}
