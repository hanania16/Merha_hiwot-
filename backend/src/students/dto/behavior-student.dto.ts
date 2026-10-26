import { IsEnum, IsInt, IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';
import { BehaviorRecordType, BehaviorStatus } from '@prisma/client';

export class CreateBehaviorRecordDto {
  @IsEnum(BehaviorRecordType)
  type: BehaviorRecordType;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  actionTaken?: string;

  @IsOptional()
  @IsDateString()
  incidentDate?: string;

  @IsOptional()
  @IsInt()
  ethiopianYear?: number;
}

export class ToggleSuspensionDto {
  @IsBoolean()
  isSuspended: boolean;

  @IsOptional()
  @IsString()
  suspensionReason?: string;

  @IsOptional()
  @IsDateString()
  suspensionEndDate?: string;
}

export class UpdateBehaviorStatusDto {
  @IsEnum(BehaviorStatus)
  behaviorStatus: BehaviorStatus;
}
