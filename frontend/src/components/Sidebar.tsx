'use client';

import React from 'react';
import { useFlowStore } from '@/store/flowStore';
import { ConditionOperator, ActionType, ConditionNode, ActionDefinition } from '@/types/rule';

export default function Sidebar() {
  const {
    selectedNode,
    ruleName,
    setRuleName,
    addNode,
    updateNodeConfig,
    deleteNode,
  } = useFlowStore();

  const handleConditionChange = (field: keyof ConditionNode, value: string | boolean) => {
    if (!selectedNode || selectedNode.data.type !== 'condition') return;
    const currentConfig = selectedNode.data.config as ConditionNode;
    updateNodeConfig(selectedNode.id, { ...currentConfig, [field]: value });
  };

  const handleActionChange = (field: string, value: string | number) => {
    if (!selectedNode || selectedNode.data.type !== 'action') return;
    const currentConfig = selectedNode.data.config as ActionDefinition;
    if (field === 'type') {
      updateNodeConfig(selectedNode.id, { ...currentConfig, type: value as ActionType });
    } else {
      updateNodeConfig(selectedNode.id, {
        ...currentConfig,
        params: { ...currentConfig.params, [field]: value },
      });
    }
  };

  return (
    <div className="sidebar">
      <h2>Flow Builder</h2>
      
      <div className="sidebar-section">
        <label>Rule Name</label>
        <input
          type="text"
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
          className="input"
        />
      </div>

      <div className="sidebar-section">
        <h3>Add Nodes</h3>
        <div className="button-group">
          <button onClick={() => addNode('condition')} className="btn btn-condition">
            + Condition
          </button>
          <button onClick={() => addNode('action')} className="btn btn-action">
            + Action
          </button>
          <button onClick={() => addNode('end')} className="btn btn-end">
            + End
          </button>
        </div>
      </div>

      {selectedNode && selectedNode.data.type === 'condition' && (
        <div className="sidebar-section">
          <h3>Edit Condition</h3>
          <div className="form-group">
            <label>Field</label>
            <input
              type="text"
              value={(selectedNode.data.config as ConditionNode)?.field || ''}
              onChange={(e) => handleConditionChange('field', e.target.value)}
              placeholder="e.g., referrer.status"
              className="input"
            />
          </div>
          <div className="form-group">
            <label>Operator</label>
            <select
              value={(selectedNode.data.config as ConditionNode)?.operator || '='}
              onChange={(e) => handleConditionChange('operator', e.target.value)}
              className="select"
            >
              {Object.values(ConditionOperator).map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Value</label>
            <input
              type="text"
              value={String((selectedNode.data.config as ConditionNode)?.value || '')}
              onChange={(e) => handleConditionChange('value', e.target.value)}
              className="input"
            />
          </div>
          <button onClick={() => deleteNode(selectedNode.id)} className="btn btn-delete">
            Delete Node
          </button>
        </div>
      )}

      {selectedNode && selectedNode.data.type === 'action' && (
        <div className="sidebar-section">
          <h3>Edit Action</h3>
          <div className="form-group">
            <label>Action Type</label>
            <select
              value={(selectedNode.data.config as ActionDefinition)?.type || ActionType.CREATE_REWARD}
              onChange={(e) => handleActionChange('type', e.target.value)}
              className="select"
            >
              {Object.values(ActionType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              value={(selectedNode.data.config as ActionDefinition)?.params?.amount as number || 0}
              onChange={(e) => handleActionChange('amount', Number(e.target.value))}
              className="input"
            />
          </div>
          <div className="form-group">
            <label>Currency</label>
            <input
              type="text"
              value={(selectedNode.data.config as ActionDefinition)?.params?.currency as string || 'INR'}
              onChange={(e) => handleActionChange('currency', e.target.value)}
              className="input"
            />
          </div>
          <button onClick={() => deleteNode(selectedNode.id)} className="btn btn-delete">
            Delete Node
          </button>
        </div>
      )}

      {selectedNode && selectedNode.data.type === 'end' && (
        <div className="sidebar-section">
          <h3>End Node</h3>
          <p>This is the end of the flow.</p>
          <button onClick={() => deleteNode(selectedNode.id)} className="btn btn-delete">
            Delete Node
          </button>
        </div>
      )}
    </div>
  );
}
