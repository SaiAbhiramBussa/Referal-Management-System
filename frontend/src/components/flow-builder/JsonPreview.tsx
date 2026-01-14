import { useState } from 'react';
import { useFlowStore } from '@/store';

export default function JsonPreview() {
    const { exportToJSON, importFromJSON, clearFlow, ruleName, ruleDescription, setRuleName, setRuleDescription } = useFlowStore();
    const [isExpanded, setIsExpanded] = useState(true);
    const [importInput, setImportInput] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);

    const ruleJson = exportToJSON();

    const handleExport = () => {
        const json = JSON.stringify(ruleJson, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${ruleName.toLowerCase().replace(/\s+/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        try {
            const rule = JSON.parse(importInput);
            importFromJSON(rule);
            setShowImportModal(false);
            setImportInput('');
        } catch (e) {
            alert('Invalid JSON format');
        }
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(ruleJson, null, 2));
    };

    return (
        <>
            <div className="glass-card rounded-xl overflow-hidden">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-dark-700/50 transition-colors"
                >
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Rule JSON
                    </h3>
                    <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isExpanded && (
                    <div className="p-4 pt-0 space-y-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Rule Name</label>
                            <input
                                type="text"
                                value={ruleName}
                                onChange={(e) => setRuleName(e.target.value)}
                                className="w-full px-3 py-2 bg-dark-700 rounded-lg text-white text-sm border border-dark-600 focus:border-primary-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Description</label>
                            <textarea
                                value={ruleDescription}
                                onChange={(e) => setRuleDescription(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 bg-dark-700 rounded-lg text-white text-sm border border-dark-600 focus:border-primary-500 focus:outline-none resize-none"
                                placeholder="Optional description..."
                            />
                        </div>

                        <div className="relative">
                            <pre className="p-3 bg-dark-900 rounded-lg text-xs text-gray-300 overflow-auto max-h-48 font-mono">
                                {JSON.stringify(ruleJson, null, 2)}
                            </pre>
                            <button
                                onClick={handleCopyToClipboard}
                                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white bg-dark-800/80 rounded transition-colors"
                                title="Copy to clipboard"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={handleExport}
                                className="px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Export
                            </button>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="px-3 py-2 bg-dark-600 hover:bg-dark-500 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Import
                            </button>
                            <button
                                onClick={clearFlow}
                                className="px-3 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-500 rounded-lg text-gray-300 text-sm font-medium transition-colors flex items-center justify-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Reset
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card rounded-xl p-6 w-full max-w-lg mx-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Import Rule JSON</h3>
                        <textarea
                            value={importInput}
                            onChange={(e) => setImportInput(e.target.value)}
                            rows={10}
                            className="w-full px-3 py-2 bg-dark-800 rounded-lg text-white text-sm font-mono border border-dark-600 focus:border-primary-500 focus:outline-none resize-none mb-4"
                            placeholder="Paste your rule JSON here..."
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="px-4 py-2 bg-dark-600 hover:bg-dark-500 rounded-lg text-white text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white text-sm font-medium transition-colors"
                            >
                                Import
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
