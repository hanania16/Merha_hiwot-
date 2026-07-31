import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { EthiopianMonth } from '@prisma/client';

export class QueryFeesDto {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsEnum(EthiopianMonth)
  month?: EthiopianMonth;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['PAID', 'UNPAID', 'PARTIAL'])
  status?: 'PAID' | 'UNPAID' | 'PARTIAL';
}
