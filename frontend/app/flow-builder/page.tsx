'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FlowBuilder from '@/components/flow/FlowBuilder';
import { flowApi } from '@/lib/api';
import { Node, Edge } from 'reactflow';

export default function FlowBuilderPage() {
  const router = useRouter();
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNameModal, setShowNameModal] = useState(true);

  const handleSave = async (nodes: Node[], edges: Edge[]) => {
    if (!flowName) {
      alert('Please enter a flow name');
      setShowNameModal(true);
      return;
    }

    setSaving(true);
    try {
      await flowApi.createFlow({
        name: flowName,
        description: flowDescription,
        definition: {
          nodes,
          edges,
        },
      });
      alert('Flow saved successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      alert('Error saving flow: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (showNameModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Create New Flow</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Flow Name</label>
            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter flow name"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              value={flowDescription}
              onChange={(e) => setFlowDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter flow description"
              rows={3}
            />
          </div>
          <button
            onClick={() => {
              if (flowName) {
                setShowNameModal(false);
              } else {
                alert('Please enter a flow name');
              }
            }}
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <FlowBuilder onSave={handleSave} />
      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">
            <p>Saving flow...</p>
          </div>
        </div>
      )}
    </div>
  );
}
