import { ArrayMinSize, IsArray, IsNumber, IsString, Min } from 'class-validator';

export class CreateReceiptDto {
  @IsString()
  studentId: string;

  @IsArray()
  @ArrayMinSize(1)
  monthsPaid: string[];

  @IsNumber()
  @Min(0)
  amount: number;
}
