import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClassLevel } from '@prisma/client';
import { CreateStudentDto } from './create-student.dto';

export class CreateClassDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(ClassLevel)
  level: ClassLevel;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  roomNumber?: string;

  @IsOptional()
  @IsNumber()
  academicYear?: number;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teacherIds?: string[];
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(ClassLevel)
  level?: ClassLevel;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  roomNumber?: string;

  @IsOptional()
  @IsNumber()
  academicYear?: number;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teacherIds?: string[];
}

export class BulkCreateStudentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStudentDto)
  students: CreateStudentDto[];
}
