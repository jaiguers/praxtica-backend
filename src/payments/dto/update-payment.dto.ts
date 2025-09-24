import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdatePaymentDto {
  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsEnum(['pending', 'completed', 'failed', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  failureReason?: string;
}
