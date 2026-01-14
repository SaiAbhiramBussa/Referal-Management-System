import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject, Min } from 'class-validator';

export class CreateRewardDto {
  @ApiProperty({ description: 'Referrer user ID' })
  @IsString()
  referrerId: string;

  @ApiProperty({ description: 'Referred user ID' })
  @IsString()
  referredId: string;

  @ApiProperty({ description: 'Reward amount', example: 500 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Unique idempotency key for this request' })
  @IsString()
  idempotencyKey: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ReverseRewardDto {
  @ApiProperty({ description: 'Ledger entry ID to reverse' })
  @IsString()
  ledgerEntryId: string;

  @ApiPropertyOptional({ description: 'Reason for reversal' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ConfirmRewardDto {
  @ApiProperty({ description: 'Reward ID to confirm' })
  @IsString()
  rewardId: string;
}

export class PayRewardDto {
  @ApiProperty({ description: 'Reward ID to pay' })
  @IsString()
  rewardId: string;

  @ApiPropertyOptional({ description: 'Payment reference' })
  @IsOptional()
  @IsString()
  paymentReference?: string;
}
