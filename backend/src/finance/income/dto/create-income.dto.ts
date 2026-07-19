import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { IncomeCategory } from '@prisma/client';

export class CreateIncomeDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(IncomeCategory)
  category: IncomeCategory;

  @IsOptional()
  @IsString()
  description?: string;
}
