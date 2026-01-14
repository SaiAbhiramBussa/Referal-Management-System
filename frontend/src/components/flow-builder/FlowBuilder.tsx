import { useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    NodeTypes,
} from 'reactflow';
import { useFlowStore } from '@/store';
import { StartNode, ConditionNode, ActionNode, EndNode } from './nodes';
import NodePalette from './NodePalette';
import NodeEditor from './NodeEditor';
import JsonPreview from './JsonPreview';

const nodeTypes: NodeTypes = {
    start: StartNode,
    condition: ConditionNode,
    action: ActionNode,
    end: EndNode,
};

export default function FlowBuilder() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        selectNode,
    } = useFlowStore();

    const handleNodeClick = useCallback((_: React.MouseEvent, node: any) => {
        selectNode(node.id);
    }, [selectNode]);

    const handlePaneClick = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    return (
        <div className="h-screen flex">
            {/* Main Canvas */}
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={handleNodeClick}
                    onPaneClick={handlePaneClick}
                    nodeTypes={nodeTypes}
                    fitView
                    snapToGrid
                    snapGrid={[15, 15]}
                    defaultEdgeOptions={{
                        animated: true,
                        style: { stroke: '#818cf8', strokeWidth: 2 },
                    }}
                >
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={20}
                        size={1}
                        color="rgba(99, 102, 241, 0.15)"
                    />
                    <Controls
                        position="bottom-left"
                        showZoom
                        showFitView
                        showInteractive
                    />
                    <MiniMap
                        position="bottom-right"
                        nodeColor={(node) => {
                            switch (node.type) {
                                case 'start':
                                    return '#10b981';
                                case 'condition':
                                    return '#f59e0b';
                                case 'action':
                                    return '#3b82f6';
                                case 'end':
                                    return '#ef4444';
                                default:
                                    return '#6366f1';
                            }
                        }}
                        maskColor="rgba(0, 0, 0, 0.5)"
                    />
                </ReactFlow>

                {/* Header */}
                <div className="absolute top-4 left-4 right-4">
                    <div className="glass-card rounded-xl px-6 py-4 inline-flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                            <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">
                                Referral Flow Builder
                            </h1>
                            <p className="text-sm text-gray-400">
                                Design rule-based referral workflows visually
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <div className="w-80 bg-dark-900/80 backdrop-blur-xl border-l border-dark-700 p-4 overflow-y-auto">
                <NodePalette />
                <NodeEditor />
                <div className="mt-4">
                    <JsonPreview />
                </div>
            </div>
        </div>
    );
}
