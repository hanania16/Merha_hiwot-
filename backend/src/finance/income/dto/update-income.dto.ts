import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { IncomeCategory, IncomeSourceType, PaymentMethod } from '@prisma/client';

export class UpdateIncomeDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsEnum(IncomeCategory)
  category?: IncomeCategory;

  @IsOptional()
  @IsEnum(IncomeSourceType)
  sourceType?: IncomeSourceType;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  receiptId?: string;

  @IsOptional()
  @IsUUID()
  monthlyPaymentId?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsString()
  reason: string;
}
