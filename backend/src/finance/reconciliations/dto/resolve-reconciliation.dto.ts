import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReconciliationStatus } from '@prisma/client';

export class ResolveReconciliationDto {
  @IsEnum(ReconciliationStatus)
  status: ReconciliationStatus;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
