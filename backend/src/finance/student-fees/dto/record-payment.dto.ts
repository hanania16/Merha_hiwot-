import { ArrayMinSize, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EthiopianMonth } from '@prisma/client';

export class RecordPaymentDto {
  @IsString()
  studentId: string;

  @IsInt()
  ethiopianYear: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(EthiopianMonth, { each: true })
  months: EthiopianMonth[];

  /** Optional override — defaults to the class/working-member fee rule if omitted. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPerMonth?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
