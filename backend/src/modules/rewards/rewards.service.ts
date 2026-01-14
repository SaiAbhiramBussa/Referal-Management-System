import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { RewardStatus, LedgerEntryType } from '@prisma/client';
import { CreateRewardDto, ReverseRewardDto } from '../../common/schemas';
import Decimal from 'decimal.js';
import * as crypto from 'crypto';

// Valid state transitions for rewards
const VALID_TRANSITIONS: Record<RewardStatus, RewardStatus[]> = {
    [RewardStatus.PENDING]: [RewardStatus.CONFIRMED, RewardStatus.REVERSED],
    [RewardStatus.CONFIRMED]: [RewardStatus.PAID, RewardStatus.REVERSED],
    [RewardStatus.PAID]: [], // Terminal state
    [RewardStatus.REVERSED]: [], // Terminal state
};

@Injectable()
export class RewardsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly ledgerService: LedgerService,
    ) { }

    /**
     * Create a reward with idempotency support.
     * Returns the same result for duplicate requests with the same idempotency key.
     */
    async createCredit(data: CreateRewardDto) {
        // Check for existing idempotency key
        const existingKey = await this.prisma.idempotencyKey.findUnique({
            where: { key: data.idempotencyKey },
        });

        if (existingKey) {
            // Verify the request hash matches (same request being retried)
            const requestHash = this.hashRequest(data);
            if (existingKey.requestHash !== requestHash) {
                throw new ConflictException(
                    'Idempotency key already used with different request data',
                );
            }

            // Return cached response
            return existingKey.response;
        }

        // Verify both users exist
        const [referrer, referred] = await Promise.all([
            this.prisma.user.findUnique({ where: { id: data.referrerId } }),
            this.prisma.user.findUnique({ where: { id: data.referredId } }),
        ]);

        if (!referrer) {
            throw new NotFoundException(`Referrer with ID ${data.referrerId} not found`);
        }
        if (!referred) {
            throw new NotFoundException(`Referred user with ID ${data.referredId} not found`);
        }

        // Validate referrer !== referred
        if (data.referrerId === data.referredId) {
            throw new BadRequestException('Referrer and referred user cannot be the same');
        }

        // Validate amount
        const amount = new Decimal(data.amount);
        if (amount.isNegative() || amount.isZero()) {
            throw new BadRequestException('Amount must be positive');
        }

        // Create reward and ledger entry in a transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Create the reward
            const reward = await tx.reward.create({
                data: {
                    referrerId: data.referrerId,
                    referredId: data.referredId,
                    amount: data.amount,
                    currency: data.currency || 'INR',
                    status: RewardStatus.PENDING,
                    idempotencyKey: data.idempotencyKey,
                    metadata: data.metadata || {},
                },
                include: {
                    referrer: {
                        select: { id: true, email: true, name: true },
                    },
                    referred: {
                        select: { id: true, email: true, name: true },
                    },
                },
            });

            // Create CREDIT ledger entry for the referrer
            const ledgerEntry = await this.ledgerService.createCredit(
                data.referrerId,
                data.amount,
                reward.id,
                {
                    rewardType: 'referral',
                    referredUserId: data.referredId,
                },
                tx,
            );

            // Store idempotency key with response
            const response = {
                reward,
                ledgerEntry: {
                    id: ledgerEntry.id,
                    type: ledgerEntry.type,
                    amount: ledgerEntry.amount.toString(),
                    status: ledgerEntry.status,
                    createdAt: ledgerEntry.createdAt,
                },
            };

            await tx.idempotencyKey.create({
                data: {
                    key: data.idempotencyKey,
                    requestHash: this.hashRequest(data),
                    response,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                },
            });

            return response;
        });

        return result;
    }

    /**
     * Confirm a PENDING reward, transitioning it to CONFIRMED.
     */
    async confirm(rewardId: string) {
        const reward = await this.prisma.reward.findUnique({
            where: { id: rewardId },
        });

        if (!reward) {
            throw new NotFoundException(`Reward with ID ${rewardId} not found`);
        }

        this.validateTransition(reward.status, RewardStatus.CONFIRMED);

        return this.prisma.reward.update({
            where: { id: rewardId },
            data: { status: RewardStatus.CONFIRMED },
            include: {
                referrer: {
                    select: { id: true, email: true, name: true },
                },
                referred: {
                    select: { id: true, email: true, name: true },
                },
                ledgerEntries: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }

    /**
     * Pay a CONFIRMED reward, transitioning it to PAID.
     * Creates a DEBIT ledger entry to record the payout.
     */
    async pay(rewardId: string) {
        const reward = await this.prisma.reward.findUnique({
            where: { id: rewardId },
        });

        if (!reward) {
            throw new NotFoundException(`Reward with ID ${rewardId} not found`);
        }

        this.validateTransition(reward.status, RewardStatus.PAID);

        return this.prisma.$transaction(async (tx) => {
            // Create DEBIT entry for the payout
            await this.ledgerService.createDebit(
                reward.referrerId,
                reward.amount.toString(),
                reward.id,
                {
                    action: 'payout',
                    paidAt: new Date().toISOString(),
                },
                tx,
            );

            // Update reward status
            return tx.reward.update({
                where: { id: rewardId },
                data: { status: RewardStatus.PAID },
                include: {
                    referrer: {
                        select: { id: true, email: true, name: true },
                    },
                    referred: {
                        select: { id: true, email: true, name: true },
                    },
                    ledgerEntries: {
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });
        });
    }

    /**
     * Reverse a reward by creating a REVERSAL ledger entry.
     * Can reverse PENDING or CONFIRMED rewards.
     */
    async reverse(data: ReverseRewardDto) {
        const reward = await this.prisma.reward.findUnique({
            where: { id: data.rewardId },
            include: {
                ledgerEntries: {
                    where: {
                        type: LedgerEntryType.CREDIT,
                    },
                    orderBy: { createdAt: 'asc' },
                    take: 1,
                },
            },
        });

        if (!reward) {
            throw new NotFoundException(`Reward with ID ${data.rewardId} not found`);
        }

        this.validateTransition(reward.status, RewardStatus.REVERSED);

        if (reward.ledgerEntries.length === 0) {
            throw new BadRequestException('No credit entry found for this reward');
        }

        const creditEntry = reward.ledgerEntries[0];

        return this.prisma.$transaction(async (tx) => {
            // Reverse the original credit entry
            await this.ledgerService.reverseEntry(
                creditEntry.id,
                data.reason,
                tx,
            );

            // Update reward status
            return tx.reward.update({
                where: { id: data.rewardId },
                data: { status: RewardStatus.REVERSED },
                include: {
                    referrer: {
                        select: { id: true, email: true, name: true },
                    },
                    referred: {
                        select: { id: true, email: true, name: true },
                    },
                    ledgerEntries: {
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });
        });
    }

    /**
     * Get a reward by ID with all related data.
     */
    async findOne(id: string) {
        const reward = await this.prisma.reward.findUnique({
            where: { id },
            include: {
                referrer: {
                    select: { id: true, email: true, name: true },
                },
                referred: {
                    select: { id: true, email: true, name: true },
                },
                ledgerEntries: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!reward) {
            throw new NotFoundException(`Reward with ID ${id} not found`);
        }

        return reward;
    }

    /**
     * Get all rewards with optional filtering.
     */
    async findAll(status?: RewardStatus, limit: number = 50) {
        return this.prisma.reward.findMany({
            where: status ? { status } : undefined,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                referrer: {
                    select: { id: true, email: true, name: true },
                },
                referred: {
                    select: { id: true, email: true, name: true },
                },
            },
        });
    }

    /**
     * Validate that a status transition is allowed.
     */
    private validateTransition(from: RewardStatus, to: RewardStatus) {
        const allowedTransitions = VALID_TRANSITIONS[from];
        if (!allowedTransitions.includes(to)) {
            throw new BadRequestException(
                `Invalid status transition from ${from} to ${to}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`,
            );
        }
    }

    /**
     * Create a hash of the request for idempotency verification.
     */
    private hashRequest(data: CreateRewardDto): string {
        const normalized = JSON.stringify({
            referrerId: data.referrerId,
            referredId: data.referredId,
            amount: data.amount,
            currency: data.currency,
        });
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }
}
