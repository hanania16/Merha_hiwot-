import { Body, Controller, Get, NotFoundException, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { exportToPdf } from '../reports/export.util';

@Roles(Role.FINANCE_OFFICER, Role.ADMINISTRATOR)
@Controller('finance/receipts')
export class ReceiptsController {
  constructor(private receiptsService: ReceiptsService) {}

  @Get()
  findAll(@Query('studentId') studentId?: string) {
    return this.receiptsService.findAll(studentId);
  }

  @Post()
  create(@Body() dto: CreateReceiptDto, @CurrentUser() user: CurrentUserPayload) {
    return this.receiptsService.create(dto, user.userId);
  }

  @Get(':id/print')
  async print(@Param('id') id: string, @Res() res: Response) {
    const receipt = await this.receiptsService.findOne(id);
    if (!receipt) throw new NotFoundException('Receipt not found');
    exportToPdf(res, `receipt-${receipt.receiptNumber}`, 'Payment Receipt', [
      `Receipt No: ${receipt.receiptNumber}`,
      `Student: ${receipt.student.fullName}`,
      `Class: ${receipt.student.class.name}`,
      `Months Paid: ${receipt.monthsPaid.join(', ')}`,
      `Amount: ${Number(receipt.amount).toLocaleString()} ETB`,
      `Payment Date: ${receipt.paymentDate.toISOString().slice(0, 10)}`,
      `Received By: ${receipt.issuedBy.fullName}`,
    ]);
  }
}
