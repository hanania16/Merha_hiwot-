import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { StudentFeesService } from './student-fees.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { QueryFeesDto } from './dto/query-fees.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('finance/student-fees')
export class StudentFeesController {
  constructor(private feesService: StudentFeesService) {}

  // Read access: any authenticated role (Attendance dashboard shows fee status read-only)
  @Get()
  list(@Query() query: QueryFeesDto) {
    return this.feesService.listStudentFeeStatus(query);
  }

  @Get('reminders/unpaid-this-month')
  unpaidThisMonth() {
    return this.feesService.getUnpaidThisMonth();
  }

  @Get(':studentId/history')
  history(@Param('studentId') studentId: string) {
    return this.feesService.getStudentPaymentHistory(studentId);
  }

  @Get(':studentId/outstanding-balance')
  outstandingBalance(@Param('studentId') studentId: string) {
    return this.feesService.getOutstandingBalance(studentId);
  }

  // Write access: Finance Officer / Administrator only
  @Roles(Role.FINANCE_OFFICER, Role.ADMINISTRATOR)
  @Post('record-payment')
  recordPayment(@Body() dto: RecordPaymentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.feesService.recordPayment(dto, user.userId);
  }
}
