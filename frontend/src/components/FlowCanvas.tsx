'use client';

import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  NodeProps,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useFlowStore } from '@/store/flowStore';
import { FlowNodeData } from '@/types/rule';

// Custom Node Components
function StartNode({ data }: NodeProps<FlowNodeData>) {
  return (
    <div className="node start-node">
      <div className="node-content">{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function ConditionNode({ data }: NodeProps<FlowNodeData>) {
  return (
    <div className="node condition-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-content">
        <strong>{data.label}</strong>
        {data.config && 'field' in data.config && (
          <div className="node-details">
            {data.config.field} {data.config.operator} {String(data.config.value)}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function ActionNode({ data }: NodeProps<FlowNodeData>) {
  return (
    <div className="node action-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-content">
        <strong>{data.label}</strong>
        {data.config && 'type' in data.config && (
          <div className="node-details">{data.config.type}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function EndNode({ data }: NodeProps<FlowNodeData>) {
  return (
    <div className="node end-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-content">{data.label}</div>
    </div>
  );
}

const nodeTypes = {
  input: StartNode,
  default: (props: NodeProps<FlowNodeData>) => {
    if (props.data.type === 'condition') return <ConditionNode {...props} />;
    if (props.data.type === 'action') return <ActionNode {...props} />;
    return <div>{props.data.label}</div>;
  },
  output: EndNode,
};

export default function FlowCanvas() {
  const { nodes, edges, onConnect, setSelectedNode } = useFlowStore();

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<FlowNodeData>) => {
      if (node.data.type !== 'start') {
        setSelectedNode(node);
      }
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div className="flow-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
