import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { IncomeCategory } from '@prisma/client';

export class QueryIncomeDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsEnum(IncomeCategory) category?: IncomeCategory;
}
