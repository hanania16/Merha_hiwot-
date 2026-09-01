import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { ClassLevel, EthiopianMonth, PaymentMethod } from '@prisma/client';

export class RecordClassPaymentsDto {
  @IsEnum(ClassLevel)
  classLevel: ClassLevel;

  @IsInt()
  ethiopianYear: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(EthiopianMonth, { each: true })
  months: EthiopianMonth[];

  @IsOptional()
  @IsUUID()
  accountId?: string;

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
  @IsDateString()
  date?: string;

  /** Optional per-student override (studentId -> amount). Working members default to 2% of salary, not the flat class rate. */
  @IsOptional()
  @IsObject()
  amountOverrides?: Record<string, number>;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
