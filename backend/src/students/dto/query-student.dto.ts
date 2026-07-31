import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, StudentStatus } from '@prisma/client';

export class QueryStudentDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() classId?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsEnum(StudentStatus) status?: StudentStatus;
  @IsOptional() @IsString() feeStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
  @IsOptional() @IsString() eligibleToServe?: 'true';
  @IsOptional() @IsString() registeredFrom?: string;
  @IsOptional() @IsString() registeredTo?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number = 25;
}
