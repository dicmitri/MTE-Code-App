import React from 'react';
import { AppIcon } from './AppIcons';
import { TREE_DATA } from '../data/treeData';

const CATEGORY_CONFIG = {
  scope:      { label: 'Scope & Applicability', color: '#e11d48', icon: 'Compass' },
  events:     { label: 'Events',                color: '#0099A7', icon: 'Globe' },
  grants:     { label: 'Grants and Donations',  color: '#e67e22', icon: 'Star' },
  consulting: { label: 'Consulting Agreements', color: '#7654A1', icon: 'FileText' },
  items:      { label: 'Educational & Promotional Items', color: '#3b82f6', icon: 'Gift' },
  research:   { label: 'Research',              color: '#2ecc71', icon: 'Search' },
  default:    { label: 'General',               color: '#95a5a6', icon: 'GitBranch' },
};

export const TreeLandingPage = ({ onSelectTree }) => {
  const [filterText, setFilterText] = React.useState('');

  const filteredTrees = React.useMemo(() => {
    if (!filterText.trim()) return TREE_DATA;
    const term = filterText.toLowerCase().trim();
    return TREE_DATA.filter(
      (t) =>
        t.title.toLowerCase().includes(term) ||
        (t.description && t.description.toLowerCase().includes(term))
    );
  }, [filterText]);

  // Group filtered trees by category
  const grouped = filteredTrees.reduce((acc, tree) => {
    const cat = tree.category || 'default';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tree);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in py-10 px-4 max-w-5xl mx-auto overflow-y-auto h-full custom-scrollbar pb-24">
      <div className="text-center mb-8">
        <div className="inline-flex p-4 rounded-2xl bg-amber-50 mb-6">
          <AppIcon name="GitBranch" size={48} className="text-amber-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Decision Trees</h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto font-light leading-relaxed mb-6">
          Interactive compliance decision guides based on the MedTech Europe Code.
          Step through scenarios to assess compliance.
        </p>

        {/* Filter input */}
        <div className="relative max-w-md mx-auto">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <AppIcon name="Search" size={16} />
          </div>
          <input
            type="text"
            placeholder="Search decision trees (e.g. Grants, Hospitality, Events)..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500 shadow-sm transition-all"
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-amber-600 transition-colors"
              title="Clear search"
            >
              <AppIcon name="X" size={16} />
            </button>
          )}
        </div>
      </div>

      {Object.keys(CATEGORY_CONFIG).map((category) => {
        const trees = grouped[category];
        if (!trees || trees.length === 0) return null;
        
        const config = CATEGORY_CONFIG[category];
        return (
          <div key={category} className="mb-10">
            <div className="flex items-center gap-2 mb-4 px-1">
              <span style={{ color: config.color }}>
                <AppIcon name={config.icon} size={16} />
              </span>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                {config.label}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trees.map((tree) => (
                <button
                  key={tree.id}
                  onClick={() => onSelectTree(tree.id)}
                  className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-left transition-all hover:shadow-md hover:-translate-y-1 active:scale-[0.98] relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-300 group-hover:h-1"
                    style={{ backgroundColor: config.color }}
                  />

                  <div className="flex items-start gap-4">
                    <div
                      className="p-2.5 rounded-lg shrink-0"
                      style={{
                        backgroundColor: `${config.color}12`,
                        color: config.color,
                      }}
                    >
                      <AppIcon name="GitBranch" size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1 text-sm">
                        {tree.title}
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {tree.description}
                      </p>
                      <div className="mt-3 flex items-center text-xs font-bold uppercase tracking-wider" style={{ color: config.color }}>
                        Start
                        <AppIcon name="ChevronRight" size={12} className="ml-1 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {TREE_DATA.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <AppIcon name="GitBranch" size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No decision trees available yet.</p>
          <p className="text-sm mt-1">Decision trees will be added in a future update.</p>
        </div>
      )}
    </div>
  );
};
