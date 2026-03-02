import React from 'react';
import { AppIcon } from './AppIcons';
import { Logo } from './Logo';

export const Header = ({
  activeId,
  setActiveId,
  setSidebarOpen,
  showSummary,
  setShowSummary,
  showFullText,
  setShowFullText,
  showQA,
  setShowQA,
  readerOpen,
  setReaderOpen,
  readerSize,
  setReaderSize,
  readerLine,
  setReaderLine,
  readerSpace,
  setReaderSpace
}) => {
  return (
    <header className="h-20 flex-none border-b border-gray-200 flex items-center justify-between px-2 sm:px-4 md:px-8 bg-white/95 backdrop-blur-sm z-30 shadow-sm relative">
      <div className="flex items-center gap-1 sm:gap-3 z-10">
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden p-1.5 sm:p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          <AppIcon name="Menu" size={24} />
        </button>

        <button
          onClick={() => setActiveId('home')}
          className={`hover:opacity-80 transition-opacity items-center gap-2 ${activeId !== 'home' ? 'hidden md:flex' : 'flex'}`}
        >
          <Logo size={60} className="shrink-0" />
        </button>
      </div>

      {activeId !== 'home' && (
        <div className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 flex bg-slate-100 p-0.5 md:p-2 text-[10px] md:text-xs rounded-lg border border-slate-200 gap-0.5 md:gap-2 shrink-0 items-center h-8 md:h-auto animate-slide-in-right z-10">
          <button
            onClick={() => setShowSummary(!showSummary)}
            className={`px-2 py-1 md:px-3 md:py-1.5 text-xs font-bold rounded-md md:rounded-lg transition-all flex items-center gap-1 md:gap-2 ${
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
            className={`px-2 py-1 md:px-3 md:py-1.5 text-xs font-bold rounded-md md:rounded-lg transition-all flex items-center gap-1 md:gap-2 ${
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
            className={`px-2 py-1 md:px-3 md:py-1.5 text-xs font-bold rounded-md md:rounded-lg transition-all flex items-center gap-1 md:gap-2 ${
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
              className="px-2 py-1 md:px-3 md:py-1.5 text-xs font-bold rounded-md md:rounded-lg transition-all flex items-center gap-1 md:gap-2 bg-white text-gray-700 shadow-sm"
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
  );
};
