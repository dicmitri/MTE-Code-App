import React, { useState, useEffect, useRef } from 'react';
import { FULL_CODE_DATA, updateSearchStatus } from './data/codeData';
import { DefinitionPopup } from './components/DefinitionPopup';
import { extractGlossaryMap, generateSectionId } from './utils/textUtils';
import { useDebounce } from './hooks/useDebounce';
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
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        e.preventDefault();
        document.getElementById('searchTerm')?.focus();
      }
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

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

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

    const targetChapter = FULL_CODE_DATA.find((ch) => {
      if (ch.id === hash) return true;
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
  }, []);

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
        />
      </div>
    </div>
  );
};

export default App;
