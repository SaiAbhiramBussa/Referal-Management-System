import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UsePipes,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBody,
} from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { zodValidationPipe } from '../../common/pipes';
import {
    createRewardSchema,
    confirmRewardSchema,
    payRewardSchema,
    reverseRewardSchema,
    CreateRewardDto,
    ConfirmRewardDto,
    PayRewardDto,
    ReverseRewardDto,
} from '../../common/schemas';
import { RewardStatus } from '@prisma/client';

@ApiTags('rewards')
@Controller('rewards')
export class RewardsController {
    constructor(private readonly rewardsService: RewardsService) { }

    @Post('credit')
    @ApiOperation({
        summary: 'Create a reward credit (idempotent)',
        description: 'Creates a new referral reward with a CREDIT ledger entry. Idempotent based on idempotencyKey.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                referrerId: { type: 'string', format: 'uuid' },
                referredId: { type: 'string', format: 'uuid' },
                amount: { type: 'string', example: '500.00' },
                currency: { type: 'string', default: 'INR' },
                idempotencyKey: { type: 'string' },
                metadata: { type: 'object' },
            },
            required: ['referrerId', 'referredId', 'amount', 'idempotencyKey'],
        },
    })
    @ApiResponse({ status: 201, description: 'Reward created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 409, description: 'Idempotency key conflict' })
    @UsePipes(zodValidationPipe(createRewardSchema))
    createCredit(@Body() createRewardDto: CreateRewardDto) {
        return this.rewardsService.createCredit(createRewardDto);
    }

    @Post('confirm')
    @ApiOperation({
        summary: 'Confirm a pending reward',
        description: 'Transitions reward from PENDING to CONFIRMED status.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                rewardId: { type: 'string', format: 'uuid' },
            },
            required: ['rewardId'],
        },
    })
    @ApiResponse({ status: 200, description: 'Reward confirmed' })
    @ApiResponse({ status: 400, description: 'Invalid status transition' })
    @ApiResponse({ status: 404, description: 'Reward not found' })
    @UsePipes(zodValidationPipe(confirmRewardSchema))
    confirm(@Body() confirmRewardDto: ConfirmRewardDto) {
        return this.rewardsService.confirm(confirmRewardDto.rewardId);
    }

    @Post('pay')
    @ApiOperation({
        summary: 'Pay a confirmed reward',
        description: 'Transitions reward from CONFIRMED to PAID status. Creates a DEBIT ledger entry.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                rewardId: { type: 'string', format: 'uuid' },
            },
            required: ['rewardId'],
        },
    })
    @ApiResponse({ status: 200, description: 'Reward paid' })
    @ApiResponse({ status: 400, description: 'Invalid status transition' })
    @ApiResponse({ status: 404, description: 'Reward not found' })
    @UsePipes(zodValidationPipe(payRewardSchema))
    pay(@Body() payRewardDto: PayRewardDto) {
        return this.rewardsService.pay(payRewardDto.rewardId);
    }

    @Post('reverse')
    @ApiOperation({
        summary: 'Reverse a reward',
        description: 'Creates a REVERSAL ledger entry and marks reward as REVERSED. Cannot reverse PAID rewards.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                rewardId: { type: 'string', format: 'uuid' },
                reason: { type: 'string' },
            },
            required: ['rewardId'],
        },
    })
    @ApiResponse({ status: 200, description: 'Reward reversed' })
    @ApiResponse({ status: 400, description: 'Invalid status transition or already reversed' })
    @ApiResponse({ status: 404, description: 'Reward not found' })
    @UsePipes(zodValidationPipe(reverseRewardSchema))
    reverse(@Body() reverseRewardDto: ReverseRewardDto) {
        return this.rewardsService.reverse(reverseRewardDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all rewards' })
    @ApiQuery({ name: 'status', required: false, enum: RewardStatus })
    @ApiQuery({ name: 'limit', required: false, type: 'number' })
    @ApiResponse({ status: 200, description: 'List of rewards' })
    findAll(
        @Query('status') status?: RewardStatus,
        @Query('limit') limit?: number,
    ) {
        return this.rewardsService.findAll(status, limit);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a reward by ID' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'Reward found' })
    @ApiResponse({ status: 404, description: 'Reward not found' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.rewardsService.findOne(id);
    }
}
