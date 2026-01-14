import { Test, TestingModule } from '@nestjs/testing';
import { RewardsService } from '../src/rewards/rewards.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RewardStatus, LedgerEntryStatus, LedgerEntryType } from '@prisma/client';
import { Decimal } from 'decimal.js';

describe('RewardsService', () => {
  let service: RewardsService;
  let prismaService: PrismaService;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrismaService: any = {
    user: {
      findUnique: jest.fn(),
    },
    reward: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ledgerEntry: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    idempotencyKey: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: typeof mockPrismaService) => Promise<unknown>) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RewardsService>(RewardsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createReward - Idempotency', () => {
    it('should create a new reward and ledger entry on first request', async () => {
      const dto = {
        referrerId: 'user-1',
        referredId: 'user-2',
        amount: 500,
        currency: 'INR',
        idempotencyKey: 'unique-key-1',
      };

      mockPrismaService.idempotencyKey.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        return Promise.resolve({ id: where.id, email: `${where.id}@test.com` });
      });

      const mockReward = {
        id: 'reward-1',
        ...dto,
        status: RewardStatus.PENDING,
        amount: new Decimal(dto.amount),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLedgerEntry = {
        id: 'ledger-1',
        userId: dto.referrerId,
        rewardId: 'reward-1',
        type: LedgerEntryType.CREDIT,
        amount: new Decimal(dto.amount),
        currency: 'INR',
        status: LedgerEntryStatus.POSTED,
        createdAt: new Date(),
      };

      mockPrismaService.reward.create.mockResolvedValue(mockReward);
      mockPrismaService.ledgerEntry.create.mockResolvedValue(mockLedgerEntry);
      mockPrismaService.idempotencyKey.create.mockResolvedValue({});

      const result = await service.createReward(dto);

      expect(result.reward).toBeDefined();
      expect(result.ledgerEntry).toBeDefined();
      expect(mockPrismaService.reward.create).toHaveBeenCalled();
      expect(mockPrismaService.ledgerEntry.create).toHaveBeenCalled();
      expect(mockPrismaService.idempotencyKey.create).toHaveBeenCalled();
    });

    it('should return cached response on retry with same idempotency key', async () => {
      const dto = {
        referrerId: 'user-1',
        referredId: 'user-2',
        amount: 500,
        currency: 'INR',
        idempotencyKey: 'existing-key',
      };

      const cachedResponse = {
        reward: { id: 'cached-reward' },
        ledgerEntry: { id: 'cached-ledger' },
      };

      // Compute the same hash as the service
      const crypto = require('crypto');
      const normalized = JSON.stringify({
        referrerId: dto.referrerId,
        referredId: dto.referredId,
        amount: dto.amount,
        currency: dto.currency,
      });
      const requestHash = crypto.createHash('sha256').update(normalized).digest('hex');

      mockPrismaService.idempotencyKey.findUnique.mockResolvedValue({
        key: 'existing-key',
        requestHash: requestHash,
        response: cachedResponse,
      });

      const result = await service.createReward(dto);

      expect(result).toEqual(cachedResponse);
      expect(mockPrismaService.reward.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when idempotency key used with different params', async () => {
      const dto = {
        referrerId: 'user-1',
        referredId: 'user-2',
        amount: 500,
        currency: 'INR',
        idempotencyKey: 'existing-key',
      };

      mockPrismaService.idempotencyKey.findUnique.mockResolvedValue({
        key: 'existing-key',
        requestHash: 'different-hash',
        response: {},
      });

      await expect(service.createReward(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when referrer does not exist', async () => {
      const dto = {
        referrerId: 'non-existent',
        referredId: 'user-2',
        amount: 500,
        idempotencyKey: 'key-1',
      };

      mockPrismaService.idempotencyKey.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        return where.id === 'non-existent' ? null : { id: where.id };
      });

      await expect(service.createReward(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reverseEntry - Reversal Safety', () => {
    it('should create reversal entry for existing ledger entry', async () => {
      const originalEntry = {
        id: 'ledger-1',
        userId: 'user-1',
        rewardId: 'reward-1',
        type: LedgerEntryType.CREDIT,
        amount: new Decimal(500),
        currency: 'INR',
        status: LedgerEntryStatus.POSTED,
        reward: {
          id: 'reward-1',
          status: RewardStatus.PENDING,
        },
      };

      mockPrismaService.ledgerEntry.findUnique.mockImplementation((args: { where: { id?: string; reversalOfEntryId?: string } }) => {
        if (args.where.id === 'ledger-1') {
          return Promise.resolve(originalEntry);
        }
        if (args.where.reversalOfEntryId === 'ledger-1') {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      const reversalEntry = {
        id: 'reversal-1',
        userId: 'user-1',
        rewardId: 'reward-1',
        type: LedgerEntryType.REVERSAL,
        amount: new Decimal(500),
        reversalOfEntryId: 'ledger-1',
        status: LedgerEntryStatus.POSTED,
      };

      mockPrismaService.ledgerEntry.create.mockResolvedValue(reversalEntry);
      mockPrismaService.reward.update.mockResolvedValue({
        ...originalEntry.reward,
        status: RewardStatus.REVERSED,
      });

      const result = await service.reverseEntry({
        ledgerEntryId: 'ledger-1',
        reason: 'Test reversal',
      });

      expect(result.reversalEntry).toBeDefined();
      expect(result.reversalEntry.reversalOfEntryId).toBe('ledger-1');
    });

    it('should throw ConflictException when entry already reversed', async () => {
      const originalEntry = {
        id: 'ledger-1',
        userId: 'user-1',
        type: LedgerEntryType.CREDIT,
        amount: new Decimal(500),
        status: LedgerEntryStatus.POSTED,
        reward: null,
      };

      mockPrismaService.ledgerEntry.findUnique.mockImplementation((args: { where: { id?: string; reversalOfEntryId?: string } }) => {
        if (args.where.id === 'ledger-1') {
          return Promise.resolve(originalEntry);
        }
        if (args.where.reversalOfEntryId === 'ledger-1') {
          return Promise.resolve({ id: 'existing-reversal' });
        }
        return Promise.resolve(null);
      });

      await expect(service.reverseEntry({ ledgerEntryId: 'ledger-1' }))
        .rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when entry does not exist', async () => {
      mockPrismaService.ledgerEntry.findUnique.mockResolvedValue(null);

      await expect(service.reverseEntry({ ledgerEntryId: 'non-existent' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmReward - Status Transitions', () => {
    it('should confirm a PENDING reward', async () => {
      const pendingReward = {
        id: 'reward-1',
        status: RewardStatus.PENDING,
      };

      mockPrismaService.reward.findUnique.mockResolvedValue(pendingReward);
      mockPrismaService.reward.update.mockResolvedValue({
        ...pendingReward,
        status: RewardStatus.CONFIRMED,
      });

      const result = await service.confirmReward({ rewardId: 'reward-1' });

      expect(result.status).toBe(RewardStatus.CONFIRMED);
    });

    it('should throw BadRequestException for invalid transition (PAID → CONFIRMED)', async () => {
      mockPrismaService.reward.findUnique.mockResolvedValue({
        id: 'reward-1',
        status: RewardStatus.PAID,
      });

      await expect(service.confirmReward({ rewardId: 'reward-1' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid transition (REVERSED → CONFIRMED)', async () => {
      mockPrismaService.reward.findUnique.mockResolvedValue({
        id: 'reward-1',
        status: RewardStatus.REVERSED,
      });

      await expect(service.confirmReward({ rewardId: 'reward-1' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('payReward - Status Transitions', () => {
    it('should pay a CONFIRMED reward and create DEBIT entry', async () => {
      const confirmedReward = {
        id: 'reward-1',
        referrerId: 'user-1',
        amount: new Decimal(500),
        currency: 'INR',
        status: RewardStatus.CONFIRMED,
      };

      mockPrismaService.reward.findUnique.mockResolvedValue(confirmedReward);
      mockPrismaService.reward.update.mockResolvedValue({
        ...confirmedReward,
        status: RewardStatus.PAID,
      });
      mockPrismaService.ledgerEntry.create.mockResolvedValue({
        id: 'debit-1',
        type: LedgerEntryType.DEBIT,
        amount: new Decimal(500),
      });

      const result = await service.payReward({ rewardId: 'reward-1' });

      expect(result.reward.status).toBe(RewardStatus.PAID);
      expect(result.ledgerEntry.type).toBe(LedgerEntryType.DEBIT);
    });

    it('should throw BadRequestException for invalid transition (PENDING → PAID)', async () => {
      mockPrismaService.reward.findUnique.mockResolvedValue({
        id: 'reward-1',
        status: RewardStatus.PENDING,
      });

      await expect(service.payReward({ rewardId: 'reward-1' }))
        .rejects.toThrow(BadRequestException);
    });
  });
});
