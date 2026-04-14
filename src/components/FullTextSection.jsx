import React, { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { highlightSearchTerm, processTextWithTerms } from '../utils/textUtils';
import { Highlight } from './Highlight';

export const FullTextSection = ({ id, section, showQA, query, glossaryMap, onTermClick, bookmarksControls, chapterPrefix, searchFilters }) => {
    const processedHtml = useMemo(() => {
        let html = section.legalText;
        if (query && searchFilters?.text) return highlightSearchTerm(html, query);
        if (glossaryMap && !id.includes('glossary')) return processTextWithTerms(html, glossaryMap);
        return html;
    }, [section.legalText, query, glossaryMap, id, searchFilters?.text]);

    const sanitizedHtml = useMemo(() => DOMPurify.sanitize(processedHtml), [processedHtml]);

    const [showCopyMsg, setShowCopyMsg] = useState(false);

    const copyLink = (sectionId) => {
        const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
        navigator.clipboard.writeText(url).then(() => {
            setShowCopyMsg(true);
            setTimeout(() => setShowCopyMsg(false), 2000);
        });
    };

    const handleClick = (e) => {
        const termNode = e.target.closest('.glossary-term');
        if (termNode) {
            e.stopPropagation(); 
            const termKey = termNode.getAttribute('data-term');
            onTermClick(termKey);
        }
    };

    const isBookmarked = bookmarksControls?.isBookmarked(id);

    return (
        <div id={id} className="mb-8 scroll-mt-24" onClick={handleClick}>
            {section.title && (
                <div className="group flex justify-between items-baseline mb-3 mt-6 print:hidden">
                    <h3 className="text-xl font-bold text-gray-800">
                        <Highlight text={section.title} query={searchFilters?.titles ? query : ''} />
                    </h3>
                    <div className="flex gap-2 shrink-0 ml-4 print:hidden">
                        {bookmarksControls && (
                            <button
                                onClick={(e) => { e.stopPropagation(); bookmarksControls.toggleBookmark(id, (chapterPrefix || '') + section.title, id.split('-')[0]); }}
                                className={`text-sm border rounded px-2 py-1 transition-colors ${isBookmarked ? 'bg-purple-100 text-purple-700 border-purple-200' : 'text-gray-500 hover:text-purple-600 border-transparent hover:border-purple-100'}`}
                                title={isBookmarked ? 'Remove bookmark' : 'Bookmark this section'}
                            >
                                {isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); copyLink(id); }}
                            className="text-sm text-purple-600 hover:text-blue-800 border border-transparent hover:border-blue-100 rounded px-2 py-1"
                            title="Copy link to this section"
                        >
                            Link
                        </button>
                    </div>
                </div>
            )}
            <div className="prose prose-slate max-w-none text-gray-800 leading-relaxed reader-content" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
            {showCopyMsg && (
                <div className="fixed bottom-5 right-5 bg-[#7654A1] text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity duration-300 print:hidden">
                    Link copied to clipboard!
                </div>
            )}
            {showQA && section.qas && (
                <div className="mt-4 space-y-4">
                    {section.qas.map((qa, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100 print:bg-transparent print:border-none print:p-0 print:my-4">
                            <p className="font-bold text-gray-900 mb-1 reader-content">
                                <Highlight text={qa.q} query={searchFilters?.qa ? query : ''} />
                            </p>
                            <div className="text-gray-700 prose prose-sm max-w-none reader-content" 
                                dangerouslySetInnerHTML={{ 
                                    __html: DOMPurify.sanitize('A: ' + (query && searchFilters?.qa ? highlightSearchTerm(qa.a, query) : qa.a)) 
                                }} 
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
