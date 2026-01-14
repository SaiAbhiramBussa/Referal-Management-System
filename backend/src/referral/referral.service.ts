import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { z } from 'zod';
import { randomBytes } from 'crypto';

export const CreateReferralSchema = z.object({
  referredEmail: z.string().email(),
  referredName: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

export const CompleteReferralSchema = z.object({
  code: z.string().min(1),
});

@Injectable()
export class ReferralService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
  ) {}

  /**
   * Create a referral
   */
  async createReferral(referrerId: string, data: z.infer<typeof CreateReferralSchema>) {
    const validated = CreateReferralSchema.parse(data);

    // Check if referred user already exists
    let referredUser = await this.prisma.user.findUnique({
      where: { email: validated.referredEmail },
    });

    // If user doesn't exist, create a placeholder
    if (!referredUser) {
      const tempPassword = randomBytes(16).toString('hex');
      
      referredUser = await this.prisma.user.create({
        data: {
          email: validated.referredEmail,
          name: validated.referredName,
          password: tempPassword, // In real system, send invitation email
        },
      });

      // Create default account for new user
      await this.prisma.account.create({
        data: {
          userId: referredUser.id,
          type: 'ASSET',
          name: 'Rewards Account',
          balance: 0,
          currency: 'USD',
        },
      });
    }

    // Generate unique referral code
    const code = this.generateReferralCode();

    // Create referral
    const referral = await this.prisma.referral.create({
      data: {
        referrerId,
        referredId: referredUser.id,
        code,
        status: 'PENDING',
        metadata: validated.metadata,
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

    return referral;
  }

  /**
   * Complete a referral and award rewards
   */
  async completeReferral(data: z.infer<typeof CompleteReferralSchema>) {
    const validated = CompleteReferralSchema.parse(data);

    const referral = await this.prisma.referral.findUnique({
      where: { code: validated.code },
      include: {
        referrer: true,
        referred: true,
      },
    });

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    if (referral.status === 'COMPLETED' || referral.status === 'REWARDED') {
      throw new BadRequestException('Referral already completed');
    }

    // Update referral status
    const updated = await this.prisma.referral.update({
      where: { code: validated.code },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Award rewards to both referrer and referred
    // Referrer gets $10, referred gets $5 (example amounts)
    await this.awardReferralRewards(referral.referrerId, referral.referredId, referral.id);

    // Update status to REWARDED
    await this.prisma.referral.update({
      where: { code: validated.code },
      data: { status: 'REWARDED' },
    });

    return updated;
  }

  /**
   * Award rewards for completed referral
   */
  private async awardReferralRewards(referrerId: string, referredId: string, referralId: string) {
    const referrerReward = 10;
    const referredReward = 5;

    // Award to referrer
    await this.ledgerService.addReward(
      referrerId,
      referrerReward,
      'Referral reward - referrer',
      { referralId, type: 'referrer_reward' },
    );

    // Award to referred
    await this.ledgerService.addReward(
      referredId,
      referredReward,
      'Referral reward - referred',
      { referralId, type: 'referred_reward' },
    );
  }

  /**
   * Get referrals for a user
   */
  async getUserReferrals(userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: {
        OR: [{ referrerId: userId }, { referredId: userId }],
      },
      include: {
        referrer: {
          select: { id: true, email: true, name: true },
        },
        referred: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return referrals;
  }

  /**
   * Get referral statistics
   */
  async getReferralStats(userId: string) {
    const [totalReferred, completedReferred, pendingReferred] = await Promise.all([
      this.prisma.referral.count({ where: { referrerId: userId } }),
      this.prisma.referral.count({ where: { referrerId: userId, status: 'REWARDED' } }),
      this.prisma.referral.count({ where: { referrerId: userId, status: 'PENDING' } }),
    ]);

    return {
      totalReferred,
      completedReferred,
      pendingReferred,
    };
  }

  /**
   * Generate a unique referral code
   */
  private generateReferralCode(): string {
    return randomBytes(6).toString('hex').toUpperCase();
  }
}
