import { useFlowStore } from '@/store';
import { ConditionNodeData, ActionNodeData, ConditionOperator, ActionType } from '@/types';

const operators: { value: ConditionOperator; label: string }[] = [
    { value: '=', label: 'Equals (=)' },
    { value: '!=', label: 'Not Equals (!=)' },
    { value: '>', label: 'Greater Than (>)' },
    { value: '<', label: 'Less Than (<)' },
    { value: '>=', label: 'Greater or Equal (>=)' },
    { value: '<=', label: 'Less or Equal (<=)' },
    { value: 'in', label: 'In List' },
    { value: 'not_in', label: 'Not In List' },
    { value: 'exists', label: 'Exists' },
    { value: 'not_exists', label: 'Does Not Exist' },
];

const actionTypes: { value: ActionType; label: string }[] = [
    { value: 'createReward', label: 'Create Reward' },
    { value: 'setRewardStatus', label: 'Set Reward Status' },
    { value: 'issueVoucher', label: 'Issue Voucher' },
    { value: 'sendNotification', label: 'Send Notification' },
];

export default function NodeEditor() {
    const { nodes, selectedNodeId, updateNodeData, deleteNode, selectNode } = useFlowStore();

    const selectedNode = nodes.find((n) => n.id === selectedNodeId);

    if (!selectedNode) {
        return (
            <div className="glass-card rounded-xl p-4">
                <div className="text-center text-gray-400 py-8">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <p className="text-sm">Select a node to edit its properties</p>
                </div>
            </div>
        );
    }

    const handleLabelChange = (label: string) => {
        updateNodeData(selectedNode.id, { label });
    };

    const renderConditionEditor = () => {
        const data = selectedNode.data as ConditionNodeData;

        const handleLogicalOperatorChange = (op: 'AND' | 'OR') => {
            updateNodeData(selectedNode.id, { logicalOperator: op });
        };

        const handleConditionChange = (index: number, field: string, value: string) => {
            const newConditions = [...(data.conditions || [])];
            newConditions[index] = { ...newConditions[index], [field]: value };
            updateNodeData(selectedNode.id, { conditions: newConditions });
        };

        const addCondition = () => {
            const newConditions = [...(data.conditions || []), { field: '', operator: '=' as ConditionOperator, value: '' }];
            updateNodeData(selectedNode.id, { conditions: newConditions });
        };

        const removeCondition = (index: number) => {
            const newConditions = data.conditions?.filter((_, i) => i !== index) || [];
            updateNodeData(selectedNode.id, { conditions: newConditions });
        };

        return (
            <div className="space-y-3">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Logical Operator</label>
                    <div className="flex gap-2">
                        {(['AND', 'OR'] as const).map((op) => (
                            <button
                                key={op}
                                onClick={() => handleLogicalOperatorChange(op)}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${data.logicalOperator === op
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                                    }`}
                            >
                                {op}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-2">Conditions</label>
                    <div className="space-y-2">
                        {data.conditions?.map((cond, idx) => (
                            <div key={idx} className="bg-dark-800 rounded-lg p-3 space-y-2">
                                <input
                                    type="text"
                                    value={cond.field}
                                    onChange={(e) => handleConditionChange(idx, 'field', e.target.value)}
                                    placeholder="Field (e.g., user.status)"
                                    className="w-full px-3 py-2 bg-dark-700 rounded text-sm text-white placeholder-gray-500 border border-dark-600 focus:border-primary-500 focus:outline-none"
                                />
                                <select
                                    value={cond.operator}
                                    onChange={(e) => handleConditionChange(idx, 'operator', e.target.value)}
                                    className="w-full px-3 py-2 bg-dark-700 rounded text-sm text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
                                >
                                    {operators.map((op) => (
                                        <option key={op.value} value={op.value}>{op.label}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={String(cond.value)}
                                        onChange={(e) => handleConditionChange(idx, 'value', e.target.value)}
                                        placeholder="Value"
                                        className="flex-1 px-3 py-2 bg-dark-700 rounded text-sm text-white placeholder-gray-500 border border-dark-600 focus:border-primary-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={() => removeCondition(idx)}
                                        className="px-2 text-red-400 hover:text-red-300"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={addCondition}
                        className="mt-2 w-full px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-primary-400 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Condition
                    </button>
                </div>
            </div>
        );
    };

    const renderActionEditor = () => {
        const data = selectedNode.data as ActionNodeData;

        const handleActionTypeChange = (index: number, type: ActionType) => {
            const newActions = [...(data.actions || [])];
            newActions[index] = { ...newActions[index], type };
            updateNodeData(selectedNode.id, { actions: newActions });
        };

        const handleActionParamChange = (index: number, key: string, value: string | number) => {
            const newActions = [...(data.actions || [])];
            newActions[index] = {
                ...newActions[index],
                params: { ...newActions[index].params, [key]: value },
            };
            updateNodeData(selectedNode.id, { actions: newActions });
        };

        const addAction = () => {
            const newActions = [...(data.actions || []), { type: 'createReward' as ActionType, params: {} }];
            updateNodeData(selectedNode.id, { actions: newActions });
        };

        const removeAction = (index: number) => {
            const newActions = data.actions?.filter((_, i) => i !== index) || [];
            updateNodeData(selectedNode.id, { actions: newActions });
        };

        return (
            <div className="space-y-3">
                <label className="block text-xs text-gray-400">Actions</label>
                <div className="space-y-2">
                    {data.actions?.map((action, idx) => (
                        <div key={idx} className="bg-dark-800 rounded-lg p-3 space-y-2">
                            <div className="flex gap-2">
                                <select
                                    value={action.type}
                                    onChange={(e) => handleActionTypeChange(idx, e.target.value as ActionType)}
                                    className="flex-1 px-3 py-2 bg-dark-700 rounded text-sm text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
                                >
                                    {actionTypes.map((at) => (
                                        <option key={at.value} value={at.value}>{at.label}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => removeAction(idx)}
                                    className="px-2 text-red-400 hover:text-red-300"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>

                            {action.type === 'createReward' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        value={action.params.amount as number || ''}
                                        onChange={(e) => handleActionParamChange(idx, 'amount', Number(e.target.value))}
                                        placeholder="Amount"
                                        className="px-3 py-2 bg-dark-700 rounded text-sm text-white placeholder-gray-500 border border-dark-600 focus:border-primary-500 focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        value={action.params.currency as string || 'INR'}
                                        onChange={(e) => handleActionParamChange(idx, 'currency', e.target.value)}
                                        placeholder="Currency"
                                        className="px-3 py-2 bg-dark-700 rounded text-sm text-white placeholder-gray-500 border border-dark-600 focus:border-primary-500 focus:outline-none"
                                    />
                                </div>
                            )}

                            {action.type === 'issueVoucher' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={action.params.code as string || ''}
                                        onChange={(e) => handleActionParamChange(idx, 'code', e.target.value)}
                                        placeholder="Voucher Code"
                                        className="px-3 py-2 bg-dark-700 rounded text-sm text-white placeholder-gray-500 border border-dark-600 focus:border-primary-500 focus:outline-none"
                                    />
                                    <input
                                        type="number"
                                        value={action.params.value as number || ''}
                                        onChange={(e) => handleActionParamChange(idx, 'value', Number(e.target.value))}
                                        placeholder="Value"
                                        className="px-3 py-2 bg-dark-700 rounded text-sm text-white placeholder-gray-500 border border-dark-600 focus:border-primary-500 focus:outline-none"
                                    />
                                </div>
                            )}

                            {action.type === 'setRewardStatus' && (
                                <select
                                    value={action.params.status as string || ''}
                                    onChange={(e) => handleActionParamChange(idx, 'status', e.target.value)}
                                    className="w-full px-3 py-2 bg-dark-700 rounded text-sm text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
                                >
                                    <option value="">Select Status</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="PAID">Paid</option>
                                    <option value="REVERSED">Reversed</option>
                                </select>
                            )}

                            {action.type === 'sendNotification' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={action.params.template as string || ''}
                                        onChange={(e) => handleActionParamChange(idx, 'template', e.target.value)}
                                        placeholder="Template"
                                        className="px-3 py-2 bg-dark-700 rounded text-sm text-white placeholder-gray-500 border border-dark-600 focus:border-primary-500 focus:outline-none"
                                    />
                                    <select
                                        value={action.params.channel as string || 'email'}
                                        onChange={(e) => handleActionParamChange(idx, 'channel', e.target.value)}
                                        className="px-3 py-2 bg-dark-700 rounded text-sm text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
                                    >
                                        <option value="email">Email</option>
                                        <option value="sms">SMS</option>
                                        <option value="push">Push</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <button
                    onClick={addAction}
                    className="w-full px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-primary-400 transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Action
                </button>
            </div>
        );
    };

    return (
        <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                    Node Properties
                </h3>
                <button
                    onClick={() => selectNode(null)}
                    className="text-gray-500 hover:text-gray-300"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Label</label>
                    <input
                        type="text"
                        value={selectedNode.data.label}
                        onChange={(e) => handleLabelChange(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-700 rounded-lg text-white text-sm border border-dark-600 focus:border-primary-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1">Type</label>
                    <div className="px-3 py-2 bg-dark-800 rounded-lg text-gray-400 text-sm capitalize">
                        {selectedNode.type}
                    </div>
                </div>

                {selectedNode.type === 'condition' && renderConditionEditor()}
                {selectedNode.type === 'action' && renderActionEditor()}

                {selectedNode.type !== 'start' && (
                    <button
                        onClick={() => deleteNode(selectedNode.id)}
                        className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-lg text-red-400 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Node
                    </button>
                )}
            </div>
        </div>
    );
}
