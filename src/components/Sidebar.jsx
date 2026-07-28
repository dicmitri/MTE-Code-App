import React, { useState, useEffect, useMemo } from 'react';
import { AppIcon } from './AppIcons';
import { Highlight } from './Highlight';
import { FULL_CODE_DATA, updateSearchStatus } from '../data/codeData';
import {
  TRANSPARENCY_DOCUMENTS,
} from '../data/transparency/transparencyData';
import { addRecentSearch, normalizeRecentSearches } from '../utils/recentSearchUtils';
import { htmlToPlainText } from '../utils/htmlTextUtils';
import {
  getSearchExpansionRestore,
  getSearchExpansionSnapshot,
  hasOnlyQaMatches,
  normalizeSearchQuery,
} from '../utils/searchResultUtils';

/**
 * CollapsibleGroup — a generic collapsible section with a header and children.
 */
const CollapsibleGroup = ({
  label,
  icon,
  badge,
  expanded,
  onToggle,
  children,
  className = '',
}) => {
  const panelId = React.useId();

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex justify-between items-center px-4 mb-2 group"
        aria-expanded={expanded}
        aria-controls={panelId}
      >
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
          {icon && <AppIcon name={icon} size={12} />}
          {label}
        </span>
        <span className="flex items-center gap-1.5">
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
        </span>
      </button>
      {expanded && (
        <div id={panelId} className="animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};

const getItemSearchResult = (item, term, searchFilters) => {
  const count = (text) => (
    htmlToPlainText(text).toLowerCase().split(term).length - 1
  );
  let titleMatches = 0;
  let textMatches = 0;
  let qaMatches = 0;

  if (searchFilters.titles) {
    [...new Set([item.title, item.displayTitle].filter(Boolean))]
      .forEach((title) => {
        titleMatches += count(title);
      });
  }
  if (searchFilters.text) textMatches += count(item.summary);
  (item.sections || []).forEach((section) => {
    if (searchFilters.titles) titleMatches += count(section.title);
    if (searchFilters.text) textMatches += count(section.legalText);
    if (searchFilters.qa) {
      (section.qas || []).forEach((qa) => {
        qaMatches += count(qa.label) + count(qa.q) + count(qa.a);
      });
    }
  });

  const matchCount = titleMatches + textMatches + qaMatches;
  return {
    ...item,
    matchCount,
    matchBreakdown: {
      title: titleMatches,
      text: textMatches,
      qa: qaMatches,
    },
  };
};

const getDefaultExpandedGroups = ({
  activeSection,
  activeDocumentId,
  hasBookmarks,
  hasRecentHistory,
}) => {
  const groups = new Set();

  if (!activeSection) {
    if (hasBookmarks) groups.add('bookmarks');
    if (hasRecentHistory) groups.add('history');
  } else if (activeSection === 'code') {
    groups.add('section-code');
    groups.add('code-intro');
    groups.add('code-part1');
    groups.add('code-part2');
    groups.add('code-part3');
    groups.add('code-website');
  } else if (activeSection === 'trees') {
    groups.add('section-trees');
  } else if (activeSection === 'transparency') {
    groups.add('section-transparency');
    if (activeDocumentId) groups.add(`transparency-${activeDocumentId}`);
  }

  return groups;
};

export const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  searchTerm,
  setSearchTerm,
  debouncedSearch,
  activeId,
  activeSection,
  activeDocumentId,
  onNavigateChapter,
  onNavigateCodeSection,
  onNavigateTrees,
  onNavigateTransparency,
  onNavigateTransparencyDocument,
  onNavigateTransparencyUnit,
  onNavigateTransparencySection,
  setShowSummary,
  setShowFullText,
  setShowQA,
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
  const isTransparencySearch = activeSection === 'transparency';

  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState(() => (
    getDefaultExpandedGroups({
      activeSection,
      activeDocumentId,
      hasBookmarks: bookmarks.length > 0,
      hasRecentHistory: recentHistory.length > 0,
    })
  ));

  // Track pre-search expansion state for restoration
  const [preSearchExpanded, setPreSearchExpanded] = useState(null);
  const normalizedSearchTerm = normalizeSearchQuery(debouncedSearch);
  const hasActiveSearch = normalizedSearchTerm.length > 0;
  const searchResultsAreCurrent = normalizeSearchQuery(searchTerm)
    === normalizedSearchTerm;
  const searchExpansionScope = `${activeSection || 'home'}:${activeDocumentId || ''}`;
  const defaultExpandedGroups = useMemo(() => (
    getDefaultExpandedGroups({
      activeSection,
      activeDocumentId,
      hasBookmarks: bookmarks.length > 0,
      hasRecentHistory: recentHistory.length > 0,
    })
  ), [
    activeDocumentId,
    activeSection,
    bookmarks.length,
    recentHistory.length,
  ]);

  // Recent searches state & localStorage sync
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('MTE_RECENT_SEARCHES');
      return saved ? normalizeRecentSearches(JSON.parse(saved)) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (recentSearches.length > 0) {
        localStorage.setItem('MTE_RECENT_SEARCHES', JSON.stringify(recentSearches));
      } else {
        localStorage.removeItem('MTE_RECENT_SEARCHES');
      }
    } catch (error) {
      console.error('Could not save recent searches', error);
    }
  }, [recentSearches]);

  const rememberSearch = (term) => {
    setRecentSearches((previous) => addRecentSearch(previous, term));
  };

  // When activeSection changes, update default expansion
  useEffect(() => {
    setExpandedGroups(new Set(defaultExpandedGroups));
  }, [defaultExpandedGroups]);

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
    if (!hasActiveSearch || isTransparencySearch) return null;

    const term = normalizedSearchTerm.toLowerCase();
    const results = {};
    let totalMatches = 0;

    CODE_PARTS.forEach(part => {
      const items = FULL_CODE_DATA
        .filter((chapter) => chapter.part === part.id)
        .map((chapter) => getItemSearchResult(chapter, term, searchFilters))
        .filter((chapter) => chapter.matchCount > 0);

      const sectionTotal = items.reduce((acc, curr) => acc + curr.matchCount, 0);
      results[part.id] = { items, total: sectionTotal };
      totalMatches += sectionTotal;
    });

    return { byPart: results, total: totalMatches };
  }, [
    hasActiveSearch,
    isTransparencySearch,
    normalizedSearchTerm,
    searchFilters,
  ]);

  const transparencySearchResults = useMemo(() => {
    if (!hasActiveSearch || !isTransparencySearch) return null;

    const term = normalizedSearchTerm.toLowerCase();
    const byDocument = {};
    let total = 0;

    TRANSPARENCY_DOCUMENTS.forEach((document) => {
      const documentResult = getItemSearchResult({
        title: document.title,
        displayTitle: document.eyebrow,
        summary: [document.description, document.publicationDate]
          .filter(Boolean)
          .join(' '),
        sections: [],
      }, term, searchFilters);
      const items = (document.units || [])
        .map((item) => getItemSearchResult(item, term, searchFilters))
        .filter((item) => item.matchCount > 0);
      const documentTotal = documentResult.matchCount
        + items.reduce((sum, item) => sum + item.matchCount, 0);
      byDocument[document.id] = {
        documentMatchCount: documentResult.matchCount,
        items,
        total: documentTotal,
      };
      total += documentTotal;
    });

    return {
      byDocument,
      total,
    };
  }, [
    hasActiveSearch,
    isTransparencySearch,
    normalizedSearchTerm,
    searchFilters,
  ]);

  // When search starts, save current expansion and auto-expand matching groups
  useEffect(() => {
    if (hasActiveSearch) {
      const nextSnapshot = getSearchExpansionSnapshot({
        currentSnapshot: preSearchExpanded,
        scope: searchExpansionScope,
        expandedGroups,
        defaultExpandedGroups,
      });
      if (nextSnapshot !== preSearchExpanded) {
        setPreSearchExpanded(nextSnapshot);
      }
      // Auto-expand the active search scope and matching groups
      setExpandedGroups(prev => {
        const next = new Set(prev);
        if (isTransparencySearch) {
          next.add('section-transparency');
          TRANSPARENCY_DOCUMENTS.forEach((document) => {
            if (transparencySearchResults?.byDocument[document.id]?.total > 0) {
              next.add(`transparency-${document.id}`);
            }
          });
        } else {
          next.add('section-code');
        }
        if (!isTransparencySearch && searchResults) {
          CODE_PARTS.forEach(part => {
            if (searchResults.byPart[part.id]?.total > 0) {
              next.add(part.groupKey);
            }
          });
        }
        return next;
      });

      // Update search status for accessibility
      const activeResults = isTransparencySearch
        ? transparencySearchResults
        : searchResults;
      if (activeResults) {
        updateSearchStatus(
          activeResults.total > 0
            ? `${activeResults.total} matches found for "${normalizedSearchTerm}"`
            : `No results found for "${normalizedSearchTerm}"`
        );
      }
    } else {
      // Restore pre-search state
      if (preSearchExpanded) {
        setExpandedGroups(getSearchExpansionRestore({
          snapshot: preSearchExpanded,
          scope: searchExpansionScope,
          defaultExpandedGroups,
        }));
        setPreSearchExpanded(null);
      }
      updateSearchStatus('Search empty');
    }
  }, [
    defaultExpandedGroups,
    hasActiveSearch,
    isTransparencySearch,
    normalizedSearchTerm,
    preSearchExpanded,
    searchExpansionScope,
    searchResults,
    transparencySearchResults,
  ]);

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
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-lg"
          aria-label="Close navigation"
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
            placeholder={isTransparencySearch ? 'Search Transparency...' : 'Search the Code...'}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#7654A1] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') rememberSearch(searchTerm);
            }}
            aria-label={isTransparencySearch ? 'Search Transparency publications' : 'Search the Code'}
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

        {/* Recent search chips */}
        {!searchTerm && recentSearches.length > 0 && (
          <div className="mb-6 px-2 no-print animate-fade-in">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <AppIcon name="Clock" size={10} /> Recent Searches
              </span>
              <button
                onClick={() => {
                  setRecentSearches([]);
                }}
                className="text-[10px] text-gray-400 hover:text-red-500 font-medium transition-colors"
                title="Clear recent searches"
                type="button"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map(term => (
                <button
                  key={term}
                  onClick={() => setSearchTerm(term)}
                  className="text-xs bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-[#7654A1] border border-slate-200 hover:border-purple-200 rounded-lg px-2.5 py-1 font-medium transition-all flex items-center gap-1.5 group"
                  title={`Search for "${term}"`}
                  type="button"
                >
                  <span>{term}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
        {bookmarks && bookmarks.length > 0 && !hasActiveSearch && (
          <CollapsibleGroup
            label="Bookmarks"
            icon="Star"
            expanded={expandedGroups.has('bookmarks')}
            onToggle={() => toggleGroup('bookmarks')}
          >
            <div className="space-y-1">
              {bookmarks.map((b) => (
                <button
                  key={`bm-${b.key || b.id}`}
                  onClick={() => {
                    if (b.section === 'transparency' && b.documentId) {
                      onNavigateTransparencySection(b.documentId, b.chapterId, b.id);
                    } else {
                      onNavigateCodeSection(b.chapterId, b.id);
                    }
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
        {!isTransparencySearch && (
          <CollapsibleGroup
            label="The Code"
            icon="FileText"
            badge={hasActiveSearch && searchResults ? (searchResults.total > 0 ? `${searchResults.total}` : null) : null}
            expanded={expandedGroups.has('section-code')}
            onToggle={() => toggleGroup('section-code')}
            className="space-y-2"
          >
          {CODE_PARTS.map((part) => {
            const items = hasActiveSearch && searchResults
              ? searchResults.byPart[part.id]?.items || []
              : FULL_CODE_DATA.filter(ch => ch.part === part.id).map(ch => ({ ...ch, matchCount: 0 }));

            if (hasActiveSearch && items.length === 0) return null;

            const partTotal = items.reduce((acc, curr) => acc + (curr.matchCount || 0), 0);

            return (
              <CollapsibleGroup
                key={part.id}
                label={part.label}
                badge={hasActiveSearch && partTotal > 0 ? `${partTotal}` : null}
                expanded={expandedGroups.has(part.groupKey)}
                onToggle={() => toggleGroup(part.groupKey)}
                className="ml-2"
              >
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      disabled={Boolean(searchTerm.trim()) && !searchResultsAreCurrent}
                      onClick={() => {
                        onNavigateChapter(item.id);
                        if (hasActiveSearch) {
                          rememberSearch(searchTerm);
                          setShowSummary(true);
                          setShowFullText(true);
                          if (hasOnlyQaMatches(item.matchBreakdown)) {
                            setShowQA?.(true);
                          }
                        }
                        setSidebarOpen(false);
                        window.scrollTo(0, 0);
                      }}
                      className={`w-full group text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 disabled:cursor-wait disabled:opacity-70 ${
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
                        <Highlight text={item.title} query={normalizedSearchTerm} />
                      </span>

                      {item.matchCount > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                          {hasActiveSearch && item.matchBreakdown?.title > 0 && (
                            <span className={`text-[8px] font-semibold px-1 py-0.5 rounded ${activeSection === 'code' && activeId === item.id ? 'bg-amber-400/30 text-white' : 'bg-amber-100 text-amber-800'}`} title={`${item.matchBreakdown.title} title match(es)`}>
                              Title
                            </span>
                          )}
                          {hasActiveSearch && item.matchBreakdown?.qa > 0 && (
                            <span className={`text-[8px] font-semibold px-1 py-0.5 rounded ${activeSection === 'code' && activeId === item.id ? 'bg-cyan-400/30 text-white' : 'bg-cyan-100 text-cyan-800'}`} title={`${item.matchBreakdown.qa} Q&A match(es)`}>
                              Q&A
                            </span>
                          )}
                          {hasActiveSearch && item.matchBreakdown?.text > 0 && (
                            <span className={`text-[8px] font-semibold px-1 py-0.5 rounded ${activeSection === 'code' && activeId === item.id ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'}`} title={`${item.matchBreakdown.text} text match(es)`}>
                              Text
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              activeSection === 'code' && activeId === item.id
                                ? 'bg-white/20 text-white'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {item.matchCount}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CollapsibleGroup>
            );
          })}
          </CollapsibleGroup>
        )}

        {/* Transparency section group */}
        {(!hasActiveSearch || isTransparencySearch) && (
          <CollapsibleGroup
            label="Transparency"
            icon="Eye"
            badge={
              hasActiveSearch && transparencySearchResults?.total > 0
                ? `${transparencySearchResults.total}`
                : null
            }
            expanded={expandedGroups.has('section-transparency')}
            onToggle={() => toggleGroup('section-transparency')}
            className="space-y-2"
          >
            <button
              type="button"
              onClick={() => {
                onNavigateTransparency();
                setSidebarOpen(false);
              }}
              className={`w-full group text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ml-2 ${
                activeSection === 'transparency' && !activeDocumentId
                  ? 'bg-[#007A86] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AppIcon name="Eye" size={17} />
              <span className="truncate flex-1">Transparency Home</span>
            </button>

            {TRANSPARENCY_DOCUMENTS.map((document) => {
              const documentSearch = transparencySearchResults?.byDocument[document.id];
              if (hasActiveSearch && !documentSearch?.total) return null;

              return (
                <CollapsibleGroup
                  key={document.id}
                  label={document.title}
                  badge={
                    hasActiveSearch && documentSearch?.total > 0
                      ? `${documentSearch.total}`
                      : null
                  }
                  expanded={expandedGroups.has(`transparency-${document.id}`)}
                  onToggle={() => toggleGroup(`transparency-${document.id}`)}
                  className="ml-2"
                >
                  <div className="space-y-1">
                    {(!hasActiveSearch || documentSearch?.documentMatchCount > 0) && (
                      <button
                        type="button"
                        disabled={Boolean(searchTerm.trim()) && !searchResultsAreCurrent}
                        onClick={() => {
                          onNavigateTransparencyDocument(document.id);
                          if (hasActiveSearch) {
                            rememberSearch(searchTerm);
                          }
                          setSidebarOpen(false);
                        }}
                        className={`w-full group text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 disabled:cursor-wait disabled:opacity-70 ${
                          activeSection === 'transparency'
                            && activeDocumentId === document.id
                            && activeId === 'home'
                            ? 'bg-[#7654A1] text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <AppIcon name="List" size={16} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">Document Overview</span>
                          {hasActiveSearch && document.publicationDate && (
                            <span className="block truncate text-[10px] opacity-75">
                              <Highlight
                                text={document.publicationDate}
                                query={normalizedSearchTerm}
                              />
                            </span>
                          )}
                        </span>
                        {documentSearch?.documentMatchCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700">
                            {documentSearch.documentMatchCount}
                          </span>
                        )}
                      </button>
                    )}

                    {(hasActiveSearch
                      ? documentSearch?.items || []
                      : document.units || []
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={Boolean(searchTerm.trim()) && !searchResultsAreCurrent}
                        onClick={() => {
                          onNavigateTransparencyUnit(document.id, item.id);
                          if (hasActiveSearch) {
                            rememberSearch(searchTerm);
                            setShowSummary(false);
                            setShowFullText(true);
                            if (hasOnlyQaMatches(item.matchBreakdown)) {
                              setShowQA?.(true);
                            }
                          }
                          setSidebarOpen(false);
                        }}
                        className={`w-full group text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 disabled:cursor-wait disabled:opacity-70 ${
                          activeSection === 'transparency'
                            && activeDocumentId === document.id
                            && activeId === item.id
                            ? 'bg-[#007A86] text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="shrink-0">
                          <AppIcon name={item.icon || 'FileText'} size={16} />
                        </span>
                        <span className="truncate flex-1">
                          <Highlight text={item.title} query={normalizedSearchTerm} />
                        </span>
                        {item.matchCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700">
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
        )}

        {/* Decision Trees section group */}
        {!hasActiveSearch && (
          <CollapsibleGroup
            label="Decision Trees"
            icon="GitBranch"
            expanded={expandedGroups.has('section-trees')}
            onToggle={() => toggleGroup('section-trees')}
            className="space-y-2"
          >
            <button
              onClick={() => {
                onNavigateTrees();
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
        {!hasActiveSearch && recentHistory && recentHistory.length > 0 && (
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
                    if (h.section === 'transparency' && h.documentId) {
                      onNavigateTransparencyUnit(h.documentId, h.id);
                    } else {
                      onNavigateChapter(h.id);
                    }
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
