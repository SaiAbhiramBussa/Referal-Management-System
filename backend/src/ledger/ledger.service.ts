import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const CreateEntrySchema = z.object({
  debitAccountId: z.string().uuid(),
  creditAccountId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a double-entry ledger transaction
   * This ensures the accounting equation always balances
   */
  async createEntry(userId: string, data: z.infer<typeof CreateEntrySchema>) {
    // Validate with Zod
    const validated = CreateEntrySchema.parse(data);

    // Verify accounts exist and belong to user
    const [debitAccount, creditAccount] = await Promise.all([
      this.prisma.account.findFirst({
        where: { id: validated.debitAccountId, userId },
      }),
      this.prisma.account.findFirst({
        where: { id: validated.creditAccountId, userId },
      }),
    ]);

    if (!debitAccount || !creditAccount) {
      throw new BadRequestException('Invalid account(s)');
    }

    const transactionId = uuidv4();
    const amount = new Decimal(validated.amount);

    // Create ledger entry and update account balances in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create ledger entry
      const entry = await tx.ledgerEntry.create({
        data: {
          userId,
          transactionId,
          debitAccountId: validated.debitAccountId,
          creditAccountId: validated.creditAccountId,
          amount,
          description: validated.description,
          metadata: validated.metadata,
        },
      });

      // Update debit account (increase balance for asset accounts)
      await tx.account.update({
        where: { id: validated.debitAccountId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // Update credit account (decrease balance)
      await tx.account.update({
        where: { id: validated.creditAccountId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      return entry;
    });

    return result;
  }

  /**
   * Add reward to user's account
   */
  async addReward(userId: string, amount: number, description: string, metadata?: any) {
    // Get user's reward account
    const account = await this.prisma.account.findFirst({
      where: { userId, type: 'ASSET', name: 'Rewards Account' },
    });

    if (!account) {
      throw new BadRequestException('User reward account not found');
    }

    // For rewards, we create a simple ledger entry
    // In a real system, you'd have a liability account to credit
    const transactionId = uuidv4();
    const decimalAmount = new Decimal(amount);

    const entry = await this.prisma.$transaction(async (tx) => {
      const newEntry = await tx.ledgerEntry.create({
        data: {
          userId,
          transactionId,
          debitAccountId: account.id,
          creditAccountId: account.id, // Simplified - should be a liability account
          amount: decimalAmount,
          description,
          metadata,
        },
      });

      await tx.account.update({
        where: { id: account.id },
        data: {
          balance: {
            increment: decimalAmount,
          },
        },
      });

      return newEntry;
    });

    return entry;
  }

  /**
   * Get user's account balance
   */
  async getBalance(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        name: true,
        balance: true,
        currency: true,
      },
    });

    return accounts;
  }

  /**
   * Get ledger entries for a user
   */
  async getEntries(userId: string, limit = 50, offset = 0) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { userId },
      include: {
        debitAccount: {
          select: { name: true, type: true },
        },
        creditAccount: {
          select: { name: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.ledgerEntry.count({ where: { userId } });

    return {
      entries,
      total,
      limit,
      offset,
    };
  }
}
