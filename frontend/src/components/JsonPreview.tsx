'use client';

import React, { useState, useRef } from 'react';
import { useFlowStore } from '@/store/flowStore';

export default function JsonPreview() {
  const { exportRule, importRule, resetFlow } = useFlowStore();
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rule = exportRule();
  const jsonString = JSON.stringify(rule, null, 2);

  const handleExport = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rule.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.conditions && json.actions) {
          importRule(json);
          setShowImport(false);
        } else {
          alert('Invalid rule format');
        }
      } catch (err) {
        alert('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="json-preview">
      <div className="json-header">
        <h3>Live JSON Preview</h3>
        <div className="json-actions">
          <button onClick={handleExport} className="btn btn-primary">
            Export JSON
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary">
            Import JSON
          </button>
          <button onClick={resetFlow} className="btn btn-reset">
            Reset
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        style={{ display: 'none' }}
      />
      <pre className="json-content">{jsonString}</pre>
    </div>
  );
}
