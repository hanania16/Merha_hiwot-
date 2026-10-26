import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { StudentStatus, BehaviorStatus } from '@prisma/client';
import { CreateStudentDto } from './create-student.dto';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @IsOptional()
  @IsEnum(BehaviorStatus)
  behaviorStatus?: BehaviorStatus;

  @IsOptional()
  @IsBoolean()
  isSuspended?: boolean;

  @IsOptional()
  @IsString()
  suspensionReason?: string;

  @IsOptional()
  @IsDateString()
  suspensionDate?: string;

  @IsOptional()
  @IsDateString()
  suspensionEndDate?: string;
}
