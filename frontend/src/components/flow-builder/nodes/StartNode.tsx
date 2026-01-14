import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { StartNodeData } from '@/types';

const StartNode = ({ data, selected }: NodeProps<StartNodeData>) => {
    return (
        <div
            className={`
        relative px-6 py-4 min-w-[180px] rounded-xl
        bg-gradient-to-br from-emerald-600/90 to-emerald-700/90
        border-2 transition-all duration-300
        ${selected ? 'border-emerald-400 shadow-lg shadow-emerald-500/30' : 'border-emerald-500/50'}
        backdrop-blur-sm
      `}
        >
            {/* Decorative circle */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-emerald-400 rounded-full animate-pulse" />

            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center">
                    <svg
                        className="w-4 h-4 text-emerald-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
                <div>
                    <div className="text-xs text-emerald-200/70 uppercase tracking-wider font-medium">
                        Entry Point
                    </div>
                    <div className="text-white font-semibold">{data.label}</div>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-emerald-700"
            />
        </div>
    );
};

export default memo(StartNode);
