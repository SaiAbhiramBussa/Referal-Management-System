import { Test, TestingModule } from '@nestjs/testing';
import { RulesService } from '../src/rules/rules.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConditionNode, ActionDefinition, ConditionOperator } from '../src/rules/dto/rules.dto';

describe('RulesService', () => {
  let service: RulesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    rule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RulesService>(RulesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateRules', () => {
    it('should evaluate AND conditions correctly', async () => {
      const mockRule = {
        id: 'rule-1',
        name: 'test-rule',
        version: 1,
        isActive: true,
        conditions: {
          type: 'AND',
          children: [
            { type: 'CONDITION', field: 'user.status', operator: '=', value: 'active' },
            { type: 'CONDITION', field: 'order.amount', operator: '>', value: 100 },
          ],
        } as ConditionNode,
        actions: [
          { type: 'createReward', params: { amount: 500, currency: 'INR' } },
        ] as unknown,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.rule.findMany.mockResolvedValue([mockRule]);

      const result = await service.evaluateRules({
        event: {
          user: { status: 'active' },
          order: { amount: 150 },
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].matched).toBe(true);
      expect(result[0].triggeredActions).toHaveLength(1);
    });

    it('should evaluate OR conditions correctly', async () => {
      const mockRule = {
        id: 'rule-1',
        name: 'test-rule',
        version: 1,
        isActive: true,
        conditions: {
          type: 'OR',
          children: [
            { type: 'CONDITION', field: 'user.tier', operator: '=', value: 'gold' },
            { type: 'CONDITION', field: 'user.tier', operator: '=', value: 'platinum' },
          ],
        } as ConditionNode,
        actions: [
          { type: 'issueVoucher', params: { discount: 20 } },
        ] as unknown,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.rule.findMany.mockResolvedValue([mockRule]);

      const result = await service.evaluateRules({
        event: {
          user: { tier: 'platinum' },
        },
      });

      expect(result[0].matched).toBe(true);
    });

    it('should not match when conditions fail', async () => {
      const mockRule = {
        id: 'rule-1',
        name: 'test-rule',
        version: 1,
        isActive: true,
        conditions: {
          type: 'AND',
          children: [
            { type: 'CONDITION', field: 'user.verified', operator: '=', value: true },
          ],
        } as ConditionNode,
        actions: [] as unknown,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.rule.findMany.mockResolvedValue([mockRule]);

      const result = await service.evaluateRules({
        event: {
          user: { verified: false },
        },
      });

      expect(result[0].matched).toBe(false);
      expect(result[0].triggeredActions).toHaveLength(0);
    });

    it('should handle IN operator correctly', async () => {
      const mockRule = {
        id: 'rule-1',
        name: 'test-rule',
        version: 1,
        isActive: true,
        conditions: {
          type: 'CONDITION',
          field: 'user.country',
          operator: 'in',
          value: ['IN', 'US', 'UK'],
        } as ConditionNode,
        actions: [{ type: 'createReward', params: {} }] as unknown,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.rule.findMany.mockResolvedValue([mockRule]);

      const result = await service.evaluateRules({
        event: { user: { country: 'IN' } },
      });

      expect(result[0].matched).toBe(true);
    });

    it('should handle EXISTS operator correctly', async () => {
      const mockRule = {
        id: 'rule-1',
        name: 'test-rule',
        version: 1,
        isActive: true,
        conditions: {
          type: 'CONDITION',
          field: 'user.email',
          operator: 'exists',
          value: true,
        } as ConditionNode,
        actions: [{ type: 'createReward', params: {} }] as unknown,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.rule.findMany.mockResolvedValue([mockRule]);

      const result = await service.evaluateRules({
        event: { user: { email: 'test@example.com' } },
      });

      expect(result[0].matched).toBe(true);
    });

    it('should handle nested conditions', async () => {
      const mockRule = {
        id: 'rule-1',
        name: 'test-rule',
        version: 1,
        isActive: true,
        conditions: {
          type: 'AND',
          children: [
            { type: 'CONDITION', field: 'referrer.status', operator: '=', value: 'paid' },
            {
              type: 'OR',
              children: [
                { type: 'CONDITION', field: 'referred.plan', operator: '=', value: 'premium' },
                { type: 'CONDITION', field: 'referred.plan', operator: '=', value: 'enterprise' },
              ],
            },
          ],
        } as ConditionNode,
        actions: [{ type: 'createReward', params: { amount: 500 } }] as unknown,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.rule.findMany.mockResolvedValue([mockRule]);

      const result = await service.evaluateRules({
        event: {
          referrer: { status: 'paid' },
          referred: { plan: 'enterprise' },
        },
      });

      expect(result[0].matched).toBe(true);
    });
  });

  describe('createRule', () => {
    it('should create a new rule with version 1', async () => {
      mockPrismaService.rule.findFirst.mockResolvedValue(null);
      mockPrismaService.rule.create.mockResolvedValue({
        id: 'new-rule-id',
        name: 'new-rule',
        version: 1,
        conditions: {},
        actions: [],
        isActive: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createRule({
        name: 'new-rule',
        conditions: { type: 'AND', children: [] },
        actions: [],
      });

      expect(result.version).toBe(1);
      expect(mockPrismaService.rule.create).toHaveBeenCalled();
    });

    it('should increment version for existing rule name', async () => {
      mockPrismaService.rule.findFirst.mockResolvedValue({
        id: 'existing-rule',
        name: 'test-rule',
        version: 2,
      });
      mockPrismaService.rule.create.mockResolvedValue({
        id: 'new-version-id',
        name: 'test-rule',
        version: 3,
        conditions: {},
        actions: [],
        isActive: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createRule({
        name: 'test-rule',
        conditions: { type: 'AND', children: [] },
        actions: [],
      });

      expect(result.version).toBe(3);
    });
  });
});
