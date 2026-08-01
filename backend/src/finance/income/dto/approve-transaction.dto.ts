import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApprovalDecision } from '@prisma/client';

export class ApproveTransactionDto {
  @IsEnum(ApprovalDecision)
  decision: ApprovalDecision;

  @IsOptional()
  @IsString()
  comments?: string;
}
