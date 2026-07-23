import React, { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { highlightSearchTerm, processTextWithTerms } from '../utils/textUtils';
import { Highlight } from './Highlight';
import { AppIcon } from './AppIcons';
import { getTreesBySection } from '../data/treeData';
import { buildCodeSectionPath } from '../utils/routeUtils';

export const FullTextSection = ({ id, section, showQA, query, glossaryMap, onTermClick, bookmarksControls, chapterId, chapterPrefix, searchFilters, onNavigateTree }) => {
    const processedHtml = useMemo(() => {
        let html = section.legalText;
        if (query && searchFilters?.text) return highlightSearchTerm(html, query);
        if (glossaryMap && !id.includes('glossary')) return processTextWithTerms(html, glossaryMap);
        return html;
    }, [section.legalText, query, glossaryMap, id, searchFilters?.text]);

    const sanitizedHtml = useMemo(() => DOMPurify.sanitize(processedHtml), [processedHtml]);

    const [copyMsg, setCopyMsg] = useState(null);
    const [citeMenuOpen, setCiteMenuOpen] = useState(false);

    const getSectionUrl = (sectionId) => (
        new URL(buildCodeSectionPath(chapterId, sectionId), window.location.origin).href
    );

    const copyLink = (sectionId) => {
        const url = getSectionUrl(sectionId);
        navigator.clipboard.writeText(url).then(() => {
            setCopyMsg("Link copied to clipboard!");
            setTimeout(() => setCopyMsg(null), 2000);
        });
    };

    const copyCitationFormat = (format) => {
        const url = getSectionUrl(id);
        const prefix = chapterPrefix ? chapterPrefix : '';
        const fullTitle = `${prefix}${section.title}`;
        const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        let textToCopy = '';

        if (format === 'formal') {
            textToCopy = `MedTech Europe Code of Ethical Business Practice, ${fullTitle}. (Accessed ${today}). Available at: ${url}`;
        } else if (format === 'markdown') {
            textToCopy = `[${fullTitle} - MedTech Europe Code](${url})`;
        } else if (format === 'url') {
            textToCopy = url;
        }

        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopyMsg(
                format === 'formal' ? 'Formal citation copied!' :
                format === 'markdown' ? 'Markdown link copied!' : 'Direct link copied!'
            );
            setCiteMenuOpen(false);
            setTimeout(() => setCopyMsg(null), 2500);
        });
    };

    const copyPlainText = () => {
        const prefix = chapterPrefix ? chapterPrefix : '';
        const fullTitle = `${prefix}${section.title}`;
        
        const tempEl = document.createElement('div');
        tempEl.innerHTML = section.legalText;
        const plainLegalText = tempEl.textContent || tempEl.innerText || '';

        let textToCopy = `${fullTitle}\n\n${plainLegalText.trim()}`;

        if (section.qas && section.qas.length > 0) {
            textToCopy += `\n\nOfficial Q&A Guidance:\n`;
            section.qas.forEach(qa => {
                const tempQ = document.createElement('div');
                tempQ.innerHTML = qa.q;
                const tempA = document.createElement('div');
                tempA.innerHTML = qa.a;
                textToCopy += `\nQ: ${(tempQ.textContent || '').trim()}\nA: ${(tempA.textContent || '').trim()}\n`;
            });
        }

        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopyMsg("Plain text copied to clipboard!");
            setTimeout(() => setCopyMsg(null), 2500);
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
                    <h3 className="text-xl font-bold text-gray-800 flex items-center flex-wrap gap-2">
                        <Highlight text={section.title} query={searchFilters?.titles ? query : ''} />
                        {section.qas && section.qas.length > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const qaEl = document.getElementById(`qa-block-${id}`);
                                    if (qaEl) qaEl.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="text-xs font-semibold bg-purple-50 text-[#7654A1] hover:bg-purple-100 border border-purple-100/80 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                                title={`Jump to ${section.qas.length} official Q&A guidance note${section.qas.length > 1 ? 's' : ''}`}
                            >
                                <AppIcon name="HelpCircle" size={12} />
                                <span>{section.qas.length} Q&A{section.qas.length > 1 ? 's' : ''}</span>
                            </button>
                        )}
                    </h3>
                    <div className="flex gap-2 shrink-0 ml-4 print:hidden">
                        {bookmarksControls && (
                            <button
                                onClick={(e) => { e.stopPropagation(); bookmarksControls.toggleBookmark(id, (chapterPrefix || '') + section.title, chapterId); }}
                                className={`text-sm border rounded px-2 py-1 transition-colors ${isBookmarked ? 'bg-purple-100 text-purple-700 border-purple-200' : 'text-gray-500 hover:text-purple-600 border-transparent hover:border-purple-100'}`}
                                title={isBookmarked ? 'Remove bookmark' : 'Bookmark this section'}
                            >
                                {isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
                            </button>
                        )}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setCiteMenuOpen(!citeMenuOpen); }}
                                className="text-sm text-[#0099A7] hover:text-[#007A86] border border-transparent hover:border-cyan-100 rounded px-2 py-1 flex items-center gap-1 font-medium transition-colors"
                                title="Copy citation or reference link for this section"
                            >
                                <span>Cite</span>
                                <AppIcon name={citeMenuOpen ? "ChevronUp" : "ChevronDown"} size={12} />
                            </button>
                            {citeMenuOpen && (
                                <div 
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50 animate-fade-in text-left"
                                >
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">Copy Reference</div>
                                    <button
                                        onClick={() => copyCitationFormat('formal')}
                                        className="w-full text-left px-2.5 py-1.5 text-xs text-gray-700 hover:bg-cyan-50 hover:text-[#0099A7] rounded-lg transition-colors flex items-center justify-between group"
                                    >
                                        <div>
                                            <div className="font-semibold">Formal Citation</div>
                                            <div className="text-[10px] text-gray-400 group-hover:text-cyan-700">Includes date & full title</div>
                                        </div>
                                        <AppIcon name="Copy" size={14} className="text-gray-400 group-hover:text-[#0099A7]" />
                                    </button>
                                    <button
                                        onClick={() => copyCitationFormat('markdown')}
                                        className="w-full text-left px-2.5 py-1.5 text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors flex items-center justify-between group"
                                    >
                                        <div>
                                            <div className="font-semibold">Markdown Link</div>
                                            <div className="text-[10px] text-gray-400 group-hover:text-purple-600">[Title](URL) format</div>
                                        </div>
                                        <AppIcon name="Link" size={14} className="text-gray-400 group-hover:text-purple-600" />
                                    </button>
                                    <button
                                        onClick={() => copyCitationFormat('url')}
                                        className="w-full text-left px-2.5 py-1.5 text-xs text-gray-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors flex items-center justify-between group"
                                    >
                                        <div>
                                            <div className="font-semibold">Direct Link URL</div>
                                            <div className="text-[10px] text-gray-400">Raw web link</div>
                                        </div>
                                        <AppIcon name="ExternalLink" size={14} className="text-gray-400 group-hover:text-slate-700" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); copyLink(id); }}
                            className="text-sm text-purple-600 hover:text-purple-800 border border-transparent hover:border-purple-100 rounded px-2 py-1"
                            title="Copy raw link to this section"
                        >
                            Link
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); copyPlainText(); }}
                            className="text-sm text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200 rounded px-2 py-1 font-medium transition-colors"
                            title="Copy clean plain text of this section"
                        >
                            Copy Text
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
                <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-fade-in border border-slate-700/50 print:hidden">
                    <AppIcon name="Check" size={16} className="text-emerald-400 shrink-0" />
                    <span>{copyMsg}</span>
                </div>
            )}
            {showQA && section.qas && (
                <div id={`qa-block-${id}`} className="mt-4 space-y-4 scroll-mt-24">
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
