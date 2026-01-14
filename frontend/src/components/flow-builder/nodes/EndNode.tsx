import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { EndNodeData } from '@/types';

const EndNode = ({ data, selected }: NodeProps<EndNodeData>) => {
    return (
        <div
            className={`
        relative px-6 py-4 min-w-[180px] rounded-xl
        bg-gradient-to-br from-rose-600/90 to-red-700/90
        border-2 transition-all duration-300
        ${selected ? 'border-rose-400 shadow-lg shadow-rose-500/30' : 'border-rose-500/50'}
        backdrop-blur-sm
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-rose-400 !border-2 !border-rose-700"
            />

            {/* Stop sign indicator */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-400 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-rose-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h12v12H6z" />
                </svg>
            </div>

            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-400/20 flex items-center justify-center">
                    <svg
                        className="w-4 h-4 text-rose-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                        />
                    </svg>
                </div>
                <div>
                    <div className="text-xs text-rose-200/70 uppercase tracking-wider font-medium">
                        Exit Point
                    </div>
                    <div className="text-white font-semibold">{data.label}</div>
                </div>
            </div>
        </div>
    );
};

export default memo(EndNode);
