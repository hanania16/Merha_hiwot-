import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateStudentDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsOptional()
  @IsString()
  fullNameAmharic?: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsDateString()
  dateOfBirth: string;

  @IsOptional()
  @IsString()
  studentPhone?: string;

  @IsString()
  parentName: string;

  @IsString()
  parentPhone: string;

  @IsString()
  classId: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isWorkingMember?: boolean;

  @IsOptional()
  @IsNumber()
  monthlySalary?: number;

  @IsOptional()
  @IsDateString()
  registrationDate?: string;
}
