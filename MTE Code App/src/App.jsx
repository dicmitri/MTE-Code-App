import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FULL_CODE_DATA, updateSearchStatus } from './data/codeData';
import { AppIcon } from './components/AppIcons';
import { Highlight } from './components/Highlight';
import { Logo } from './components/Logo';
import { LandingPage } from './components/LandingPage';
import { DefinitionPopup } from './components/DefinitionPopup';
import { FullTextSection } from './components/FullTextSection';
import { extractGlossaryMap, generateSectionId } from './utils/textUtils';
import { useDebounce } from './hooks/useDebounce';

// --- OPTIMIZATION START ---
if (typeof FULL_CODE_DATA !== 'undefined') {
    FULL_CODE_DATA.forEach(chapter => {
        chapter.sections.forEach((section, idx) => {
            section.computedId = generateSectionId(chapter.id, section.title, idx);
        });
    });
}
// --- OPTIMIZATION END ---

const App = () => {
  // 1. Initialize all states including the 3 toggles
  const [activeId, setActiveId] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [showFullText, setShowFullText] = useState(true);
  const [showQA, setShowQA] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerSize, setReaderSize] = useState('1rem');
  const [readerLine, setReaderLine] = useState('1.65');
  const [readerSpace, setReaderSpace] = useState('0.75rem');
  const [glossaryMap, setGlossaryMap] = useState({});
  const [activeDefinition, setActiveDefinition] = useState(null);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isInStandaloneMode =
      'standalone' in window.navigator && window.navigator.standalone;

    if (isIosDevice && !isInStandaloneMode) {
      setIsIos(true);
    }
  }, []);
  useEffect(() => {
    const handleKeydown = (e) => {
      // Focus search on '/' press, but not if already in an input
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        e.preventDefault();
        document.getElementById('searchTerm')?.focus();
      }
      // Clear search on 'Escape' press
      if (e.key === 'Escape') {
        const searchInput = document.getElementById('searchTerm');
        if (searchInput && searchInput === document.activeElement) {
          setSearchTerm('');
          updateSearchStatus('Search cleared');
          searchInput.blur();
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [setSearchTerm]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) {
      return;
    }
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setInstallPromptEvent(null);
  };

  // 2. Initialize the scroll reference
  const scrollRef = useRef(null);

  useEffect(() => {
    const map = extractGlossaryMap(FULL_CODE_DATA);
    setGlossaryMap(map);
  }, []);
  const handleTermClick = (termKey) => {
    const definition = glossaryMap[termKey];
    if (definition) {
      const displayTitle = termKey.charAt(0).toUpperCase() + termKey.slice(1);
      setActiveDefinition({ term: displayTitle, definition });
    }
  };
  // --- NEW: Deep Link "Router" Logic ---
  // This runs ONCE on load to check if we need to open a specific chapter
  // --- NEW: Deep Link "Router" Logic (Updated) ---
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    // Internal helper to match the logic of generateSectionId
    const getHashId = (chId, title, idx) => {
      let slug;
      if (title) {
        slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
      } else {
        slug = `section-${idx}`;
      }
      return `${chId}-${slug}`;
    };

    // Find which chapter contains this section ID
    const targetChapter = FULL_CODE_DATA.find((ch) => {
      // A. Check if the link points to the Chapter itself
      if (ch.id === hash) return true;

      // B. Check if the link points to a Section inside the chapter
      // Note: We now pass the index (i) to our helper
      return (
        ch.sections &&
        ch.sections.some((s, i) => getHashId(ch.id, s.title, i) === hash)
      );
    });

    if (targetChapter) {
      setActiveId(targetChapter.id);
      setShowSummary(true);
      setShowFullText(true);

      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          element.classList.add(
            'bg-yellow-50',
            'transition-colors',
            'duration-1000'
          );
          setTimeout(() => element.classList.remove('bg-yellow-50'), 2000);
        }
      }, 500);
    }
  }, []); // Empty brackets mean this runs only once when the app starts

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--reader-font-size', readerSize);
    root.style.setProperty('--reader-line-height', readerLine);
    root.style.setProperty('--reader-paragraph-spacing', readerSpace);
  }, [readerSize, readerLine, readerSpace]);

  // 2. Initialize the scroll reference (missing in your current file)

  const activeContent = FULL_CODE_DATA.find((c) => c.id === activeId);

  // 3. Updated handler (removed the broken setMode call)
  const handleChapterChange = (id) => {
    setActiveId(id);
    setSidebarOpen(false);
    // Auto-reveal: If there is a search active, show both Summary and Full Text
    if (searchTerm && searchTerm.trim() !== '') {
      setShowSummary(true);
      setShowFullText(true);
    }

    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  };
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      <DefinitionPopup
        term={activeDefinition?.term}
        definition={activeDefinition?.definition}
        onClose={() => setActiveDefinition(null)}
      />
      {showIosPrompt && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowIosPrompt(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowIosPrompt(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
            >
              <AppIcon name="X" size={20} />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Install on iOS
            </h3>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              To install this app on your iPhone or iPad:
            </p>
            <ol className="list-decimal pl-5 space-y-3 text-sm text-gray-700 mb-6">
              <li>
                Tap the <strong>Share</strong> icon (the square with an arrow
                pointing up) at the bottom of your Safari screen.
              </li>
              <li>
                Scroll down the list and tap{' '}
                <strong>"Add to Home Screen"</strong>.
              </li>
            </ol>
            <button
              onClick={() => setShowIosPrompt(false)}
              className="w-full py-2 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <header className="h-16 flex-none border-b border-gray-200 flex items-center justify-between px-4 md:px-8 bg-white/95 backdrop-blur-sm z-30 shadow-sm relative">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <AppIcon name="Menu" size={24} />
          </button>

          {/* Home button with Logo */}

          <button
            onClick={() => setActiveId('home')}
            className="hover:opacity-80 transition-opacity flex items-center gap-2"
          >
            <Logo size={32} className="shrink-0" />
          </button>
        </div>

        {activeId !== 'home' && (
          <div className="flex bg-slate-100 p-0 md:p-2 text-[10px] md:text-xs rounded-lg border border-slate-200 gap-0 md:gap-2 shrink-0 items-start h-8 md:h-auto">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                showSummary
                  ? 'bg-white text-[#7654A1] shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Toggle Summary"
            >
              <AppIcon name="List" size={16} />
              <span className="hidden md:inline">Summary</span>
            </button>
            <button
              onClick={() => setShowFullText(!showFullText)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                showFullText
                  ? 'bg-white text-[#7654A1] shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Toggle Full Text"
            >
              <AppIcon name="FileText" size={16} />
              <span className="hidden md:inline">Full Text</span>
            </button>
            <button
              onClick={() => setShowQA(!showQA)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                showQA
                  ? 'bg-white text-[#7654A1] shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Toggle Q&A"
            >
              <AppIcon name="Eye" size={16} />
              <span className="hidden md:inline">Q&A</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setReaderOpen((v) => !v)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 bg-white text-gray-700 shadow-sm"
                title="Reading settings"
                aria-expanded={readerOpen}
              >
                Aa
              </button>

              {readerOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-3 animate-fade-in z-50">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Font size
                  </div>
                  <div className="flex gap-2 mb-3">
                    {[
                      { label: 'A-', value: '0.95rem' },
                      { label: 'A', value: '1rem' },
                      { label: 'A+', value: '1.125rem' },
                      { label: 'A++', value: '1.25rem' },
                    ].map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setReaderSize(s.value)}
                        className={`px-2 py-1 rounded border text-xs ${
                          readerSize === s.value
                            ? 'text-teal-700'
                            : 'text-gray-700'
                        }`}
                        style={{ borderColor: 'var(--color-teal)' }}
                        aria-label={`Set font size ${s.label}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Line spacing
                  </div>
                  <div className="flex gap-2 mb-3">
                    {[
                      { label: 'Tight', value: '1.50' },
                      { label: 'Normal', value: '1.65' },
                      { label: 'Comfort', value: '1.80' },
                    ].map((l) => (
                      <button
                        key={l.value}
                        onClick={() => setReaderLine(l.value)}
                        className={`px-2 py-1 rounded border text-xs ${
                          readerLine === l.value
                            ? 'text-purple-700'
                            : 'text-gray-700'
                        }`}
                        style={{ borderColor: 'var(--color-purple)' }}
                        aria-label={`Set line spacing ${l.label}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Paragraph spacing
                  </div>
                  <div className="flex gap-2">
                    {[
                      { label: '–', value: '0.5rem' },
                      { label: '•', value: '0.75rem' },
                      { label: '+', value: '1rem' },
                    ].map((sp) => (
                      <button
                        key={sp.value}
                        onClick={() => setReaderSpace(sp.value)}
                        className={`px-2 py-1 rounded border text-xs ${
                          readerSpace === sp.value
                            ? 'text-gray-900'
                            : 'text-gray-700'
                        }`}
                        style={{ borderColor: '#cbd5e1' }}
                        aria-label={`Paragraph spacing ${sp.label}`}
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside
          className={`
                        w-80 bg-white border-r border-gray-200 flex flex-col h-screen shrink-0 shadow-sm z-40
                        fixed inset-y-0 left-0 transition-transform duration-300
                        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                        md:translate-x-0 md:sticky md:top-0
                    `}
        >
          <div className="p-8 pr-12 pt-10 pb-4 relative">
            {/* Mobile Only: Close Menu Button */}
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

            {/* Search Input Box */}
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
                    announce('Search cleared');
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
                setSidebarOpen(false); // Close menu on mobile
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

          {/* Navigation Area */}
          <nav
            className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
            }}
          >
            {[
              { id: 'intro', label: 'Introductory Chapters' },
              { id: 'part1', label: 'Part 1: The Code' },
              { id: 'part2', label: 'Part 2: Complaint Handling' },
              { id: 'part3', label: 'Part 3: Annexes & Glossary' },
              { id: 'website', label: 'Website' },
            ].map((section) => {
              // Deep Search Logic
              const items = FULL_CODE_DATA.filter(
                (ch) => ch.part === section.id
              )
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
                  return null; // <-- keep this to avoid rendering empty sections
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
                          // Auto-Reveal Logic
                          if (debouncedSearch.trim() !== '') {
                            setShowSummary(true);
                            setShowFullText(true);
                          }
                          setSidebarOpen(false); // Close menu on mobile
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
                    {section.id === 'website' &&
                      (installPromptEvent || isIos) && (
                        <button
                          onClick={(e) => {
                            if (isIos) {
                              setShowIosPrompt(true);
                            } else if (installPromptEvent) {
                              handleInstallClick(e);
                            }
                          }}
                          className="flex items-center w-full px-3 py-2 mt-2 text-sm font-medium rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors"
                        >
                          <span className="truncate flex-1 font-bold text-center">
                            {isIos ? 'Install on iOS' : 'Install TheCodeApp'}
                          </span>
                        </button>
                      )}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-white custom-scrollbar h-full"
        >
          {activeId === 'home' ? (
            <LandingPage onSelectChapter={handleChapterChange} />
          ) : (
            <div className="p-4 md:p-10 max-w-6xl mx-auto pb-24">
              {/* Breadcrumb */}
              <div className="mb-6 flex items-center text-xs font-bold text-[#0099A7] uppercase tracking-widest gap-2">
                <button
                  onClick={() => setActiveId('home')}
                  className="hover:text-purple-700"
                >
                  Home
                </button>
                <AppIcon name="ChevronRight" size={12} />
                <span className="text-gray-800">{activeContent.title}</span>
              </div>

              {/* 1. Toggleable Summary Section */}
              {showSummary && (
                <div className="animate-fade-in mb-10">
                  <div className="p-8 bg-purple-50 rounded-2xl border border-purple-100 shadow-sm">
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
                      Summary
                    </h1>
                    <div className="text-lg text-gray-700 font-light reader-content">
                      <Highlight
                        text={activeContent.summary}
                        query={debouncedSearch}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Toggleable Full Text & Q&A Sections */}
              {showFullText && (
                <div className="animate-fade-in border-t border-gray-100 pt-10">
                  <div className="flex items-center gap-2 mb-8">
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                      {isNaN(activeContent.icon)
                        ? activeContent.title
                        : `Chapter ${activeContent.icon}: ${activeContent.title}`}
                    </h2>
                  </div>

                  {activeContent.sections.map((section, idx) => {
                    return (
                      <FullTextSection
                        key={section.computedId}
                        id={section.computedId}
                        section={section}
                        showQA={showQA}
                        query={debouncedSearch}
                        glossaryMap={glossaryMap}
                        onTermClick={handleTermClick}
                      />
                    );
                  })}
                </div>
              )}

              {!showSummary && !showFullText && (
                <div className="p-20 text-center text-gray-300 italic border-2 border-dashed border-gray-100 rounded-3xl">
                  Select "Summary" or "Full Text" from the header to view
                  content.
                </div>
              )}
              {/* iOS Install Prompt Overlay */}
              {showIosPrompt && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4">
                  <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-2xl w-full max-w-sm text-center transform transition-all">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Install on iOS
                    </h3>
                    <p className="text-base text-gray-600 mb-6">
                      To install this app, tap the{' '}
                      <strong className="text-blue-500">Share</strong> icon at
                      the bottom of Safari, then scroll down and tap <br />
                      <strong>Add to Home Screen</strong>.
                    </p>
                    <button
                      onClick={() => setShowIosPrompt(false)}
                      className="w-full px-6 py-3 bg-gray-100 text-gray-800 rounded-lg text-base font-bold hover:bg-gray-200 transition-colors"
                    >
                      Got it, close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
export default App;
