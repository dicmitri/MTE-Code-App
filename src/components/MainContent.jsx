import React from 'react';
import { AppIcon } from './AppIcons';
import { Highlight } from './Highlight';
import { LandingPage } from './LandingPage';
import { FullTextSection } from './FullTextSection';

export const MainContent = ({
  activeId,
  activeContent,
  handleChapterChange,
  setActiveId,
  showSummary,
  showFullText,
  showQA,
  debouncedSearch,
  glossaryMap,
  handleTermClick,
  scrollRef,
  showIosPrompt,
  setShowIosPrompt
}) => {
  return (
    <main
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-white custom-scrollbar h-full"
    >
      {activeId === 'home' ? (
        <LandingPage onSelectChapter={handleChapterChange} />
      ) : (
        <div className="p-4 md:p-10 max-w-6xl mx-auto pb-24">
          <div className="mb-6 flex items-center text-xs font-bold text-[#0099A7] uppercase tracking-widest gap-2">
            <button
              onClick={() => setActiveId('home')}
              className="hover:text-purple-700"
            >
              Home
            </button>
            <AppIcon name="ChevronRight" size={12} />
            <span className="text-gray-800">{activeContent?.title}</span>
          </div>

          {showSummary && (
            <div className="animate-fade-in mb-10">
              <div className="p-8 bg-purple-50 rounded-2xl border border-purple-100 shadow-sm">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
                  Summary
                </h1>
                <div className="text-lg text-gray-700 font-light reader-content">
                  <Highlight
                    text={activeContent?.summary}
                    query={debouncedSearch}
                  />
                </div>
              </div>
            </div>
          )}

          {showFullText && (
            <div className="animate-fade-in border-t border-gray-100 pt-10">
              <div className="flex items-center gap-2 mb-8">
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  {isNaN(activeContent?.icon)
                    ? activeContent?.title
                    : `Chapter ${activeContent?.icon}: ${activeContent?.title}`}
                </h2>
              </div>

              {activeContent?.sections?.map((section) => {
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
  );
};
