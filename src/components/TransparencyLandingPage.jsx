import React from 'react';
import { AppIcon } from './AppIcons';

export const TransparencyLandingPage = ({ documents, onOpenDocument }) => (
  <main className="flex-1 overflow-y-auto bg-slate-50/60 custom-scrollbar h-full">
    <div className="animate-fade-in py-12 px-4 max-w-5xl mx-auto pb-24">
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 text-[#0099A7] text-xs font-bold uppercase tracking-[0.18em] mb-4">
          <AppIcon name="Eye" size={18} />
          Transparency
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
          Transparency
        </h1>
        <p className="max-w-2xl text-lg text-slate-600 leading-relaxed">
          Access MedTech Europe transparency guidance and related disclosure resources.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {documents.map((document) => (
          <button
            key={document.id}
            type="button"
            onClick={() => onOpenDocument(document.id)}
            className="group text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-7 transition-all hover:border-[#0099A7] hover:shadow-md active:scale-[0.99]"
          >
            <span className="flex items-start justify-between gap-4">
              <span className="p-3 rounded-xl bg-cyan-50 text-[#0099A7] transition-colors group-hover:bg-[#0099A7] group-hover:text-white">
                <AppIcon name={document.icon || 'FileText'} size={30} />
              </span>
              {document.publicationDate && (
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {document.publicationDate}
                </span>
              )}
            </span>
            <span className="block mt-6 text-2xl font-bold text-slate-900">
              {document.title}
            </span>
            {document.description && (
              <span className="block mt-3 text-sm leading-relaxed text-slate-600">
                {document.description}
              </span>
            )}
            <span className="mt-7 flex items-center text-xs font-bold uppercase tracking-wider text-[#7654A1]">
              Open document
              <AppIcon
                name="ChevronRight"
                size={14}
                className="ml-1 transition-transform group-hover:translate-x-1"
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  </main>
);

export const TransparencyDocumentLandingPage = ({
  document,
  units,
  onSelectUnit,
  sourcePdfUrl,
  onBack,
}) => (
  <div className="animate-fade-in py-10 px-4 max-w-6xl mx-auto pb-24">
    <div className="mb-12">
      <button
        type="button"
        onClick={onBack}
        className="no-print inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#0099A7] hover:text-[#7654A1] mb-6"
      >
        <AppIcon name="ChevronLeft" size={14} />
        Transparency
      </button>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0099A7] mb-3">
            {document.eyebrow || 'MedTech Europe Code of Ethical Business Practice'}
          </p>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {document.title}
          </h1>
          <p className="mt-3 text-lg text-slate-500">{document.publicationDate}</p>
        </div>
        {sourcePdfUrl && (
          <a
            href={sourcePdfUrl}
            target="_blank"
            rel="noreferrer"
            className="no-print inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-[#7654A1] hover:border-[#7654A1] transition-colors"
          >
            <AppIcon name="ExternalLink" size={16} />
            View original PDF
          </a>
        )}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {units.map((unit) => (
        <button
          key={unit.id}
          type="button"
          onClick={() => onSelectUnit(unit.id)}
          className="chapter-card bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-left transition-all flex flex-col h-full active:scale-95 group"
        >
          <span className="p-3 bg-cyan-50 rounded-xl w-fit mb-4 text-[#0099A7] group-hover:bg-[#0099A7] group-hover:text-white transition-colors">
            <AppIcon name={unit.icon || 'FileText'} size={26} />
          </span>
          <span className="text-lg font-bold text-gray-900 mb-2">{unit.title}</span>
          {unit.sourcePages?.length > 0 && (
            <span className="text-xs text-slate-400">
              PDF {unit.sourcePages.length === 1 ? 'page' : 'pages'} {unit.sourcePages.join(', ')}
            </span>
          )}
          <span className="mt-6 flex items-center text-xs font-bold text-[#7654A1] uppercase tracking-wider">
            Read
            <AppIcon
              name="ChevronRight"
              size={14}
              className="ml-1 transition-transform group-hover:translate-x-1"
            />
          </span>
        </button>
      ))}
    </div>
  </div>
);
