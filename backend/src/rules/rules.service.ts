import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Rule, Prisma } from '@prisma/client';
import { CreateRuleDto, UpdateRuleDto, EvaluateRulesDto, ConditionNode, ActionDefinition, ConditionOperator } from './dto/rules.dto';

export interface EvaluationResult {
  ruleId: string;
  ruleName: string;
  version: number;
  matched: boolean;
  triggeredActions: ActionDefinition[];
}

@Injectable()
export class RulesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new rule
   * POST /rules
   */
  async createRule(dto: CreateRuleDto): Promise<Rule> {
    // Check if rule with same name exists
    const existingRule = await this.prisma.rule.findFirst({
      where: { name: dto.name },
      orderBy: { version: 'desc' },
    });

    const version = existingRule ? existingRule.version + 1 : 1;

    return this.prisma.rule.create({
      data: {
        name: dto.name,
        version,
        conditions: JSON.parse(JSON.stringify(dto.conditions)),
        actions: JSON.parse(JSON.stringify(dto.actions)),
        isActive: dto.isActive ?? true,
        metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : Prisma.JsonNull,
      },
    });
  }

  /**
   * Get all rules
   * GET /rules
   */
  async getRules(activeOnly: boolean = false): Promise<Rule[]> {
    return this.prisma.rule.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
    });
  }

  /**
   * Get a rule by ID
   */
  async getRule(id: string): Promise<Rule> {
    const rule = await this.prisma.rule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }

    return rule;
  }

  /**
   * Update a rule (creates new version)
   */
  async updateRule(id: string, dto: UpdateRuleDto): Promise<Rule> {
    const existingRule = await this.getRule(id);

    const conditions = dto.conditions ? JSON.parse(JSON.stringify(dto.conditions)) : existingRule.conditions;
    const actions = dto.actions ? JSON.parse(JSON.stringify(dto.actions)) : existingRule.actions;
    const metadata = dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : existingRule.metadata;

    // Create new version instead of updating
    return this.prisma.rule.create({
      data: {
        name: dto.name || existingRule.name,
        version: existingRule.version + 1,
        conditions,
        actions,
        isActive: dto.isActive ?? existingRule.isActive,
        metadata: metadata ?? Prisma.JsonNull,
      },
    });
  }

  /**
   * Evaluate event against all active rules
   * POST /rules/evaluate
   */
  async evaluateRules(dto: EvaluateRulesDto): Promise<EvaluationResult[]> {
    const activeRules = await this.getRules(true);
    const results: EvaluationResult[] = [];

    for (const rule of activeRules) {
      const conditions = rule.conditions as unknown as ConditionNode;
      const matched = this.evaluateConditionNode(conditions, dto.event);

      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        version: rule.version,
        matched,
        triggeredActions: matched ? (rule.actions as unknown as ActionDefinition[]) : [],
      });
    }

    return results;
  }

  /**
   * Recursively evaluate a condition node against event data
   */
  private evaluateConditionNode(node: ConditionNode, event: Record<string, unknown>): boolean {
    if (node.type === 'AND') {
      return node.children?.every(child => this.evaluateConditionNode(child, event)) ?? true;
    }

    if (node.type === 'OR') {
      return node.children?.some(child => this.evaluateConditionNode(child, event)) ?? false;
    }

    if (node.type === 'CONDITION') {
      return this.evaluateCondition(node, event);
    }

    return false;
  }

  /**
   * Evaluate a single condition against event data
   */
  private evaluateCondition(node: ConditionNode, event: Record<string, unknown>): boolean {
    if (!node.field || !node.operator) {
      return false;
    }

    // Get the value from the event using dot notation (e.g., "referrer.status")
    const fieldValue = this.getNestedValue(event, node.field);
    const conditionValue = node.value;

    switch (node.operator) {
      case ConditionOperator.EQUALS:
      case '=' as ConditionOperator:
        return fieldValue === conditionValue;

      case ConditionOperator.NOT_EQUALS:
      case '!=' as ConditionOperator:
        return fieldValue !== conditionValue;

      case ConditionOperator.GREATER_THAN:
      case '>' as ConditionOperator:
        return typeof fieldValue === 'number' && typeof conditionValue === 'number' 
          && fieldValue > conditionValue;

      case ConditionOperator.LESS_THAN:
      case '<' as ConditionOperator:
        return typeof fieldValue === 'number' && typeof conditionValue === 'number' 
          && fieldValue < conditionValue;

      case ConditionOperator.GREATER_THAN_OR_EQUAL:
      case '>=' as ConditionOperator:
        return typeof fieldValue === 'number' && typeof conditionValue === 'number' 
          && fieldValue >= conditionValue;

      case ConditionOperator.LESS_THAN_OR_EQUAL:
      case '<=' as ConditionOperator:
        return typeof fieldValue === 'number' && typeof conditionValue === 'number' 
          && fieldValue <= conditionValue;

      case ConditionOperator.IN:
      case 'in' as ConditionOperator:
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);

      case ConditionOperator.NOT_IN:
      case 'not_in' as ConditionOperator:
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);

      case ConditionOperator.EXISTS:
      case 'exists' as ConditionOperator:
        return conditionValue ? fieldValue !== undefined : fieldValue === undefined;

      case ConditionOperator.CONTAINS:
      case 'contains' as ConditionOperator:
        return typeof fieldValue === 'string' && typeof conditionValue === 'string' 
          && fieldValue.includes(conditionValue);

      default:
        return false;
    }
  }

  /**
   * Get a nested value from an object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Get latest version of each rule
   */
  async getLatestRules(): Promise<Rule[]> {
    const allRules = await this.prisma.rule.findMany({
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
    });

    // Group by name and take latest version
    const latestRules = new Map<string, Rule>();
    for (const rule of allRules) {
      if (!latestRules.has(rule.name)) {
        latestRules.set(rule.name, rule);
      }
    }

    return Array.from(latestRules.values());
  }
}
