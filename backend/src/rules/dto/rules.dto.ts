import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Condition operators
export enum ConditionOperator {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN_OR_EQUAL = '<=',
  IN = 'in',
  NOT_IN = 'not_in',
  EXISTS = 'exists',
  CONTAINS = 'contains',
}

// Condition node in the AST
export interface ConditionNode {
  type: 'AND' | 'OR' | 'CONDITION';
  // For AND/OR nodes
  children?: ConditionNode[];
  // For CONDITION nodes
  field?: string;
  operator?: ConditionOperator;
  value?: unknown;
}

// Action types
export enum ActionType {
  CREATE_REWARD = 'createReward',
  SET_REWARD_STATUS = 'setRewardStatus',
  ISSUE_VOUCHER = 'issueVoucher',
  SEND_NOTIFICATION = 'sendNotification',
}

// Action definition
export interface ActionDefinition {
  type: ActionType;
  params: Record<string, unknown>;
}

// Rule AST format
export interface RuleAST {
  conditions: ConditionNode;
  actions: ActionDefinition[];
}

export class CreateRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Condition tree (AND/OR with nested conditions)',
    example: {
      type: 'AND',
      children: [
        { type: 'CONDITION', field: 'referrer.status', operator: '=', value: 'paid' },
        { type: 'CONDITION', field: 'referred.subscribed', operator: '=', value: true }
      ]
    }
  })
  @IsObject()
  conditions: ConditionNode;

  @ApiProperty({ 
    description: 'Actions to execute when conditions match',
    example: [
      { type: 'createReward', params: { amount: 500, currency: 'INR', type: 'voucher' } }
    ]
  })
  @IsArray()
  actions: ActionDefinition[];

  @ApiPropertyOptional({ description: 'Whether the rule is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateRuleDto {
  @ApiPropertyOptional({ description: 'Rule name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Condition tree' })
  @IsOptional()
  @IsObject()
  conditions?: ConditionNode;

  @ApiPropertyOptional({ description: 'Actions to execute' })
  @IsOptional()
  @IsArray()
  actions?: ActionDefinition[];

  @ApiPropertyOptional({ description: 'Whether the rule is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class EvaluateRulesDto {
  @ApiProperty({ 
    description: 'Event payload to evaluate against rules',
    example: {
      eventType: 'referral_subscription',
      referrer: { id: 'user1', status: 'paid' },
      referred: { id: 'user2', subscribed: true }
    }
  })
  @IsObject()
  event: Record<string, unknown>;
}
