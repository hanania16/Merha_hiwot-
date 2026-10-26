import { IsEnum, IsOptional, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, StudentStatus, ClassLevel, BehaviorStatus } from '@prisma/client';

export class QueryStudentDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() classId?: string;
  @IsOptional() @IsEnum(ClassLevel) classLevel?: ClassLevel;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsEnum(StudentStatus) status?: StudentStatus;
  @IsOptional() @IsEnum(BehaviorStatus) behaviorStatus?: BehaviorStatus;
  @IsOptional() @IsBoolean() @Type(() => Boolean) isSuspended?: boolean;
  @IsOptional() @IsString() feeStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
  @IsOptional() @IsString() registeredFrom?: string;
  @IsOptional() @IsString() registeredTo?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number = 25;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
