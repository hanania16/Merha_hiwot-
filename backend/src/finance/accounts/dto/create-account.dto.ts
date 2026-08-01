import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  @IsString()
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;
}
