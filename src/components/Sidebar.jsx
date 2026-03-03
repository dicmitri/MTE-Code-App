import React from 'react';
import { AppIcon } from './AppIcons';
import { Highlight } from './Highlight';
import { FULL_CODE_DATA, updateSearchStatus } from '../data/codeData';

export const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  searchTerm,
  setSearchTerm,
  debouncedSearch,
  activeId,
  setActiveId,
  setShowSummary,
  setShowFullText,
  installPromptEvent,
  isIos,
  setShowIosPrompt,
  handleInstallClick
}) => {
  return (
    <aside
      className={`
        w-80 bg-white border-r border-gray-200 flex flex-col h-full shrink-0 shadow-sm z-40
        fixed inset-y-0 left-0 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:sticky md:top-0
      `}
    >
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

        <div className="relative mb-6 px-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <AppIcon name="Search" size={16} />
          </div>
          <input
            id="searchTerm"
            type="text"
            placeholder="Search..."
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

        <button
          onClick={() => {
            setActiveId('home');
            setSidebarOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold mb-6 transition-all border ${
            activeId === 'home'
              ? 'bg-gray-100 border-gray-200 text-gray-900'
              : 'text-gray-500 border-transparent hover:bg-gray-50'
          }`}
        >
          <AppIcon name="Home" size={18} /> Home
        </button>
      </div>

      <nav
        className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
        }}
      >
        {[
          { id: 'intro', label: 'Introductory Chapters' },
          { id: 'part1', label: 'Part 1: The Code' },
          { id: 'part2', label: 'Part 2: Complaint Handling' },
          { id: 'part3', label: 'Part 3: Annexes & Glossary' },
          { id: 'website', label: 'Website' },
        ].map((section) => {
          const items = FULL_CODE_DATA.filter((ch) => ch.part === section.id)
            .map((ch) => {
              if (!debouncedSearch) return { ...ch, matchCount: 0 };

              const term = debouncedSearch.toLowerCase().trim();
              const count = (txt) =>
                (txt || '').toString().toLowerCase().split(term).length - 1;

              let matches = count(ch.title) + count(ch.summary);

              (ch.sections || []).forEach((s) => {
                matches += count(s.title) + count(s.legalText);
                (s.qas || []).forEach(
                  (q) => (matches += count(q.q) + count(q.a))
                );
              });

              return { ...ch, matchCount: matches };
            })
            .filter((ch) => !debouncedSearch || ch.matchCount > 0);

          if (debouncedSearch) {
            const trimmed = debouncedSearch.trim();
            const sectionTotal = items.reduce(
              (acc, curr) => acc + (curr.matchCount || 0),
              0
            );

            if (items.length === 0 || sectionTotal === 0) {
              updateSearchStatus(
                `No results found for “${trimmed}” in ${section.label}`
              );
              return null;
            } else {
              updateSearchStatus(
                `${sectionTotal} matches for “${trimmed}” in ${section.label}`
              );
            }
          } else {
            updateSearchStatus('Search empty');
          }

          return (
            <div key={section.id} className="space-y-2">
              <div className="flex justify-between items-center px-4 mb-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {section.label}
                </div>
                {debouncedSearch && items.length > 0 && (
                  <span className="text-[10px] font-bold bg-purple-50 text-[#7654A1] px-2 py-0.5 rounded-full">
                    {items.reduce((acc, curr) => acc + curr.matchCount, 0)}{' '}
                    matches
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveId(item.id);
                      if (debouncedSearch.trim() !== '') {
                        setShowSummary(true);
                        setShowFullText(true);
                      }
                      setSidebarOpen(false);
                      window.scrollTo(0, 0);
                    }}
                    className={`w-full group text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ${
                      activeId === item.id
                        ? 'bg-[#7654A1] text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`shrink-0 ${
                        activeId === item.id
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
                          activeId === item.id
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
            </div>
          );
        })}

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
