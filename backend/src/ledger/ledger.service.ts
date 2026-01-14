import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerEntry } from '@prisma/client';

export interface PaginatedLedger {
  entries: LedgerEntry[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get ledger entries for a user with cursor-based pagination
   * GET /ledger/:userId
   */
  async getLedgerEntries(
    userId: string, 
    cursor?: string, 
    limit: number = 20
  ): Promise<PaginatedLedger> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Build query with cursor-based pagination
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to determine if there are more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
      include: {
        reward: true,
        originalEntry: true,
      },
    });

    const hasMore = entries.length > limit;
    const resultEntries = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? resultEntries[resultEntries.length - 1].id : null;

    return {
      entries: resultEntries,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get a single ledger entry by ID
   */
  async getEntry(id: string): Promise<LedgerEntry> {
    const entry = await this.prisma.ledgerEntry.findUnique({
      where: { id },
      include: {
        reward: true,
        originalEntry: true,
        reversalEntry: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Ledger entry with ID ${id} not found`);
    }

    return entry;
  }

  /**
   * Calculate user balance from ledger entries
   */
  async getUserBalance(userId: string): Promise<{ balance: string; currency: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Sum all posted entries: CREDIT adds, DEBIT/REVERSAL subtracts
    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        userId,
        status: 'POSTED',
      },
      select: {
        type: true,
        amount: true,
        currency: true,
      },
    });

    let balance = 0;
    for (const entry of entries) {
      const amount = Number(entry.amount);
      if (entry.type === 'CREDIT') {
        balance += amount;
      } else {
        balance -= amount;
      }
    }

    return {
      balance: balance.toFixed(2),
      currency: 'INR',
    };
  }
}
