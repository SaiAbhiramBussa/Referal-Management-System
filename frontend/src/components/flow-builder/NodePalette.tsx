import { useFlowStore } from '@/store';
import { NodeType } from '@/types';

const nodeTypes: { type: NodeType; label: string; icon: React.ReactNode; color: string }[] = [
    {
        type: 'start',
        label: 'Start',
        color: 'from-emerald-600 to-emerald-700',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        type: 'condition',
        label: 'Condition',
        color: 'from-amber-600 to-orange-700',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        type: 'action',
        label: 'Action',
        color: 'from-blue-600 to-indigo-700',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        ),
    },
    {
        type: 'end',
        label: 'End',
        color: 'from-rose-600 to-red-700',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
        ),
    },
];

export default function NodePalette() {
    const addNode = useFlowStore((state) => state.addNode);

    return (
        <div className="glass-card rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
                Add Node
            </h3>
            <div className="grid grid-cols-2 gap-2">
                {nodeTypes.map(({ type, label, icon, color }) => (
                    <button
                        key={type}
                        onClick={() => addNode(type)}
                        className={`
              flex items-center gap-2 p-3 rounded-lg
              bg-gradient-to-r ${color}
              text-white text-sm font-medium
              transition-all duration-200
              hover:scale-105 hover:shadow-lg
              active:scale-95
            `}
                    >
                        {icon}
                        <span>{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
