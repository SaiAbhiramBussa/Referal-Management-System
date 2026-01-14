// Types for the Rule Builder

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

export interface ConditionNode {
  type: 'AND' | 'OR' | 'CONDITION';
  children?: ConditionNode[];
  field?: string;
  operator?: ConditionOperator;
  value?: unknown;
}

export enum ActionType {
  CREATE_REWARD = 'createReward',
  SET_REWARD_STATUS = 'setRewardStatus',
  ISSUE_VOUCHER = 'issueVoucher',
  SEND_NOTIFICATION = 'sendNotification',
}

export interface ActionDefinition {
  type: ActionType;
  params: Record<string, unknown>;
}

export interface RuleAST {
  conditions: ConditionNode;
  actions: ActionDefinition[];
}

export interface Rule {
  id: string;
  name: string;
  version: number;
  conditions: ConditionNode;
  actions: ActionDefinition[];
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Flow Builder Node Types
export type FlowNodeType = 'start' | 'condition' | 'action' | 'end';

export interface FlowNodeData {
  label: string;
  type: FlowNodeType;
  config?: ConditionNode | ActionDefinition;
}
