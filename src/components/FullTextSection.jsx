import React, { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { highlightSearchTerm, processTextWithTerms } from '../utils/textUtils';
import { Highlight } from './Highlight';
import { AppIcon } from './AppIcons';
import { getTreesBySection } from '../data/treeData';

export const FullTextSection = ({ id, section, showQA, query, glossaryMap, onTermClick, bookmarksControls, chapterPrefix, searchFilters, onNavigateTree }) => {
    const processedHtml = useMemo(() => {
        let html = section.legalText;
        if (query && searchFilters?.text) return highlightSearchTerm(html, query);
        if (glossaryMap && !id.includes('glossary')) return processTextWithTerms(html, glossaryMap);
        return html;
    }, [section.legalText, query, glossaryMap, id, searchFilters?.text]);

    const sanitizedHtml = useMemo(() => DOMPurify.sanitize(processedHtml), [processedHtml]);

    const [copyMsg, setCopyMsg] = useState(null);

    const copyLink = (sectionId) => {
        const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopyMsg("Link copied to clipboard!");
            setTimeout(() => setCopyMsg(null), 2000);
        });
    };

    const copyCitation = (sectionId, sectionTitle) => {
        const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
        const prefix = chapterPrefix ? chapterPrefix : '';
        const citation = `MedTech Europe Code of Ethical Business Practice, ${prefix}${sectionTitle}. Accessed via: ${url}`;
        navigator.clipboard.writeText(citation).then(() => {
            setCopyMsg("Citation copied to clipboard!");
            setTimeout(() => setCopyMsg(null), 2000);
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

    // Find related decision trees for this specific section only (no chapter fallback)
    const relatedTrees = useMemo(() => {
        return getTreesBySection(id);
    }, [id]);

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
                            onClick={(e) => { e.stopPropagation(); copyCitation(id, section.title); }}
                            className="text-sm text-[#0099A7] hover:text-[#007A86] border border-transparent hover:border-cyan-100 rounded px-2 py-1"
                            title="Copy formal citation for this section"
                        >
                            Cite
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); copyLink(id); }}
                            className="text-sm text-purple-600 hover:text-purple-800 border border-transparent hover:border-purple-100 rounded px-2 py-1"
                            title="Copy raw link to this section"
                        >
                            Link
                        </button>
                    </div>
                </div>
            )}
            <div className="prose prose-slate max-w-none text-gray-800 leading-relaxed reader-content" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
            {onNavigateTree && relatedTrees.length > 0 && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 print:hidden">
                    <span className="text-amber-600 shrink-0 mt-0.5">
                        <AppIcon name="GitBranch" size={18} />
                    </span>
                    <div className="flex-1">
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Related Decision Tree{relatedTrees.length > 1 ? 's' : ''}</p>
                        <div className="space-y-1">
                            {relatedTrees.map(tree => (
                                <button
                                    key={tree.id}
                                    onClick={(e) => { e.stopPropagation(); onNavigateTree(tree.id); }}
                                    className="text-sm text-amber-700 hover:text-amber-900 font-medium hover:underline flex items-center gap-1 transition-colors"
                                >
                                    {tree.title}
                                    <AppIcon name="ChevronRight" size={12} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {copyMsg && (
                <div className="fixed bottom-5 right-5 bg-[#7654A1] text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity duration-300 print:hidden">
                    {copyMsg}
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
