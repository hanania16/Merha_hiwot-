import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { EthiopianMonth } from '@prisma/client';

export class GenerateMonthFeesDto {
  @IsOptional()
  @IsInt()
  ethiopianYear?: number;

  @IsEnum(EthiopianMonth)
  month: EthiopianMonth;
}
