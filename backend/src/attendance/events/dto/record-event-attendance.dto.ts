import { ArrayMinSize, IsArray, IsEnum, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

class EventAttendanceEntry {
  @IsString() studentId: string;
  @IsEnum(AttendanceStatus) status: AttendanceStatus;
}

export class RecordEventAttendanceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EventAttendanceEntry)
  entries: EventAttendanceEntry[];
}
