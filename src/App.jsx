import React, { useState, useEffect, useRef } from 'react';
import { FULL_CODE_DATA } from './data/codeData';
import { DefinitionPopup } from './components/DefinitionPopup';
import { extractGlossaryMap, generateSectionId } from './utils/textUtils';
import { useDebounce } from './hooks/useDebounce';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useHashRouting } from './hooks/useHashRouting';
import { useBookmarks } from './hooks/useBookmarks';
import { useRecentHistory } from './hooks/useRecentHistory';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { InstallPrompt } from './components/InstallPrompt';

if (typeof FULL_CODE_DATA !== 'undefined') {
  FULL_CODE_DATA.forEach(chapter => {
    chapter.sections.forEach((section, idx) => {
      section.computedId = generateSectionId(chapter.id, section.title, idx);
    });
  });
}

const App = () => {
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

  // Custom Hooks
  useKeyboardShortcuts(setSearchTerm);
  const { installPromptEvent, isIos, showIosPrompt, setShowIosPrompt, handleInstallClick } = usePWAInstall();
  useHashRouting(setActiveId, setShowSummary, setShowFullText);
  const { bookmarks, toggleBookmark, isBookmarked } = useBookmarks();
  const { history, addHistory } = useRecentHistory();

  const [searchFilters, setSearchFilters] = useState({
    titles: true,
    text: true,
    qa: true
  });

  const scrollRef = useRef(null);

  useEffect(() => {
    const map = extractGlossaryMap(FULL_CODE_DATA);
    setGlossaryMap(map);
  }, []);

  useEffect(() => {
    if (activeId !== 'home') {
      addHistory(activeId);
    }
  }, [activeId, addHistory]);

  const handleTermClick = (termKey) => {
    const definition = glossaryMap[termKey];
    if (definition) {
      const displayTitle = termKey.charAt(0).toUpperCase() + termKey.slice(1);
      setActiveDefinition({ term: displayTitle, definition });
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--reader-font-size', readerSize);
    root.style.setProperty('--reader-line-height', readerLine);
    root.style.setProperty('--reader-paragraph-spacing', readerSpace);
  }, [readerSize, readerLine, readerSpace]);

  const activeContent = FULL_CODE_DATA.find((c) => c.id === activeId);

  const handleChapterChange = (id) => {
    setActiveId(id);
    setSidebarOpen(false);
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
      <InstallPrompt show={showIosPrompt} onClose={() => setShowIosPrompt(false)} />

      <Header
        activeId={activeId}
        setActiveId={setActiveId}
        setSidebarOpen={setSidebarOpen}
        showSummary={showSummary}
        setShowSummary={setShowSummary}
        showFullText={showFullText}
        setShowFullText={setShowFullText}
        showQA={showQA}
        setShowQA={setShowQA}
        readerOpen={readerOpen}
        setReaderOpen={setReaderOpen}
        readerSize={readerSize}
        setReaderSize={setReaderSize}
        readerLine={readerLine}
        setReaderLine={setReaderLine}
        readerSpace={readerSpace}
        setReaderSpace={setReaderSpace}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          debouncedSearch={debouncedSearch}
          activeId={activeId}
          setActiveId={setActiveId}
          setShowSummary={setShowSummary}
          setShowFullText={setShowFullText}
          installPromptEvent={installPromptEvent}
          isIos={isIos}
          setShowIosPrompt={setShowIosPrompt}
          handleInstallClick={handleInstallClick}
          bookmarks={bookmarks}
          recentHistory={history}
          searchFilters={searchFilters}
          setSearchFilters={setSearchFilters}
        />

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        <MainContent
          activeId={activeId}
          activeContent={activeContent}
          handleChapterChange={handleChapterChange}
          setActiveId={setActiveId}
          showSummary={showSummary}
          showFullText={showFullText}
          showQA={showQA}
          debouncedSearch={debouncedSearch}
          glossaryMap={glossaryMap}
          handleTermClick={handleTermClick}
          scrollRef={scrollRef}
          showIosPrompt={showIosPrompt}
          setShowIosPrompt={setShowIosPrompt}
          bookmarksControls={{ toggleBookmark, isBookmarked }}
          searchFilters={searchFilters}
        />
      </div>
    </div>
  );
};

export default App;

