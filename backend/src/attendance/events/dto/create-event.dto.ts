import { ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { EventType, EventStatus } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  name: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  participatingClassIds?: string[];

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}
