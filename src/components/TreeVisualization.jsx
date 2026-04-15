import React, { useMemo } from 'react';
import { AppIcon } from './AppIcons';
import { TREE_DATA } from '../data/treeData';

const OUTCOME_COLORS = {
  'compliant':     { bg: '#dcfce7', border: '#86efac', text: '#166534' },
  'non-compliant': { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
  'conditional':   { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
  'consult-legal': { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  'not-required':  { bg: '#f0fdfa', border: '#5eead4', text: '#115e59' }, // teal
  'out-of-scope':  { bg: '#faf5ff', border: '#d8b4fe', text: '#6b21a8' }, // purple
  'not-applicable':{ bg: '#faf5ff', border: '#d8b4fe', text: '#6b21a8' }, // purple
  'prior-review':  { bg: '#faf5ff', border: '#d8b4fe', text: '#6b21a8' }, // purple
};

/**
 * TreeVisualization — renders the full decision tree as a visual flowchart.
 * Uses a recursive layout with CSS positioning instead of an external library.
 */
export const TreeVisualization = ({ treeId, highlightedPath = [], onClose }) => {
  const tree = TREE_DATA.find(t => t.id === treeId);

  // Build an adjacency map for the tree
  const nodeMap = useMemo(() => {
    if (!tree) return {};
    const map = {};
    tree.nodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [tree]);

  // Set of highlighted node IDs (from interactive walk-through)
  const highlightedSet = useMemo(() => new Set(highlightedPath), [highlightedPath]);

  if (!tree) {
    return <div className="p-8 text-gray-400 text-center">Tree not found.</div>;
  }

  // Recursive node renderer
  const renderNode = (nodeId, depth = 0) => {
    const node = nodeMap[nodeId];
    if (!node) return null;

    const isHighlighted = highlightedSet.has(nodeId);

    if (node.type === 'result') {
      const colors = OUTCOME_COLORS[node.outcome] || OUTCOME_COLORS['conditional'];
      return (
        <div
          key={nodeId}
          className={`rounded-xl p-4 border-2 transition-all ${isHighlighted ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
          style={{
            backgroundColor: colors.bg,
            borderColor: colors.border,
            color: colors.text,
            minWidth: '200px',
            maxWidth: '280px',
          }}
        >
          <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">
            {node.outcome?.replace('-', ' ')}
          </div>
          <p className="text-xs font-medium leading-relaxed">{node.text}</p>
        </div>
      );
    }

    // Question node with children
    return (
      <div key={nodeId} className="flex flex-col items-center">
        <div
          className={`rounded-xl p-4 border-2 bg-white transition-all mb-4 ${
            isHighlighted
              ? 'border-amber-400 ring-2 ring-amber-200 shadow-md'
              : 'border-gray-200 shadow-sm'
          }`}
          style={{ minWidth: '220px', maxWidth: '320px' }}
        >
          <p className="text-xs font-semibold text-gray-800 leading-relaxed text-center">
            {node.text}
          </p>
        </div>

        {/* Option branches */}
        {node.options && node.options.length > 0 && (
          <div className="flex gap-6 items-start justify-center relative">
            {/* Horizontal connector line */}
            {node.options.length > 1 && (
              <div
                className="absolute top-0 bg-gray-300"
                style={{
                  height: '1px',
                  left: `calc(50% - ${(node.options.length - 1) * 50}%)`,
                  right: `calc(50% - ${(node.options.length - 1) * 50}%)`,
                  minWidth: '40px',
                }}
              />
            )}

            {node.options.map((opt, i) => {
              const isOptionHighlighted = isHighlighted && highlightedSet.has(opt.next);
              return (
                <div key={i} className="flex flex-col items-center">
                  {/* Vertical connector */}
                  <div className={`w-0.5 h-4 ${isOptionHighlighted ? 'bg-amber-400' : 'bg-gray-300'}`} />


                  {/* Option label */}
                  <div className={`text-[10px] font-medium px-2 py-1 rounded-md mb-2 text-center max-w-[150px] ${
                    isOptionHighlighted
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {opt.label}
                  </div>

                  {/* Vertical connector */}
                  <div className={`w-0.5 h-4 ${isOptionHighlighted ? 'bg-amber-400' : 'bg-gray-300'}`} />

                  {/* Child node */}
                  {renderNode(opt.next, depth + 1)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in py-10 px-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{tree.title}</h1>
          <p className="text-sm text-gray-500">Full decision tree visualization</p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <AppIcon name="ChevronLeft" size={14} />
          Back to Interactive
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-8 text-xs">
        {Object.entries(OUTCOME_COLORS).map(([outcome, colors]) => (
          <div
            key={outcome}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
            style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.border }} />
            {outcome.replace('-', ' ')}
          </div>
        ))}
      </div>

      {/* Tree visualization */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 overflow-x-auto">
        <div className="min-w-max flex justify-center">
          {renderNode('start')}
        </div>
      </div>
    </div>
  );
};
