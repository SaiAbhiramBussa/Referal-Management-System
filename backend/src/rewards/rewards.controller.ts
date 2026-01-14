import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { CreateRewardDto, ReverseRewardDto, ConfirmRewardDto, PayRewardDto } from './dto/rewards.dto';

@ApiTags('rewards')
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Post('credit')
  @ApiOperation({ 
    summary: 'Create a reward with credit ledger entry',
    description: 'Idempotent endpoint to create a reward and associated CREDIT ledger entry. Uses idempotencyKey to ensure safe retries.'
  })
  @ApiResponse({ status: 201, description: 'Reward and ledger entry created successfully' })
  @ApiResponse({ status: 409, description: 'Idempotency key conflict with different parameters' })
  @ApiResponse({ status: 404, description: 'Referrer or referred user not found' })
  async createReward(@Body() dto: CreateRewardDto) {
    return this.rewardsService.createReward(dto);
  }

  @Post('reverse')
  @ApiOperation({ 
    summary: 'Reverse a ledger entry',
    description: 'Creates a reversal ledger entry and updates the associated reward status to REVERSED'
  })
  @ApiResponse({ status: 201, description: 'Reversal entry created successfully' })
  @ApiResponse({ status: 404, description: 'Ledger entry not found' })
  @ApiResponse({ status: 400, description: 'Entry cannot be reversed (already voided)' })
  @ApiResponse({ status: 409, description: 'Entry has already been reversed' })
  async reverseEntry(@Body() dto: ReverseRewardDto) {
    return this.rewardsService.reverseEntry(dto);
  }

  @Post('confirm')
  @ApiOperation({ 
    summary: 'Confirm a pending reward',
    description: 'Transitions reward status from PENDING to CONFIRMED'
  })
  @ApiResponse({ status: 200, description: 'Reward confirmed successfully' })
  @ApiResponse({ status: 404, description: 'Reward not found' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async confirmReward(@Body() dto: ConfirmRewardDto) {
    return this.rewardsService.confirmReward(dto);
  }

  @Post('pay')
  @ApiOperation({ 
    summary: 'Pay a confirmed reward',
    description: 'Transitions reward from CONFIRMED to PAID and creates a DEBIT ledger entry'
  })
  @ApiResponse({ status: 200, description: 'Reward paid successfully' })
  @ApiResponse({ status: 404, description: 'Reward not found' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async payReward(@Body() dto: PayRewardDto) {
    return this.rewardsService.payReward(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reward by ID' })
  @ApiParam({ name: 'id', description: 'Reward ID' })
  @ApiResponse({ status: 200, description: 'Reward found' })
  @ApiResponse({ status: 404, description: 'Reward not found' })
  async getReward(@Param('id') id: string) {
    return this.rewardsService.getReward(id);
  }
}
