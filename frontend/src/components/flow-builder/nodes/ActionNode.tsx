import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ActionNodeData } from '@/types';

const actionTypeIcons: Record<string, React.ReactNode> = {
    createReward: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    setRewardStatus: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    issueVoucher: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
    ),
    sendNotification: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
    ),
};

const ActionNode = ({ data, selected }: NodeProps<ActionNodeData>) => {
    const actionData = data as ActionNodeData;

    return (
        <div
            className={`
        relative px-6 py-4 min-w-[250px] rounded-xl
        bg-gradient-to-br from-blue-600/90 to-indigo-700/90
        border-2 transition-all duration-300
        ${selected ? 'border-blue-400 shadow-lg shadow-blue-500/30' : 'border-blue-500/50'}
        backdrop-blur-sm
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-blue-400 !border-2 !border-blue-700"
            />

            {/* Gear indicator */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </div>

            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-400/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg
                        className="w-4 h-4 text-blue-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                </div>
                <div className="flex-1">
                    <div className="text-xs text-blue-200/70 uppercase tracking-wider font-medium">
                        Actions ({actionData.actions?.length || 0})
                    </div>
                    <div className="text-white font-semibold mb-2">{data.label}</div>

                    {/* Actions preview */}
                    <div className="space-y-1">
                        {actionData.actions?.slice(0, 3).map((action, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 text-xs bg-blue-900/40 rounded px-2 py-1 text-blue-100"
                            >
                                <span className="text-blue-300">
                                    {actionTypeIcons[action.type] || '⚡'}
                                </span>
                                <span className="truncate">{action.type}</span>
                            </div>
                        ))}
                        {actionData.actions?.length > 3 && (
                            <div className="text-xs text-blue-300/60">
                                +{actionData.actions.length - 3} more...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-blue-400 !border-2 !border-blue-700"
            />
        </div>
    );
};

export default memo(ActionNode);
