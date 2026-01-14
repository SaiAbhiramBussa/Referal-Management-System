import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Reward, RewardStatus, LedgerEntry, LedgerEntryType, LedgerEntryStatus, Prisma } from '@prisma/client';
import { CreateRewardDto, ReverseRewardDto, ConfirmRewardDto, PayRewardDto } from './dto/rewards.dto';
import { Decimal } from 'decimal.js';
import * as crypto from 'crypto';

// Valid state transitions
const VALID_TRANSITIONS: Record<RewardStatus, RewardStatus[]> = {
  [RewardStatus.PENDING]: [RewardStatus.CONFIRMED, RewardStatus.REVERSED],
  [RewardStatus.CONFIRMED]: [RewardStatus.PAID, RewardStatus.REVERSED],
  [RewardStatus.PAID]: [],
  [RewardStatus.REVERSED]: [],
};

@Injectable()
export class RewardsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a reward with idempotency support
   * POST /rewards/credit
   */
  async createReward(dto: CreateRewardDto): Promise<{ reward: Reward; ledgerEntry: LedgerEntry }> {
    const requestHash = this.computeRequestHash(dto);

    // Check for existing idempotency key
    const existingKey = await this.prisma.idempotencyKey.findUnique({
      where: { key: dto.idempotencyKey },
    });

    if (existingKey) {
      // Validate request hash matches
      if (existingKey.requestHash !== requestHash) {
        throw new ConflictException('Idempotency key already used with different request parameters');
      }
      // Return cached response
      return existingKey.response as unknown as { reward: Reward; ledgerEntry: LedgerEntry };
    }

    // Validate users exist
    const [referrer, referred] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.referrerId } }),
      this.prisma.user.findUnique({ where: { id: dto.referredId } }),
    ]);

    if (!referrer) {
      throw new NotFoundException(`Referrer with ID ${dto.referrerId} not found`);
    }
    if (!referred) {
      throw new NotFoundException(`Referred user with ID ${dto.referredId} not found`);
    }

    // Execute in a transaction for atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the reward
      const reward = await tx.reward.create({
        data: {
          referrerId: dto.referrerId,
          referredId: dto.referredId,
          amount: new Decimal(dto.amount),
          currency: dto.currency || 'INR',
          idempotencyKey: dto.idempotencyKey,
          status: RewardStatus.PENDING,
          metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : Prisma.JsonNull,
        },
      });

      // Create the ledger entry (CREDIT)
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          userId: dto.referrerId,
          rewardId: reward.id,
          type: LedgerEntryType.CREDIT,
          amount: new Decimal(dto.amount),
          currency: dto.currency || 'INR',
          status: LedgerEntryStatus.POSTED,
          metadata: { action: 'reward_credit', rewardId: reward.id },
        },
      });

      // Store idempotency key with response
      const response = { reward, ledgerEntry };
      await tx.idempotencyKey.create({
        data: {
          key: dto.idempotencyKey,
          requestHash,
          response: JSON.parse(JSON.stringify(response)),
        },
      });

      return response;
    });

    return result;
  }

  /**
   * Reverse a ledger entry
   * POST /rewards/reverse
   */
  async reverseEntry(dto: ReverseRewardDto): Promise<{ reversalEntry: LedgerEntry; reward?: Reward }> {
    // Find the original entry
    const originalEntry = await this.prisma.ledgerEntry.findUnique({
      where: { id: dto.ledgerEntryId },
      include: { reward: true },
    });

    if (!originalEntry) {
      throw new NotFoundException(`Ledger entry with ID ${dto.ledgerEntryId} not found`);
    }

    if (originalEntry.status === LedgerEntryStatus.VOID) {
      throw new BadRequestException('Cannot reverse a voided entry');
    }

    // Check if already reversed (unique constraint on reversalOfEntryId handles this too)
    const existingReversal = await this.prisma.ledgerEntry.findUnique({
      where: { reversalOfEntryId: dto.ledgerEntryId },
    });

    if (existingReversal) {
      throw new ConflictException('This entry has already been reversed');
    }

    // Execute reversal in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create reversal entry
      const reversalEntry = await tx.ledgerEntry.create({
        data: {
          userId: originalEntry.userId,
          rewardId: originalEntry.rewardId,
          type: LedgerEntryType.REVERSAL,
          amount: originalEntry.amount,
          currency: originalEntry.currency,
          status: LedgerEntryStatus.POSTED,
          reversalOfEntryId: originalEntry.id,
          metadata: {
            action: 'reversal',
            originalEntryId: originalEntry.id,
            reason: dto.reason || 'Manual reversal',
          },
        },
      });

      // If there's an associated reward, update its status
      let updatedReward: Reward | undefined;
      if (originalEntry.reward) {
        this.validateStatusTransition(originalEntry.reward.status, RewardStatus.REVERSED);
        updatedReward = await tx.reward.update({
          where: { id: originalEntry.reward.id },
          data: { status: RewardStatus.REVERSED },
        });
      }

      return { reversalEntry, reward: updatedReward };
    });

    return result;
  }

  /**
   * Confirm a reward (PENDING → CONFIRMED)
   * POST /rewards/confirm
   */
  async confirmReward(dto: ConfirmRewardDto): Promise<Reward> {
    const reward = await this.prisma.reward.findUnique({
      where: { id: dto.rewardId },
    });

    if (!reward) {
      throw new NotFoundException(`Reward with ID ${dto.rewardId} not found`);
    }

    this.validateStatusTransition(reward.status, RewardStatus.CONFIRMED);

    return this.prisma.reward.update({
      where: { id: dto.rewardId },
      data: { status: RewardStatus.CONFIRMED },
    });
  }

  /**
   * Pay a reward (CONFIRMED → PAID)
   * POST /rewards/pay
   */
  async payReward(dto: PayRewardDto): Promise<{ reward: Reward; ledgerEntry: LedgerEntry }> {
    const reward = await this.prisma.reward.findUnique({
      where: { id: dto.rewardId },
    });

    if (!reward) {
      throw new NotFoundException(`Reward with ID ${dto.rewardId} not found`);
    }

    this.validateStatusTransition(reward.status, RewardStatus.PAID);

    // Execute in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update reward status
      const updatedReward = await tx.reward.update({
        where: { id: dto.rewardId },
        data: { status: RewardStatus.PAID },
      });

      // Create DEBIT ledger entry for the payout
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          userId: reward.referrerId,
          rewardId: reward.id,
          type: LedgerEntryType.DEBIT,
          amount: reward.amount,
          currency: reward.currency,
          status: LedgerEntryStatus.POSTED,
          metadata: {
            action: 'reward_payout',
            paymentReference: dto.paymentReference,
          },
        },
      });

      return { reward: updatedReward, ledgerEntry };
    });

    return result;
  }

  /**
   * Get a reward by ID
   * GET /rewards/:id
   */
  async getReward(id: string): Promise<Reward> {
    const reward = await this.prisma.reward.findUnique({
      where: { id },
      include: {
        referrer: true,
        referred: true,
        ledgerEntries: true,
      },
    });

    if (!reward) {
      throw new NotFoundException(`Reward with ID ${id} not found`);
    }

    return reward;
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: RewardStatus, newStatus: RewardStatus): void {
    const validNextStatuses = VALID_TRANSITIONS[currentStatus];
    if (!validNextStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition: ${currentStatus} → ${newStatus}. Valid transitions: ${validNextStatuses.join(', ') || 'none'}`
      );
    }
  }

  /**
   * Compute hash of request for idempotency validation
   */
  private computeRequestHash(dto: CreateRewardDto): string {
    const normalized = JSON.stringify({
      referrerId: dto.referrerId,
      referredId: dto.referredId,
      amount: dto.amount,
      currency: dto.currency || 'INR',
    });
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
}
