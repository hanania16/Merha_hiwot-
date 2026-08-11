import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
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

  /**
   * Opening balance, recorded as the account's first ledger entry (an
   * OPENING_BALANCE Income row) — never just a number on the account row.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialBalance?: number;
}
