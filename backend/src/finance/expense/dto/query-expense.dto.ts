import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ExpenseCategory, TransactionStatus } from '@prisma/client';

export class QueryExpenseDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsEnum(ExpenseCategory) category?: ExpenseCategory;
  @IsOptional() @IsEnum(TransactionStatus) status?: TransactionStatus;
  @IsOptional() @IsString() ethiopianYear?: string;
  @IsOptional() @IsString() ethiopianMonth?: string;
}
