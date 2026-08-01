import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { IncomeCategory, IncomeSourceType, TransactionStatus } from '@prisma/client';

export class QueryIncomeDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsEnum(IncomeCategory) category?: IncomeCategory;
  @IsOptional() @IsEnum(IncomeSourceType) sourceType?: IncomeSourceType;
  @IsOptional() @IsEnum(TransactionStatus) status?: TransactionStatus;
}
