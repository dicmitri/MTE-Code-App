import React from 'react';
import DOMPurify from 'dompurify';
import { AppIcon } from './AppIcons';
import { Highlight } from './Highlight';
import { LandingPage } from './LandingPage';
import { FullTextSection } from './FullTextSection';
import { TableOfContents } from './TableOfContents';
import { highlightSearchTerm } from '../utils/textUtils';
import { FULL_CODE_DATA } from '../data/codeData';

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
  setShowIosPrompt,
  bookmarksControls,
  searchFilters,
  onNavigateTree
}) => {
  const currentIndex = FULL_CODE_DATA.findIndex(c => c.id === activeId);
  const prevChapter = currentIndex > 0 ? FULL_CODE_DATA[currentIndex - 1] : null;
  const nextChapter = currentIndex !== -1 && currentIndex < FULL_CODE_DATA.length - 1 ? FULL_CODE_DATA[currentIndex + 1] : null;

  return (
    <main
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-white custom-scrollbar h-full"
    >
      {activeId === 'home' ? (
        <LandingPage onSelectChapter={handleChapterChange} />
      ) : (
        <div className="flex flex-col xl:flex-row max-w-[95rem] mx-auto pb-24 pt-4 md:pt-6">
          <div className="flex-1 min-w-0 px-4 md:px-10 max-w-5xl mx-auto w-full">
            <div id="summary-top" className="mb-6 flex items-center text-xs font-bold text-[#0099A7] uppercase tracking-widest gap-2 scroll-mt-24">
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
                  <div
                    className="text-lg text-gray-700 font-light reader-content summary-content"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        searchFilters?.text && debouncedSearch
                          ? highlightSearchTerm(activeContent?.summary || '', debouncedSearch)
                          : activeContent?.summary || ''
                      )
                    }}
                  />
                </div>
              </div>
            )}

            {showFullText && (
              <div className="animate-fade-in border-t border-gray-100 pt-10">
                <div className="flex items-center gap-2 mb-8">
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                    <Highlight
                      text={isNaN(activeContent?.icon) ? activeContent?.title : `Chapter ${activeContent?.icon}: ${activeContent?.title}`}
                      query={searchFilters?.titles ? debouncedSearch : ''}
                    />
                  </h2>
                </div>

                {activeContent?.sections?.map((section) => {
                  const chapterPrefix = isNaN(activeContent?.icon) ? '' : `Ch ${activeContent?.icon} - `;
                  return (
                    <FullTextSection
                      key={section.computedId}
                      id={section.computedId}
                      section={section}
                      showQA={showQA}
                      query={debouncedSearch}
                      searchFilters={searchFilters}
                      glossaryMap={glossaryMap}
                      onTermClick={handleTermClick}
                      bookmarksControls={bookmarksControls}
                      chapterPrefix={chapterPrefix}
                      onNavigateTree={onNavigateTree}
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

            {(showSummary || showFullText) && (
              <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-stretch justify-between gap-4 print:hidden">
                {prevChapter ? (
                  <button
                    onClick={() => handleChapterChange(prevChapter.id)}
                    className="flex items-center gap-3 text-left w-full sm:w-1/2 p-4 rounded-xl border border-gray-200 hover:border-[#7654A1] hover:bg-purple-50 transition-all group"
                  >
                    <div className="shrink-0 text-gray-400 group-hover:text-[#7654A1]">
                      <AppIcon name="ChevronLeft" size={24} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Previous</div>
                      <div className="font-bold text-gray-800 text-sm line-clamp-2">{prevChapter.title}</div>
                    </div>
                  </button>
                ) : <div className="hidden sm:block sm:w-1/2"></div>}

                {nextChapter ? (
                  <button
                    onClick={() => handleChapterChange(nextChapter.id)}
                    className="flex items-center justify-end gap-3 text-right w-full sm:w-1/2 p-4 rounded-xl border border-gray-200 hover:border-[#7654A1] hover:bg-purple-50 transition-all group"
                  >
                    <div>
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Next</div>
                      <div className="font-bold text-gray-800 text-sm line-clamp-2">{nextChapter.title}</div>
                    </div>
                    <div className="shrink-0 text-gray-400 group-hover:text-[#7654A1]">
                      <AppIcon name="ChevronRight" size={24} />
                    </div>
                  </button>
                ) : <div className="hidden sm:block sm:w-1/2"></div>}
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

          {showFullText && activeContent?.sections?.length > 0 && (
            <div className="hidden xl:block w-72 shrink-0 pr-8 pl-4 pt-10">
              <div className="sticky top-10">
                <TableOfContents sections={activeContent.sections} showSummary={showSummary} />
              </div>
            </div>
          )}

        </div>
      )}
    </main>
  );
};
