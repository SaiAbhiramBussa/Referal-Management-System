'use client';

import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import JsonPreview from '@/components/JsonPreview';

// Dynamic import for ReactFlow to avoid SSR issues
const FlowCanvas = dynamic(() => import('@/components/FlowCanvas'), {
  ssr: false,
  loading: () => <div className="flow-canvas">Loading...</div>,
});

export default function Home() {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <FlowCanvas />
        <JsonPreview />
      </div>
    </div>
  );
}
