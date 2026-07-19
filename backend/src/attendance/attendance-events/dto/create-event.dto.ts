import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { EventType } from '@prisma/client';

export class CreateEventDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsString()
  title?: string;
}
