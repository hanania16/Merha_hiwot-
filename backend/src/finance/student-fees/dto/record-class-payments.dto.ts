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

  @IsUUID()
  accountId: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

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
