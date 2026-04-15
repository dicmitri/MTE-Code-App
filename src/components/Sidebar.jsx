import React, { useState, useEffect, useMemo } from 'react';
import { AppIcon } from './AppIcons';
import { Highlight } from './Highlight';
import { FULL_CODE_DATA, updateSearchStatus } from '../data/codeData';
import { SECTIONS } from '../config/sections';

/**
 * CollapsibleGroup — a generic collapsible section with a header and children.
 */
const CollapsibleGroup = ({ label, icon, badge, expanded, onToggle, children, className = '' }) => (
  <div className={className}>
    <button
      onClick={onToggle}
      className="w-full flex justify-between items-center px-4 mb-2 group"
    >
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
        {icon && <AppIcon name={icon} size={12} />}
        {label}
      </div>
      <div className="flex items-center gap-1.5">
        {badge !== undefined && badge !== null && (
          <span className="text-[10px] font-bold bg-purple-50 text-[#7654A1] px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        <AppIcon
          name={expanded ? 'ChevronUp' : 'ChevronDown'}
          size={12}
          className="text-gray-400 group-hover:text-gray-600 transition-colors"
        />
      </div>
    </button>
    {expanded && (
      <div className="animate-fade-in">
        {children}
      </div>
    )}
  </div>
);

export const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  searchTerm,
  setSearchTerm,
  debouncedSearch,
  activeId,
  activeSection,
  setActiveId,
  setActiveSection,
  setShowSummary,
  setShowFullText,
  onGoHome,
  installPromptEvent,
  isIos,
  setShowIosPrompt,
  handleInstallClick,
  bookmarks = [],
  recentHistory = [],
  searchFilters = { titles: true, text: true, qa: true },
  setSearchFilters
}) => {
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = new Set();
    // On Home: bookmarks and history expanded
    if (!activeSection) {
      initial.add('bookmarks');
      initial.add('history');
    }
    return initial;
  });

  // Track pre-search expansion state for restoration
  const [preSearchExpanded, setPreSearchExpanded] = useState(null);

  // When activeSection changes, update default expansion
  useEffect(() => {
    setExpandedGroups(prev => {
      const next = new Set();
      if (!activeSection) {
        // Home: expand bookmarks and history
        if (bookmarks.length > 0) next.add('bookmarks');
        if (recentHistory.length > 0) next.add('history');
      } else if (activeSection === 'code') {
        next.add('section-code');
        // Expand all Code sub-groups by default
        next.add('code-intro');
        next.add('code-part1');
        next.add('code-part2');
        next.add('code-part3');
        next.add('code-website');
      } else if (activeSection === 'trees') {
        next.add('section-trees');
      }
      return next;
    });
  }, [activeSection]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Code chapter parts config
  const CODE_PARTS = [
    { id: 'intro', groupKey: 'code-intro', label: 'Introductory Chapters' },
    { id: 'part1', groupKey: 'code-part1', label: 'Part 1: The Code' },
    { id: 'part2', groupKey: 'code-part2', label: 'Part 2: Complaint Handling' },
    { id: 'part3', groupKey: 'code-part3', label: 'Part 3: Annexes & Glossary' },
    { id: 'website', groupKey: 'code-website', label: 'Website' },
  ];

  // Compute search results for Code sections
  const searchResults = useMemo(() => {
    if (!debouncedSearch) return null;

    const term = debouncedSearch.toLowerCase().trim();
    const results = {};
    let totalMatches = 0;

    CODE_PARTS.forEach(part => {
      const items = FULL_CODE_DATA.filter(ch => ch.part === part.id).map(ch => {
        const count = (txt) => (txt || '').toString().toLowerCase().split(term).length - 1;
        let matches = 0;
        if (searchFilters.titles) matches += count(ch.title);
        if (searchFilters.text) matches += count(ch.summary);
        (ch.sections || []).forEach(s => {
          if (searchFilters.titles) matches += count(s.title);
          if (searchFilters.text) matches += count(s.legalText);
          if (searchFilters.qa) {
            (s.qas || []).forEach(q => (matches += count(q.q) + count(q.a)));
          }
        });
        return { ...ch, matchCount: matches };
      }).filter(ch => ch.matchCount > 0);

      const sectionTotal = items.reduce((acc, curr) => acc + curr.matchCount, 0);
      results[part.id] = { items, total: sectionTotal };
      totalMatches += sectionTotal;
    });

    return { byPart: results, total: totalMatches };
  }, [debouncedSearch, searchFilters]);

  // When search starts, save current expansion and auto-expand matching groups
  useEffect(() => {
    if (debouncedSearch && debouncedSearch.trim()) {
      if (!preSearchExpanded) {
        setPreSearchExpanded(new Set(expandedGroups));
      }
      // Auto-expand the Code section and any sub-groups with matches
      setExpandedGroups(prev => {
        const next = new Set(prev);
        next.add('section-code');
        if (searchResults) {
          CODE_PARTS.forEach(part => {
            if (searchResults.byPart[part.id]?.total > 0) {
              next.add(part.groupKey);
            }
          });
        }
        return next;
      });

      // Update search status for accessibility
      if (searchResults) {
        updateSearchStatus(
          searchResults.total > 0
            ? `${searchResults.total} matches found for "${debouncedSearch.trim()}"`
            : `No results found for "${debouncedSearch.trim()}"`
        );
      }
    } else {
      // Restore pre-search state
      if (preSearchExpanded) {
        setExpandedGroups(preSearchExpanded);
        setPreSearchExpanded(null);
      }
      updateSearchStatus('Search empty');
    }
  }, [debouncedSearch, searchResults]);

  return (
    <aside
      className={`
        w-80 bg-white border-r border-gray-200 flex flex-col h-full shrink-0 shadow-sm z-40
        fixed inset-y-0 left-0 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:sticky md:top-0
      `}
    >
      {/* Top section: close button + home + search */}
      <div className="p-8 pr-12 pt-10 pb-4 relative">
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-lg"
        >
          <AppIcon name="X" size={20} />
        </button>

        <div
          id="search-status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {/* Search bar */}
        <div className="relative mb-6 px-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <AppIcon name="Search" size={16} />
          </div>
          <input
            id="searchTerm"
            type="text"
            placeholder="Search the Code..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#7654A1] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search the Code"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                updateSearchStatus('Search cleared');
              }}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-[#7654A1] transition-colors"
              title="Clear search"
              aria-label="Clear search"
              type="button"
            >
              <AppIcon name="X" size={18} />
            </button>
          )}
        </div>

        {/* Search filter chips */}
        {searchTerm && (
          <div className="mb-6 px-2 flex flex-wrap gap-1.5 animate-fade-in no-print">
            {[
              { key: 'titles', label: 'Titles' },
              { key: 'text', label: 'Full Text' },
              { key: 'qa', label: 'Q&As' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setSearchFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-colors ${
                  searchFilters[f.key]
                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                    : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                }`}
                type="button"
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Home button */}
        <button
          onClick={() => {
            onGoHome();
            setSidebarOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold mb-2 transition-all border ${
            activeSection === null
              ? 'bg-gray-100 border-gray-200 text-gray-900'
              : 'text-gray-500 border-transparent hover:bg-gray-50'
          }`}
        >
          <AppIcon name="Home" size={18} /> Home
        </button>
      </div>

      {/* Scrollable navigation area */}
      <nav
        className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
        }}
      >
        {/* Bookmarks */}
        {bookmarks && bookmarks.length > 0 && !debouncedSearch && (
          <CollapsibleGroup
            label="Bookmarks"
            icon="Star"
            expanded={expandedGroups.has('bookmarks')}
            onToggle={() => toggleGroup('bookmarks')}
          >
            <div className="space-y-1">
              {bookmarks.map((b) => (
                <button
                  key={`bm-${b.id}`}
                  onClick={() => {
                    const section = b.section || 'code';
                    setActiveSection(section);
                    setActiveId(b.chapterId);
                    setTimeout(() => {
                      const el = document.getElementById(b.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                    setSidebarOpen(false);
                  }}
                  className="w-full group text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 text-purple-700 hover:bg-purple-50 hover:text-purple-900 border border-transparent hover:border-purple-200"
                >
                  <span className="shrink-0 text-purple-400">
                    <AppIcon name="Bookmark" size={16} />
                  </span>
                  <span className="truncate flex-1 font-medium text-xs">
                    {b.title}
                  </span>
                </button>
              ))}
            </div>
          </CollapsibleGroup>
        )}

        {/* The Code section group */}
        <CollapsibleGroup
          label="The Code"
          icon="FileText"
          badge={debouncedSearch && searchResults ? (searchResults.total > 0 ? `${searchResults.total}` : null) : null}
          expanded={expandedGroups.has('section-code')}
          onToggle={() => toggleGroup('section-code')}
          className="space-y-2"
        >
          {CODE_PARTS.map((part) => {
            const items = debouncedSearch && searchResults
              ? searchResults.byPart[part.id]?.items || []
              : FULL_CODE_DATA.filter(ch => ch.part === part.id).map(ch => ({ ...ch, matchCount: 0 }));

            if (debouncedSearch && items.length === 0) return null;

            const partTotal = items.reduce((acc, curr) => acc + (curr.matchCount || 0), 0);

            return (
              <CollapsibleGroup
                key={part.id}
                label={part.label}
                badge={debouncedSearch && partTotal > 0 ? `${partTotal}` : null}
                expanded={expandedGroups.has(part.groupKey)}
                onToggle={() => toggleGroup(part.groupKey)}
                className="ml-2"
              >
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection('code');
                        setActiveId(item.id);
                        if (debouncedSearch && debouncedSearch.trim() !== '') {
                          setShowSummary(true);
                          setShowFullText(true);
                        }
                        setSidebarOpen(false);
                        window.scrollTo(0, 0);
                      }}
                      className={`w-full group text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ${
                        activeSection === 'code' && activeId === item.id
                          ? 'bg-[#7654A1] text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className={`shrink-0 ${
                          activeSection === 'code' && activeId === item.id
                            ? 'text-[#0099A7]'
                            : 'text-gray-400'
                        }`}
                      >
                        <AppIcon name={item.icon} size={18} />
                      </span>

                      <span className="truncate flex-1">
                        <Highlight text={item.title} query={debouncedSearch} />
                      </span>

                      {item.matchCount > 0 && (
                        <span
                          className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            activeSection === 'code' && activeId === item.id
                              ? 'bg-white/20 text-white'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {item.matchCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </CollapsibleGroup>
            );
          })}
        </CollapsibleGroup>

        {/* Decision Trees section group */}
        {!debouncedSearch && (
          <CollapsibleGroup
            label="Decision Trees"
            icon="GitBranch"
            expanded={expandedGroups.has('section-trees')}
            onToggle={() => toggleGroup('section-trees')}
            className="space-y-2"
          >
            <button
              onClick={() => {
                setActiveSection('trees');
                setActiveId('trees-home');
                setSidebarOpen(false);
              }}
              className={`w-full group text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ml-2 ${
                activeSection === 'trees'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className={`shrink-0 ${activeSection === 'trees' ? 'text-amber-200' : 'text-gray-400'}`}>
                <AppIcon name="GitBranch" size={18} />
              </span>
              <span className="truncate flex-1">Browse Decision Trees</span>
            </button>
          </CollapsibleGroup>
        )}

        {/* Recently Viewed */}
        {!debouncedSearch && recentHistory && recentHistory.length > 0 && (
          <CollapsibleGroup
            label="Recently Viewed"
            icon="Clock"
            expanded={expandedGroups.has('history')}
            onToggle={() => toggleGroup('history')}
            className="mt-4"
          >
            <div className="space-y-1">
              {recentHistory.map((h) => (
                <button
                  key={`history-${h.timestamp}`}
                  onClick={() => {
                    const section = h.section || 'code';
                    setActiveSection(section);
                    setActiveId(h.id);
                    setSidebarOpen(false);
                    window.scrollTo(0, 0);
                  }}
                  className="w-full group text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-200"
                >
                  <span className="shrink-0 text-slate-400">
                    <AppIcon name={h.icon || 'BookOpen'} size={16} />
                  </span>
                  <span className="truncate flex-1 font-medium text-xs">
                    {h.title}
                  </span>
                </button>
              ))}
            </div>
          </CollapsibleGroup>
        )}

        {/* Install button */}
        <div className="pt-4 border-t border-gray-100 mt-4">
          <button
            onClick={(e) => {
              if (isIos) {
                setShowIosPrompt(true);
              } else if (installPromptEvent) {
                handleInstallClick(e);
              } else {
                alert("To install the app, look for the install icon in your browser's address bar or menu.");
              }
            }}
            className="flex items-center justify-center w-full px-4 py-3 text-sm font-bold rounded-xl text-white bg-[#7654A1] hover:bg-[#634488] transition-colors shadow-sm gap-2"
          >
            <AppIcon name="Download" size={18} />
            Install TheCodeApp
          </button>
        </div>
      </nav>
    </aside>
  );
};
