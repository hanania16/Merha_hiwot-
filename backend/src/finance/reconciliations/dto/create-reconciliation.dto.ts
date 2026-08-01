import { IsDateString, IsNumber, IsUUID } from 'class-validator';

export class CreateReconciliationDto {
  @IsUUID()
  accountId: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsNumber()
  actualBalance: number;
}
