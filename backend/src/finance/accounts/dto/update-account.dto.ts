import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountType } from '@prisma/client';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
