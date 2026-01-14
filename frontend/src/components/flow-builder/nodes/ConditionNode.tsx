import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ConditionNodeData } from '@/types';

const ConditionNode = ({ data, selected }: NodeProps<ConditionNodeData>) => {
    const conditionData = data as ConditionNodeData;

    return (
        <div
            className={`
        relative px-6 py-4 min-w-[250px] rounded-xl
        bg-gradient-to-br from-amber-600/90 to-orange-700/90
        border-2 transition-all duration-300
        ${selected ? 'border-amber-400 shadow-lg shadow-amber-500/30' : 'border-amber-500/50'}
        backdrop-blur-sm
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-amber-400 !border-2 !border-amber-700"
            />

            {/* Diamond shape indicator */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-400 rotate-45" />

            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg
                        className="w-4 h-4 text-amber-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
                <div className="flex-1">
                    <div className="text-xs text-amber-200/70 uppercase tracking-wider font-medium">
                        Condition ({conditionData.logicalOperator})
                    </div>
                    <div className="text-white font-semibold mb-2">{data.label}</div>

                    {/* Conditions preview */}
                    <div className="space-y-1">
                        {conditionData.conditions?.slice(0, 2).map((cond, idx) => (
                            <div
                                key={idx}
                                className="text-xs bg-amber-900/40 rounded px-2 py-1 text-amber-100 truncate"
                            >
                                {cond.field || 'field'} {cond.operator} {String(cond.value) || 'value'}
                            </div>
                        ))}
                        {conditionData.conditions?.length > 2 && (
                            <div className="text-xs text-amber-300/60">
                                +{conditionData.conditions.length - 2} more...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Source handles for true/false branches */}
            <div className="absolute -bottom-3 left-0 right-0 flex justify-center gap-8">
                <div className="relative">
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="true"
                        className="!relative !left-0 !top-0 !transform-none !w-3 !h-3 !bg-emerald-400 !border-2 !border-amber-700"
                    />
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-emerald-400 font-medium">
                        TRUE
                    </span>
                </div>
                <div className="relative">
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="false"
                        className="!relative !left-0 !top-0 !transform-none !w-3 !h-3 !bg-red-400 !border-2 !border-amber-700"
                    />
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-red-400 font-medium">
                        FALSE
                    </span>
                </div>
            </div>
        </div>
    );
};

export default memo(ConditionNode);
