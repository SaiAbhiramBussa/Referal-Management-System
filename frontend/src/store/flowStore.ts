import { create } from 'zustand';
import { Node, Edge, addEdge, Connection } from 'reactflow';
import { FlowNodeData, ConditionNode, ActionDefinition, ActionType, ConditionOperator } from '@/types/rule';

interface FlowStore {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  selectedNode: Node<FlowNodeData> | null;
  ruleName: string;
  setNodes: (nodes: Node<FlowNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  setSelectedNode: (node: Node<FlowNodeData> | null) => void;
  setRuleName: (name: string) => void;
  addNode: (type: 'condition' | 'action' | 'end') => void;
  updateNodeConfig: (nodeId: string, config: ConditionNode | ActionDefinition) => void;
  deleteNode: (nodeId: string) => void;
  exportRule: () => { name: string; conditions: ConditionNode; actions: ActionDefinition[] };
  importRule: (rule: { name: string; conditions: ConditionNode; actions: ActionDefinition[] }) => void;
  resetFlow: () => void;
}

const initialNodes: Node<FlowNodeData>[] = [
  {
    id: 'start',
    type: 'input',
    position: { x: 250, y: 50 },
    data: { label: 'Start', type: 'start' },
  },
];

const initialEdges: Edge[] = [];

let nodeId = 1;

export const useFlowStore = create<FlowStore>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNode: null,
  ruleName: 'New Rule',

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    const { nodes } = get();
    // Apply changes manually for simplicity
    set({ nodes: [...nodes] });
  },

  onEdgesChange: (changes) => {
    const { edges } = get();
    set({ edges: [...edges] });
  },

  onConnect: (connection) => {
    const { edges } = get();
    set({ edges: addEdge(connection, edges) });
  },

  setSelectedNode: (node) => set({ selectedNode: node }),
  setRuleName: (name) => set({ ruleName: name }),

  addNode: (type) => {
    const { nodes, edges } = get();
    const id = `node_${nodeId++}`;
    const lastNode = nodes[nodes.length - 1];
    
    let data: FlowNodeData;
    let nodeType = 'default';
    
    switch (type) {
      case 'condition':
        data = {
          label: 'Condition',
          type: 'condition',
          config: {
            type: 'CONDITION',
            field: '',
            operator: ConditionOperator.EQUALS,
            value: '',
          },
        };
        break;
      case 'action':
        data = {
          label: 'Action',
          type: 'action',
          config: {
            type: ActionType.CREATE_REWARD,
            params: { amount: 0, currency: 'INR' },
          },
        };
        break;
      case 'end':
        data = { label: 'End', type: 'end' };
        nodeType = 'output';
        break;
    }

    const newNode: Node<FlowNodeData> = {
      id,
      type: nodeType,
      position: { x: lastNode.position.x, y: lastNode.position.y + 100 },
      data,
    };

    // Auto-connect to previous node
    const newEdge: Edge = {
      id: `e_${lastNode.id}_${id}`,
      source: lastNode.id,
      target: id,
    };

    set({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge],
    });
  },

  updateNodeConfig: (nodeId, config) => {
    const { nodes } = get();
    const updatedNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: { ...node.data, config },
        };
      }
      return node;
    });
    set({ nodes: updatedNodes });
  },

  deleteNode: (nodeId) => {
    if (nodeId === 'start') return; // Don't delete start node
    const { nodes, edges } = get();
    set({
      nodes: nodes.filter((n) => n.id !== nodeId),
      edges: edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNode: null,
    });
  },

  exportRule: () => {
    const { nodes, ruleName } = get();
    
    const conditionNodes = nodes.filter((n) => n.data.type === 'condition');
    const actionNodes = nodes.filter((n) => n.data.type === 'action');

    // Build conditions tree (AND of all conditions for simplicity)
    const conditions: ConditionNode = {
      type: 'AND',
      children: conditionNodes.map((n) => n.data.config as ConditionNode),
    };

    // Collect actions
    const actions: ActionDefinition[] = actionNodes.map(
      (n) => n.data.config as ActionDefinition
    );

    return { name: ruleName, conditions, actions };
  },

  importRule: (rule) => {
    const newNodes: Node<FlowNodeData>[] = [
      {
        id: 'start',
        type: 'input',
        position: { x: 250, y: 50 },
        data: { label: 'Start', type: 'start' },
      },
    ];
    const newEdges: Edge[] = [];
    let yPos = 150;
    let lastNodeId = 'start';

    // Add condition nodes
    if (rule.conditions.children) {
      rule.conditions.children.forEach((cond, idx) => {
        const id = `cond_${idx}`;
        newNodes.push({
          id,
          type: 'default',
          position: { x: 250, y: yPos },
          data: { label: 'Condition', type: 'condition', config: cond },
        });
        newEdges.push({ id: `e_${lastNodeId}_${id}`, source: lastNodeId, target: id });
        lastNodeId = id;
        yPos += 100;
      });
    }

    // Add action nodes
    rule.actions.forEach((action, idx) => {
      const id = `action_${idx}`;
      newNodes.push({
        id,
        type: 'default',
        position: { x: 250, y: yPos },
        data: { label: 'Action', type: 'action', config: action },
      });
      newEdges.push({ id: `e_${lastNodeId}_${id}`, source: lastNodeId, target: id });
      lastNodeId = id;
      yPos += 100;
    });

    // Add end node
    newNodes.push({
      id: 'end',
      type: 'output',
      position: { x: 250, y: yPos },
      data: { label: 'End', type: 'end' },
    });
    newEdges.push({ id: `e_${lastNodeId}_end`, source: lastNodeId, target: 'end' });

    set({
      nodes: newNodes,
      edges: newEdges,
      ruleName: rule.name,
      selectedNode: null,
    });
  },

  resetFlow: () => {
    set({
      nodes: initialNodes,
      edges: initialEdges,
      selectedNode: null,
      ruleName: 'New Rule',
    });
    nodeId = 1;
  },
}));
