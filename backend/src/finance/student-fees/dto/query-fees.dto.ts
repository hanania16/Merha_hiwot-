import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryFeesDto {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['PAID', 'UNPAID', 'PARTIAL'])
  status?: 'PAID' | 'UNPAID' | 'PARTIAL';
}
