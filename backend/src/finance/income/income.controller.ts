import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IncomeService } from './income.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { QueryIncomeDto } from './dto/query-income.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { toEthiopian } from '../../common/constants/ethiopian-calendar';

@Roles(Role.FINANCE_OFFICER, Role.ADMINISTRATOR)
@Controller('finance/income')
export class IncomeController {
  constructor(private incomeService: IncomeService) {}

  @Get()
  findAll(@Query() query: QueryIncomeDto) {
    return this.incomeService.findAll(query);
  }

  @Get('student-fees-summary')
  getStudentFeesSummary() {
    return this.incomeService.getStudentFeesSummary();
  }

  @Post()
  create(@Body() dto: CreateIncomeDto, @CurrentUser() user: CurrentUserPayload) {
    return this.incomeService.create(dto, user.userId);
  }

  /** Manual trigger for the monthly auto-generation (same idempotent logic as the scheduler). */
  @Post('auto-record-monthly')
  autoRecordMonthly(@Query('year') year?: string, @Query('month') month?: string) {
    const today = toEthiopian(new Date());
    const y = year ? Number(year) : today.year;
    const m = month ? Number(month) : today.month;
    return this.incomeService.autoRecordMonthlyFees(y, m);
  }

  /** Append-only correction: books an offsetting REVERSAL Expense, never edits/deletes. */
  @Post(':id/reverse')
  reverse(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.incomeService.reverse(id, user.userId);
  }
}
