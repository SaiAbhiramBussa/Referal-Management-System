import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    CreateRuleDto,
    UpdateRuleDto,
    EvaluateRuleDto,
    Condition,
    Action,
} from '../../common/schemas';

export interface EvaluatedAction extends Action {
    ruleId: string;
    ruleName: string;
    ruleVersion: number;
}

@Injectable()
export class RulesService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a new rule or a new version of an existing rule.
     */
    async create(data: CreateRuleDto) {
        // Check if rule with same name exists
        const existing = await this.prisma.rule.findFirst({
            where: { name: data.name },
            orderBy: { version: 'desc' },
        });

        const version = existing ? existing.version + 1 : 1;

        // If creating a new version, deactivate the old one
        if (existing) {
            await this.prisma.rule.update({
                where: { id: existing.id },
                data: { isActive: false },
            });
        }

        return this.prisma.rule.create({
            data: {
                name: data.name,
                description: data.description,
                version,
                isActive: true,
                conditions: data.conditions,
                actions: data.actions,
                metadata: data.metadata || {},
            },
        });
    }

    /**
     * Update an existing rule (creates new version).
     */
    async update(id: string, data: UpdateRuleDto) {
        const rule = await this.prisma.rule.findUnique({
            where: { id },
        });

        if (!rule) {
            throw new NotFoundException(`Rule with ID ${id} not found`);
        }

        // If only updating isActive, don't create new version
        if (data.isActive !== undefined && Object.keys(data).length === 1) {
            return this.prisma.rule.update({
                where: { id },
                data: { isActive: data.isActive },
            });
        }

        // Otherwise create new version
        return this.create({
            name: data.name || rule.name,
            description: data.description ?? rule.description ?? undefined,
            conditions: data.conditions || (rule.conditions as Condition),
            actions: (data.actions || rule.actions) as Action[],
            metadata: data.metadata || (rule.metadata as Record<string, any>),
        });
    }

    /**
     * Get all rules (optionally only active ones).
     */
    async findAll(activeOnly: boolean = false) {
        return this.prisma.rule.findMany({
            where: activeOnly ? { isActive: true } : undefined,
            orderBy: [{ name: 'asc' }, { version: 'desc' }],
        });
    }

    /**
     * Get a rule by ID.
     */
    async findOne(id: string) {
        const rule = await this.prisma.rule.findUnique({
            where: { id },
        });

        if (!rule) {
            throw new NotFoundException(`Rule with ID ${id} not found`);
        }

        return rule;
    }

    /**
     * Delete a rule (soft delete by deactivating).
     */
    async delete(id: string) {
        const rule = await this.prisma.rule.findUnique({
            where: { id },
        });

        if (!rule) {
            throw new NotFoundException(`Rule with ID ${id} not found`);
        }

        return this.prisma.rule.update({
            where: { id },
            data: { isActive: false },
        });
    }

    /**
     * Evaluate an event payload against all active rules.
     * Returns the list of triggered actions.
     */
    async evaluate(data: EvaluateRuleDto): Promise<EvaluatedAction[]> {
        const rules = await this.prisma.rule.findMany({
            where: { isActive: true },
        });

        const triggeredActions: EvaluatedAction[] = [];

        for (const rule of rules) {
            const conditions = rule.conditions as Condition;

            if (this.evaluateCondition(conditions, data.event)) {
                const actions = rule.actions as Action[];

                for (const action of actions) {
                    triggeredActions.push({
                        ...action,
                        ruleId: rule.id,
                        ruleName: rule.name,
                        ruleVersion: rule.version,
                    });
                }
            }
        }

        return triggeredActions;
    }

    /**
     * Recursively evaluate a condition tree against an event.
     */
    private evaluateCondition(condition: Condition, event: Record<string, any>): boolean {
        // Handle AND/OR operators
        if ('operator' in condition && 'operands' in condition) {
            if (condition.operator === 'AND') {
                return condition.operands.every((op: Condition) =>
                    this.evaluateCondition(op, event)
                );
            } else if (condition.operator === 'OR') {
                return condition.operands.some((op: Condition) =>
                    this.evaluateCondition(op, event)
                );
            }
        }

        // Handle leaf condition
        if ('field' in condition && 'op' in condition) {
            const fieldValue = this.getNestedValue(event, condition.field);
            return this.evaluateOperator(condition.op, fieldValue, condition.value);
        }

        return false;
    }

    /**
     * Get a nested value from an object using dot notation.
     */
    private getNestedValue(obj: Record<string, any>, path: string): any {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Evaluate a single operator.
     */
    private evaluateOperator(op: string, fieldValue: any, targetValue: any): boolean {
        switch (op) {
            case '=':
                return fieldValue === targetValue;
            case '!=':
                return fieldValue !== targetValue;
            case '>':
                return typeof fieldValue === 'number' && fieldValue > targetValue;
            case '<':
                return typeof fieldValue === 'number' && fieldValue < targetValue;
            case '>=':
                return typeof fieldValue === 'number' && fieldValue >= targetValue;
            case '<=':
                return typeof fieldValue === 'number' && fieldValue <= targetValue;
            case 'in':
                return Array.isArray(targetValue) && targetValue.includes(fieldValue);
            case 'not_in':
                return Array.isArray(targetValue) && !targetValue.includes(fieldValue);
            case 'exists':
                return fieldValue !== undefined && fieldValue !== null;
            case 'not_exists':
                return fieldValue === undefined || fieldValue === null;
            default:
                return false;
        }
    }

    /**
     * Create example referral rule.
     */
    async createExampleRule() {
        const existingRule = await this.prisma.rule.findFirst({
            where: { name: 'Referral Reward Rule' },
        });

        if (existingRule) {
            return existingRule;
        }

        return this.create({
            name: 'Referral Reward Rule',
            description: 'Award INR 500 voucher when referrer is paid and referred subscribes',
            conditions: {
                operator: 'AND',
                operands: [
                    {
                        field: 'referrer.status',
                        op: '=',
                        value: 'PAID',
                    },
                    {
                        field: 'referred.action',
                        op: '=',
                        value: 'SUBSCRIBED',
                    },
                ],
            },
            actions: [
                {
                    type: 'createReward',
                    params: {
                        amount: 500,
                        currency: 'INR',
                        type: 'referral_bonus',
                    },
                },
                {
                    type: 'issueVoucher',
                    params: {
                        code: 'REFERRAL500',
                        value: 500,
                        currency: 'INR',
                        validDays: 30,
                    },
                },
            ],
            metadata: {
                category: 'referral',
                priority: 'high',
            },
        });
    }
}
