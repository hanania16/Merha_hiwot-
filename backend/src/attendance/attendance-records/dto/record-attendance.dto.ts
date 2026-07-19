import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus, EventType } from '@prisma/client';

class StudentAttendanceEntry {
  @IsString()
  studentId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}

/** Bulk, single-page recording: one date/event, many students, one call. */
export class RecordAttendanceDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceEntry)
  entries: StudentAttendanceEntry[];
}
