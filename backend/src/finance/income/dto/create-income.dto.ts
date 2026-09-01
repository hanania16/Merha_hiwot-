import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { IncomeCategory, IncomeSourceType, PaymentMethod } from '@prisma/client';

export class CreateIncomeDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  // Deprecated: kept for backward compatibility but no longer sent by the
  // form. When omitted the service derives a default from `sourceType`.
  @IsOptional()
  @IsEnum(IncomeCategory)
  category?: IncomeCategory;

  @IsEnum(IncomeSourceType)
  sourceType: IncomeSourceType;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  senderAccountNumber?: string;

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
}
