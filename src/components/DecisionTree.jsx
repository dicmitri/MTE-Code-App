import React, { useState, useCallback } from 'react';
import { AppIcon } from './AppIcons';
import { TREE_DATA } from '../data/treeData';

const OUTCOME_STYLES = {
  'compliant':     { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-800', icon: '✅', label: 'Compliant' },
  'non-compliant': { bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-800',     icon: '❌', label: 'Non-Compliant' },
  'conditional':   { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-800',   icon: '⚠️', label: 'Conditional' },
  'consult-legal': { bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-800',    icon: '⚖️', label: 'Consult Legal' },
};

export const DecisionTree = ({ treeId, onShowVisualization }) => {
  const tree = TREE_DATA.find(t => t.id === treeId);
  const [currentNodeId, setCurrentNodeId] = useState('start');
  const [pathHistory, setPathHistory] = useState([]);

  const currentNode = tree?.nodes?.find(n => n.id === currentNodeId);

  const handleOption = useCallback((nextId, optionLabel) => {
    setPathHistory(prev => [...prev, { nodeId: currentNodeId, choice: optionLabel }]);
    setCurrentNodeId(nextId);
  }, [currentNodeId]);

  const handleGoBack = useCallback(() => {
    if (pathHistory.length === 0) return;
    const prev = pathHistory[pathHistory.length - 1];
    setPathHistory(p => p.slice(0, -1));
    setCurrentNodeId(prev.nodeId);
  }, [pathHistory]);

  const handleReset = useCallback(() => {
    setCurrentNodeId('start');
    setPathHistory([]);
  }, []);

  if (!tree) {
    return (
      <div className="animate-fade-in py-20 text-center text-gray-400">
        <p className="text-lg">Decision tree not found.</p>
      </div>
    );
  }

  if (!currentNode) {
    return (
      <div className="animate-fade-in py-20 text-center text-gray-400">
        <p className="text-lg">Error: Invalid node in decision tree.</p>
        <button onClick={handleReset} className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
          Reset Tree
        </button>
      </div>
    );
  }

  const outcomeStyle = currentNode.type === 'result' 
    ? (OUTCOME_STYLES[currentNode.outcome] || OUTCOME_STYLES['conditional'])
    : null;

  return (
    <div className="animate-fade-in py-10 px-4 max-w-3xl mx-auto">
      {/* Tree header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{tree.title}</h1>
          <div className="flex gap-2">
            <button
              onClick={onShowVisualization}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <AppIcon name="GitBranch" size={14} />
              View Full Tree
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500">{tree.description}</p>
      </div>

      {/* Breadcrumb trail */}
      {pathHistory.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-1 text-xs text-gray-400">
          <span className="font-medium text-gray-500">Path:</span>
          {pathHistory.map((step, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{step.choice}</span>
              {i < pathHistory.length - 1 && <AppIcon name="ChevronRight" size={10} />}
            </span>
          ))}
        </div>
      )}

      {/* Question node */}
      {currentNode.type === 'question' && (
        <div className="animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                Question {pathHistory.length + 1}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 leading-relaxed mb-6">
              {currentNode.text}
            </p>

            {currentNode.helpText && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AppIcon name="Info" size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">{currentNode.helpText}</p>
              </div>
            )}

            <div className="space-y-3">
              {currentNode.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleOption(option.next, option.label)}
                  className="w-full text-left px-5 py-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-amber-50 hover:border-amber-300 transition-all text-sm font-medium text-gray-800 flex items-center justify-between group active:scale-[0.98]"
                >
                  <span>{option.label}</span>
                  <AppIcon name="ChevronRight" size={16} className="text-gray-300 group-hover:text-amber-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {pathHistory.length > 0 && (
              <button
                onClick={handleGoBack}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <AppIcon name="ChevronLeft" size={14} />
                Go Back
              </button>
            )}
            {pathHistory.length > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                <AppIcon name="RotateCcw" size={14} />
                Start Over
              </button>
            )}
          </div>
        </div>
      )}

      {/* Result node */}
      {currentNode.type === 'result' && outcomeStyle && (
        <div className="animate-fade-in">
          <div className={`rounded-2xl border-2 ${outcomeStyle.border} ${outcomeStyle.bg} p-8 mb-6`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{outcomeStyle.icon}</span>
              <span className={`text-sm font-bold uppercase tracking-wider ${outcomeStyle.text}`}>
                {outcomeStyle.label}
              </span>
            </div>
            <p className={`text-lg font-semibold leading-relaxed mb-4 ${outcomeStyle.text}`}>
              {currentNode.text}
            </p>

            {currentNode.reference && (
              <div className="bg-white/60 rounded-xl p-4 border border-white/80">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reference</p>
                <p className="text-sm text-gray-700">{currentNode.reference}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <AppIcon name="ChevronLeft" size={14} />
              Go Back
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <AppIcon name="RotateCcw" size={14} />
              Try Different Scenario
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
