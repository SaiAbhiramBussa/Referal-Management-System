'use client';

import React, { useCallback, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node components
const TriggerNode = ({ data }: any) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-blue-500 text-white border-2 border-blue-700">
    <div className="font-bold">Trigger</div>
    <div className="text-sm">{data.label}</div>
  </div>
);

const ConditionNode = ({ data }: any) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-yellow-500 text-white border-2 border-yellow-700">
    <div className="font-bold">Condition</div>
    <div className="text-sm">{data.label}</div>
  </div>
);

const ActionNode = ({ data }: any) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-green-500 text-white border-2 border-green-700">
    <div className="font-bold">Action</div>
    <div className="text-sm">{data.label}</div>
  </div>
);

const DelayNode = ({ data }: any) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-purple-500 text-white border-2 border-purple-700">
    <div className="font-bold">Delay</div>
    <div className="text-sm">{data.label}</div>
  </div>
);

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
};

interface FlowBuilderProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
}

export default function FlowBuilder({ initialNodes = [], initialEdges = [], onSave }: FlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeIdCounter, setNodeIdCounter] = useState(initialNodes.length);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = (type: 'trigger' | 'condition' | 'action' | 'delay') => {
    const newNode: Node = {
      id: `${type}-${nodeIdCounter}`,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node` },
    };

    setNodes((nds) => [...nds, newNode]);
    setNodeIdCounter((c) => c + 1);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(nodes, edges);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="bg-gray-800 text-white p-4 flex gap-2">
        <button
          onClick={() => addNode('trigger')}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded"
        >
          + Trigger
        </button>
        <button
          onClick={() => addNode('condition')}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded"
        >
          + Condition
        </button>
        <button
          onClick={() => addNode('action')}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded"
        >
          + Action
        </button>
        <button
          onClick={() => addNode('delay')}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded"
        >
          + Delay
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded ml-auto"
        >
          Save Flow
        </button>
      </div>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
