import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength, ValidateIf } from 'class-validator';
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
  @ValidateIf((o) => o.monthlySalary != null)
  isWorkingMember?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'monthlySalary must be a number' })
  @Min(1, { message: 'monthlySalary must be greater than 0' })
  @ValidateIf((o) => o.isWorkingMember === true || o.monthlySalary != null)
  monthlySalary?: number;

  @IsOptional()
  @IsDateString()
  registrationDate?: string;
}
