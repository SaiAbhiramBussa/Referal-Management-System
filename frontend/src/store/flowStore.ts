import { create } from 'zustand';
import {
    Node,
    Edge,
    NodeChange,
    EdgeChange,
    Connection,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
} from 'reactflow';
import {
    NodeType,
    FlowNodeData,
    ConditionNodeData,
    ActionNodeData,
    RuleExport,
    RuleCondition,
    RuleAction,
} from '@/types';

interface FlowState {
    nodes: Node<FlowNodeData>[];
    edges: Edge[];
    selectedNodeId: string | null;
    ruleName: string;
    ruleDescription: string;

    // Actions
    setNodes: (nodes: Node<FlowNodeData>[]) => void;
    setEdges: (edges: Edge[]) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    addNode: (type: NodeType) => void;
    updateNodeData: (nodeId: string, data: Partial<FlowNodeData>) => void;
    deleteNode: (nodeId: string) => void;
    selectNode: (nodeId: string | null) => void;
    setRuleName: (name: string) => void;
    setRuleDescription: (description: string) => void;
    exportToJSON: () => RuleExport;
    importFromJSON: (rule: RuleExport) => void;
    clearFlow: () => void;
}

const initialNodes: Node<FlowNodeData>[] = [
    {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Start' },
    },
];

const initialEdges: Edge[] = [];

export const useFlowStore = create<FlowState>((set, get) => ({
    nodes: initialNodes,
    edges: initialEdges,
    selectedNodeId: null,
    ruleName: 'New Rule',
    ruleDescription: '',

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes) as Node<FlowNodeData>[],
        });
    },

    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },

    onConnect: (connection) => {
        set({
            edges: addEdge(
                {
                    ...connection,
                    animated: true,
                    style: { stroke: '#818cf8', strokeWidth: 2 },
                },
                get().edges
            ),
        });
    },

    addNode: (type: NodeType) => {
        const nodes = get().nodes;
        const id = `${type}-${Date.now()}`;
        const lastNode = nodes[nodes.length - 1];
        const position = lastNode
            ? { x: lastNode.position.x, y: lastNode.position.y + 150 }
            : { x: 250, y: 100 };

        let data: FlowNodeData;
        switch (type) {
            case 'start':
                data = { label: 'Start' };
                break;
            case 'condition':
                data = {
                    label: 'Condition',
                    conditions: [{ field: '', operator: '=', value: '' }],
                    logicalOperator: 'AND',
                } as ConditionNodeData;
                break;
            case 'action':
                data = {
                    label: 'Action',
                    actions: [{ type: 'createReward', params: { amount: 100, currency: 'INR' } }],
                } as ActionNodeData;
                break;
            case 'end':
                data = { label: 'End' };
                break;
        }

        const newNode: Node<FlowNodeData> = {
            id,
            type,
            position,
            data,
        };

        set({ nodes: [...nodes, newNode] });
    },

    updateNodeData: (nodeId, data) => {
        set({
            nodes: get().nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, ...data } }
                    : node
            ),
        });
    },

    deleteNode: (nodeId) => {
        set({
            nodes: get().nodes.filter((node) => node.id !== nodeId),
            edges: get().edges.filter(
                (edge) => edge.source !== nodeId && edge.target !== nodeId
            ),
            selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
        });
    },

    selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

    setRuleName: (name) => set({ ruleName: name }),
    setRuleDescription: (description) => set({ ruleDescription: description }),

    exportToJSON: (): RuleExport => {
        const { nodes, edges, ruleName, ruleDescription } = get();

        // Find condition nodes and build conditions
        const conditionNodes = nodes.filter((n) => n.type === 'condition');
        let conditions: RuleCondition = {};

        if (conditionNodes.length > 0) {
            const conditionData = conditionNodes[0].data as ConditionNodeData;

            if (conditionData.conditions.length === 1) {
                const c = conditionData.conditions[0];
                conditions = {
                    field: c.field,
                    op: c.operator,
                    value: c.value,
                };
            } else {
                conditions = {
                    operator: conditionData.logicalOperator,
                    operands: conditionData.conditions.map((c) => ({
                        field: c.field,
                        op: c.operator,
                        value: c.value,
                    })),
                };
            }
        }

        // Find action nodes and build actions
        const actionNodes = nodes.filter((n) => n.type === 'action');
        const actions: RuleAction[] = actionNodes.flatMap((node) => {
            const actionData = node.data as ActionNodeData;
            return actionData.actions.map((a) => ({
                type: a.type,
                params: a.params,
            }));
        });

        return {
            name: ruleName,
            description: ruleDescription || undefined,
            version: 1,
            conditions,
            actions,
            metadata: {
                exportedAt: new Date().toISOString(),
                nodeCount: nodes.length,
                edgeCount: edges.length,
            },
        };
    },

    importFromJSON: (rule: RuleExport) => {
        const nodes: Node<FlowNodeData>[] = [];
        const edges: Edge[] = [];
        let y = 50;

        // Start node
        nodes.push({
            id: 'start-imported',
            type: 'start',
            position: { x: 250, y },
            data: { label: 'Start' },
        });
        y += 150;

        // Condition node
        if (rule.conditions && Object.keys(rule.conditions).length > 0) {
            const conditionData: ConditionNodeData = {
                label: 'Condition',
                logicalOperator: rule.conditions.operator || 'AND',
                conditions: [],
            };

            if (rule.conditions.operands) {
                conditionData.conditions = rule.conditions.operands.map((op) => ({
                    field: op.field || '',
                    operator: op.op || '=',
                    value: op.value as string,
                }));
            } else if (rule.conditions.field) {
                conditionData.conditions = [
                    {
                        field: rule.conditions.field,
                        operator: rule.conditions.op || '=',
                        value: rule.conditions.value as string,
                    },
                ];
            }

            nodes.push({
                id: 'condition-imported',
                type: 'condition',
                position: { x: 250, y },
                data: conditionData,
            });

            edges.push({
                id: 'e-start-condition',
                source: 'start-imported',
                target: 'condition-imported',
                animated: true,
                style: { stroke: '#818cf8', strokeWidth: 2 },
            });
            y += 150;
        }

        // Action nodes
        if (rule.actions && rule.actions.length > 0) {
            const actionData: ActionNodeData = {
                label: 'Actions',
                actions: rule.actions.map((a) => ({
                    type: a.type,
                    params: a.params,
                })),
            };

            nodes.push({
                id: 'action-imported',
                type: 'action',
                position: { x: 250, y },
                data: actionData,
            });

            const sourceId = nodes.find((n) => n.type === 'condition')
                ? 'condition-imported'
                : 'start-imported';

            edges.push({
                id: `e-${sourceId}-action`,
                source: sourceId,
                target: 'action-imported',
                animated: true,
                style: { stroke: '#818cf8', strokeWidth: 2 },
            });
            y += 150;
        }

        // End node
        nodes.push({
            id: 'end-imported',
            type: 'end',
            position: { x: 250, y },
            data: { label: 'End' },
        });

        const lastNodeId = nodes[nodes.length - 2]?.id || 'start-imported';
        edges.push({
            id: `e-${lastNodeId}-end`,
            source: lastNodeId,
            target: 'end-imported',
            animated: true,
            style: { stroke: '#818cf8', strokeWidth: 2 },
        });

        set({
            nodes,
            edges,
            ruleName: rule.name,
            ruleDescription: rule.description || '',
            selectedNodeId: null,
        });
    },

    clearFlow: () => {
        set({
            nodes: initialNodes,
            edges: initialEdges,
            selectedNodeId: null,
            ruleName: 'New Rule',
            ruleDescription: '',
        });
    },
}));
