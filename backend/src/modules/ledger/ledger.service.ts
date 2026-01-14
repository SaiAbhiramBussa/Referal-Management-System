import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerEntryType, LedgerStatus, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

// Configure Decimal.js for precise money calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface CreateLedgerEntryParams {
    userId: string;
    rewardId?: string;
    type: LedgerEntryType;
    amount: string | Decimal;
    currency?: string;
    metadata?: Record<string, any>;
    reversalOfEntryId?: string;
}

@Injectable()
export class LedgerService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a new immutable ledger entry.
     * This is the ONLY way to add entries to the ledger.
     * Entries cannot be modified or deleted once created.
     */
    async createEntry(
        params: CreateLedgerEntryParams,
        tx?: Prisma.TransactionClient,
    ) {
        const prisma = tx || this.prisma;

        // Validate amount is positive
        const amount = new Decimal(params.amount);
        if (amount.isNegative() || amount.isZero()) {
            throw new BadRequestException('Amount must be positive');
        }

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: params.userId },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${params.userId} not found`);
        }

        // If this is a reversal, validate the original entry exists
        if (params.reversalOfEntryId) {
            const originalEntry = await prisma.ledgerEntry.findUnique({
                where: { id: params.reversalOfEntryId },
            });

            if (!originalEntry) {
                throw new NotFoundException(
                    `Ledger entry with ID ${params.reversalOfEntryId} not found`,
                );
            }

            if (originalEntry.status === LedgerStatus.VOID) {
                throw new BadRequestException('Cannot reverse a void entry');
            }
        }

        // Create the immutable ledger entry
        const entry = await prisma.ledgerEntry.create({
            data: {
                userId: params.userId,
                rewardId: params.rewardId,
                type: params.type,
                amount: amount.toString(),
                currency: params.currency || 'INR',
                status: LedgerStatus.POSTED,
                reversalOfEntryId: params.reversalOfEntryId,
                metadata: params.metadata || {},
            },
            include: {
                reward: true,
            },
        });

        return entry;
    }

    /**
     * Create a CREDIT entry for a user.
     * Used when granting rewards.
     */
    async createCredit(
        userId: string,
        amount: string | Decimal,
        rewardId?: string,
        metadata?: Record<string, any>,
        tx?: Prisma.TransactionClient,
    ) {
        return this.createEntry(
            {
                userId,
                rewardId,
                type: LedgerEntryType.CREDIT,
                amount,
                metadata: { ...metadata, action: 'credit' },
            },
            tx,
        );
    }

    /**
     * Create a DEBIT entry for a user.
     * Used when paying out rewards.
     */
    async createDebit(
        userId: string,
        amount: string | Decimal,
        rewardId?: string,
        metadata?: Record<string, any>,
        tx?: Prisma.TransactionClient,
    ) {
        return this.createEntry(
            {
                userId,
                rewardId,
                type: LedgerEntryType.DEBIT,
                amount,
                metadata: { ...metadata, action: 'debit' },
            },
            tx,
        );
    }

    /**
     * Create a REVERSAL entry that voids a previous entry.
     * The original entry is marked as VOID, and a new REVERSAL entry is created.
     * Double reversal is prevented by unique constraint on reversalOfEntryId.
     */
    async reverseEntry(
        entryId: string,
        reason?: string,
        tx?: Prisma.TransactionClient,
    ) {
        const prisma = tx || this.prisma;

        const originalEntry = await prisma.ledgerEntry.findUnique({
            where: { id: entryId },
        });

        if (!originalEntry) {
            throw new NotFoundException(`Ledger entry with ID ${entryId} not found`);
        }

        if (originalEntry.status === LedgerStatus.VOID) {
            throw new BadRequestException('Entry is already void');
        }

        // Check if this entry has already been reversed (unique constraint will also catch this)
        const existingReversal = await prisma.ledgerEntry.findUnique({
            where: { reversalOfEntryId: entryId },
        });

        if (existingReversal) {
            throw new BadRequestException('Entry has already been reversed');
        }

        // Create the reversal entry
        const reversalEntry = await this.createEntry(
            {
                userId: originalEntry.userId,
                rewardId: originalEntry.rewardId ?? undefined,
                type: LedgerEntryType.REVERSAL,
                amount: originalEntry.amount.toString(),
                currency: originalEntry.currency,
                reversalOfEntryId: entryId,
                metadata: {
                    action: 'reversal',
                    reason,
                    originalEntryId: entryId,
                    originalType: originalEntry.type,
                },
            },
            prisma,
        );

        // Mark the original entry as VOID
        // NOTE: This is the ONLY mutation allowed on ledger entries,
        // and it only changes the status to VOID
        await prisma.ledgerEntry.update({
            where: { id: entryId },
            data: { status: LedgerStatus.VOID },
        });

        return reversalEntry;
    }

    /**
     * Get ledger entries for a user with cursor-based pagination.
     */
    async getEntriesByUser(
        userId: string,
        cursor?: string,
        limit: number = 20,
    ) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        const entries = await this.prisma.ledgerEntry.findMany({
            where: { userId },
            take: limit + 1, // Fetch one extra to check if there are more
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                reward: {
                    select: {
                        id: true,
                        status: true,
                        amount: true,
                    },
                },
            },
        });

        const hasMore = entries.length > limit;
        const data = hasMore ? entries.slice(0, limit) : entries;
        const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

        return {
            data,
            pagination: {
                hasMore,
                nextCursor,
                limit,
            },
        };
    }

    /**
     * Get a single ledger entry by ID.
     */
    async getEntryById(id: string) {
        const entry = await this.prisma.ledgerEntry.findUnique({
            where: { id },
            include: {
                reward: true,
                reversalOf: true,
                reversedBy: true,
            },
        });

        if (!entry) {
            throw new NotFoundException(`Ledger entry with ID ${id} not found`);
        }

        return entry;
    }

    /**
     * Calculate the current balance for a user.
     * Balance = sum(CREDITS) - sum(DEBITS) - sum(REVERSALS of CREDITS) + sum(REVERSALS of DEBITS)
     */
    async calculateBalance(userId: string): Promise<Decimal> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        const entries = await this.prisma.ledgerEntry.findMany({
            where: {
                userId,
                status: LedgerStatus.POSTED,
            },
        });

        let balance = new Decimal(0);

        for (const entry of entries) {
            const amount = new Decimal(entry.amount.toString());

            switch (entry.type) {
                case LedgerEntryType.CREDIT:
                    balance = balance.plus(amount);
                    break;
                case LedgerEntryType.DEBIT:
                    balance = balance.minus(amount);
                    break;
                case LedgerEntryType.REVERSAL:
                    // Reversals are already handled by voiding the original entry
                    break;
            }
        }

        return balance;
    }
}
