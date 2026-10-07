import { ArrayMinSize, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EthiopianMonth, PaymentMethod } from '@prisma/client';

export class RecordPaymentDto {
  @IsString()
  studentId: string;

  @IsInt()
  ethiopianYear: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(EthiopianMonth, { each: true })
  months: EthiopianMonth[];

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amountPerMonth?: number;

  /** How the payment was made — defaults to CASH when omitted. */
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  /** Sender/payer account owner name — required when paymentMethod is BANK_TRANSFER. */
  @IsOptional()
  @IsString()
  accountOwner?: string;

  /** Sender reference / phone number — used when paymentMethod is TELEBIRR_TRANSFER. */
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
