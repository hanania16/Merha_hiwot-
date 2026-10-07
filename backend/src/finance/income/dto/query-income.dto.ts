import { IsOptional, IsString } from 'class-validator';

export class QueryIncomeDto {
  @IsOptional() @IsString() ethiopianYear?: string;
  @IsOptional() @IsString() ethiopianMonth?: string;
}
