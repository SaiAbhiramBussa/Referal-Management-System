// Type definitions for the Flow Builder

export type NodeType = 'start' | 'condition' | 'action' | 'end';

export type ConditionOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in' | 'exists' | 'not_exists';

export type ActionType = 'createReward' | 'setRewardStatus' | 'issueVoucher' | 'sendNotification';

export interface ConditionConfig {
    field: string;
    operator: ConditionOperator;
    value: string | number | boolean | string[];
}

export interface ActionConfig {
    type: ActionType;
    params: Record<string, unknown>;
}

export interface StartNodeData {
    label: string;
}

export interface ConditionNodeData {
    label: string;
    conditions: ConditionConfig[];
    logicalOperator: 'AND' | 'OR';
}

export interface ActionNodeData {
    label: string;
    actions: ActionConfig[];
}

export interface EndNodeData {
    label: string;
}

export type FlowNodeData = StartNodeData | ConditionNodeData | ActionNodeData | EndNodeData;

export interface RuleExport {
    ruleId?: string;
    name: string;
    description?: string;
    version: number;
    conditions: RuleCondition;
    actions: RuleAction[];
    metadata?: Record<string, unknown>;
}

export interface RuleCondition {
    operator?: 'AND' | 'OR';
    operands?: RuleCondition[];
    field?: string;
    op?: ConditionOperator;
    value?: unknown;
}

export interface RuleAction {
    type: ActionType;
    params: Record<string, unknown>;
}
