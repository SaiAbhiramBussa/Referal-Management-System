import { z } from 'zod';

// ============================================
// USER SCHEMAS
// ============================================
export const createUserSchema = z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(1).max(255).optional(),
});

export const updateUserSchema = z.object({
    name: z.string().min(1).max(255).optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

// ============================================
// REWARD SCHEMAS
// ============================================
export const createRewardSchema = z.object({
    referrerId: z.string().uuid('Invalid referrer ID'),
    referredId: z.string().uuid('Invalid referred ID'),
    amount: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Invalid amount format'),
    currency: z.string().default('INR'),
    idempotencyKey: z.string().min(1).max(255),
    metadata: z.record(z.any()).optional(),
});

export const confirmRewardSchema = z.object({
    rewardId: z.string().uuid('Invalid reward ID'),
});

export const payRewardSchema = z.object({
    rewardId: z.string().uuid('Invalid reward ID'),
});

export const reverseRewardSchema = z.object({
    rewardId: z.string().uuid('Invalid reward ID'),
    reason: z.string().min(1).max(500).optional(),
});

export type CreateRewardDto = z.infer<typeof createRewardSchema>;
export type ConfirmRewardDto = z.infer<typeof confirmRewardSchema>;
export type PayRewardDto = z.infer<typeof payRewardSchema>;
export type ReverseRewardDto = z.infer<typeof reverseRewardSchema>;

// ============================================
// LEDGER SCHEMAS
// ============================================
export const getLedgerEntriesSchema = z.object({
    userId: z.string().uuid('Invalid user ID'),
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GetLedgerEntriesDto = z.infer<typeof getLedgerEntriesSchema>;

// ============================================
// RULE SCHEMAS
// ============================================
export const conditionOperatorSchema = z.enum(['=', '!=', '>', '<', '>=', '<=', 'in', 'not_in', 'exists', 'not_exists']);

export const conditionSchema: z.ZodType<any> = z.lazy(() =>
    z.union([
        z.object({
            operator: z.enum(['AND', 'OR']),
            operands: z.array(conditionSchema).min(1),
        }),
        z.object({
            field: z.string().min(1),
            op: conditionOperatorSchema,
            value: z.any(),
        }),
    ]),
);

export const actionSchema = z.object({
    type: z.enum(['createReward', 'setRewardStatus', 'issueVoucher', 'sendNotification']),
    params: z.record(z.any()),
});

export const createRuleSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    conditions: conditionSchema,
    actions: z.array(actionSchema).min(1),
    metadata: z.record(z.any()).optional(),
});

export const updateRuleSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    conditions: conditionSchema.optional(),
    actions: z.array(actionSchema).min(1).optional(),
    isActive: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
});

export const evaluateRuleSchema = z.object({
    event: z.record(z.any()),
});

export type CreateRuleDto = z.infer<typeof createRuleSchema>;
export type UpdateRuleDto = z.infer<typeof updateRuleSchema>;
export type EvaluateRuleDto = z.infer<typeof evaluateRuleSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Action = z.infer<typeof actionSchema>;
