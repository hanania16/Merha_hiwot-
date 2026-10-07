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
  /** Sender account number is only applicable for BANK_TRANSFER payments.
   * CASH payments always have null senderAccountNumber — never collect or store
   * account details for cash transactions. */
  senderAccountNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  /**
   * referenceNumber format for student-fee income: STUDENT_FEE:CLASS_X_Y:YYYY:MONTH
   * (e.g., STUDENT_FEE:CLASS_1_3:2019:TIR)
   * 
   * This field is only parsed/split by getStudentFeesSummary() for
   * class-level grouping of student-fee records. Non-student-fee income
   * (DONATION, DEBRE_TABOR_FEAST, etc.) has no guaranteed format —
   * downstream code must not assume any specific structure.
   */
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
