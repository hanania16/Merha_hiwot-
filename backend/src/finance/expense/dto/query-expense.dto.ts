import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class QueryExpenseDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsEnum(ExpenseCategory) category?: ExpenseCategory;
}
