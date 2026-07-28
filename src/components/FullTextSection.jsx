import React, { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { processReaderHtml } from '../utils/textUtils';
import { copyTextToClipboard } from '../utils/clipboardUtils';
import { Highlight } from './Highlight';
import { AppIcon } from './AppIcons';
import { getTreesBySection } from '../data/treeData';
import { buildCodeSectionPath } from '../utils/routeUtils';
import { resolveResourceLinks } from '../utils/resourceUtils';

const EMPTY_RESOURCE_LINKS = Object.freeze({});

export const FullTextSection = ({
    id,
    section,
    showQA,
    query,
    glossaryMap,
    onTermClick,
    bookmarksControls,
    bookmarkSection = 'code',
    bookmarkDocumentId = null,
    chapterId,
    chapterPrefix,
    fallbackTitle = '',
    searchFilters,
    buildSectionPath = buildCodeSectionPath,
    citationSourceTitle = 'MedTech Europe Code of Ethical Business Practice',
    citationMarkdownLabel = 'MedTech Europe Code',
    resourceLinks = EMPTY_RESOURCE_LINKS,
    supplement = null,
    printAllQA = false,
    onNavigateTree
}) => {
    const processedHtml = useMemo(() => {
        const html = resolveResourceLinks(section.legalText, resourceLinks);
        return processReaderHtml(html, {
            query,
            highlight: searchFilters?.text,
            glossaryMap,
            enableGlossary: !id.includes('glossary'),
        });
    }, [section.legalText, query, glossaryMap, id, searchFilters?.text, resourceLinks]);

    const sanitizedHtml = useMemo(() => DOMPurify.sanitize(processedHtml), [processedHtml]);
    const processedQas = useMemo(() => (
        (section.qas || []).map((qa) => {
            const processingOptions = {
                query,
                highlight: searchFilters?.qa,
                glossaryMap,
                enableGlossary: !id.includes('glossary'),
            };
            const questionHtml = processReaderHtml(qa.q, processingOptions);
            const answerHtml = processReaderHtml(`A: ${qa.a}`, processingOptions);

            return {
                ...qa,
                questionHtml: DOMPurify.sanitize(questionHtml),
                answerHtml: DOMPurify.sanitize(answerHtml),
            };
        })
    ), [section.qas, query, searchFilters?.qa, glossaryMap, id]);

    const [copyFeedback, setCopyFeedback] = useState(null);
    const [citeMenuOpen, setCiteMenuOpen] = useState(false);
    const citeContainerRef = useRef(null);
    const citeTriggerRef = useRef(null);
    const copyFeedbackTimerRef = useRef(null);
    const copyRequestRef = useRef(0);
    const isMountedRef = useRef(false);
    const citeMenuId = `citation-menu-${id}`;

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            copyRequestRef.current += 1;
            if (copyFeedbackTimerRef.current) {
                window.clearTimeout(copyFeedbackTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!citeMenuOpen) return undefined;

        const closeCiteMenu = (restoreFocus = false) => {
            setCiteMenuOpen(false);
            if (restoreFocus) {
                window.requestAnimationFrame(() => citeTriggerRef.current?.focus());
            }
        };

        const handlePointerDown = (event) => {
            if (!citeContainerRef.current?.contains(event.target)) {
                closeCiteMenu();
            }
        };

        const handleKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            closeCiteMenu(true);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [citeMenuOpen]);

    const showCopyFeedback = (message, kind = 'success') => {
        if (copyFeedbackTimerRef.current) {
            window.clearTimeout(copyFeedbackTimerRef.current);
        }

        setCopyFeedback({ message, kind });
        copyFeedbackTimerRef.current = window.setTimeout(() => {
            setCopyFeedback(null);
            copyFeedbackTimerRef.current = null;
        }, 2500);
    };

    const copyWithFeedback = async (text, successMessage) => {
        const requestId = ++copyRequestRef.current;

        try {
            await copyTextToClipboard(text);
            if (!isMountedRef.current || requestId !== copyRequestRef.current) {
                return false;
            }
            showCopyFeedback(successMessage);
            return true;
        } catch {
            if (!isMountedRef.current || requestId !== copyRequestRef.current) {
                return false;
            }
            showCopyFeedback('Could not access the clipboard. Please copy manually.', 'error');
            return false;
        }
    };

    const getSectionUrl = (sectionId) => (
        new URL(buildSectionPath(chapterId, sectionId), window.location.origin).href
    );

    const copyCitationFormat = async (format) => {
        const url = getSectionUrl(id);
        const prefix = chapterPrefix ? chapterPrefix : '';
        const fullTitle = section.title ? `${prefix}${section.title}` : fallbackTitle;
        const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        let textToCopy = '';

        if (format === 'formal') {
            textToCopy = `${citationSourceTitle}, ${fullTitle}. (Accessed ${today}). Available at: ${url}`;
        } else if (format === 'markdown') {
            textToCopy = `[${fullTitle} - ${citationMarkdownLabel}](${url})`;
        } else if (format === 'url') {
            textToCopy = url;
        }

        const successMessage = (
            format === 'formal' ? 'Formal citation copied!' :
            format === 'markdown' ? 'Markdown link copied!' : 'Direct link copied!'
        );

        if (await copyWithFeedback(textToCopy, successMessage)) {
            setCiteMenuOpen(false);
            window.requestAnimationFrame(() => citeTriggerRef.current?.focus());
        }
    };

    const copyPlainText = async () => {
        const prefix = chapterPrefix ? chapterPrefix : '';
        const fullTitle = section.title ? `${prefix}${section.title}` : fallbackTitle;
        
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
                const questionText = (tempQ.textContent || '').trim();
                const answerText = (tempA.textContent || '').trim();
                const questionPrefix = /^Q:/i.test(questionText) ? '' : 'Q: ';
                const answerPrefix = /^A:/i.test(answerText) ? '' : 'A: ';
                textToCopy += `\n${qa.label ? `${qa.label}\n` : ''}${questionPrefix}${questionText}\n${answerPrefix}${answerText}\n`;
            });
        }

        await copyWithFeedback(textToCopy, 'Plain text copied to clipboard!');
    };

    const handleClick = (e) => {
        const termNode = e.target.closest('.glossary-term');
        if (termNode) {
            e.stopPropagation(); 
            const termKey = termNode.getAttribute('data-term');
            onTermClick?.(termKey);
        }
    };

    const isBookmarked = bookmarksControls?.isBookmarked(
        id,
        bookmarkSection,
        bookmarkDocumentId,
        chapterId,
    );

    // Find related decision trees for this specific section only (no chapter fallback)
    const relatedTrees = useMemo(() => {
        return getTreesBySection(id);
    }, [id]);

    return (
        <div id={id} className="mb-8 scroll-mt-24" onClick={handleClick}>
            <div className={`group flex flex-col gap-2 mb-3 mt-6 sm:flex-row sm:items-baseline ${section.title ? 'sm:justify-between' : 'sm:justify-end print:hidden'}`}>
                {section.title && (
                    <h2 className="min-w-0 text-xl font-bold text-gray-800 flex items-center flex-wrap gap-2">
                        <Highlight text={section.title} query={searchFilters?.titles ? query : ''} />
                        {showQA && section.qas && section.qas.length > 0 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const qaEl = document.getElementById(`qa-block-${id}`);
                                    if (qaEl) qaEl.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="text-xs font-semibold bg-purple-50 text-[#7654A1] hover:bg-purple-100 border border-purple-100/80 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors print:hidden"
                                title={`Jump to ${section.qas.length} official Q&A guidance note${section.qas.length > 1 ? 's' : ''}`}
                            >
                                <AppIcon name="HelpCircle" size={12} />
                                <span>{section.qas.length} Q&A{section.qas.length > 1 ? 's' : ''}</span>
                            </button>
                        )}
                    </h2>
                )}
                <div className="flex flex-wrap gap-x-2 gap-y-1 shrink-0 sm:ml-4 sm:justify-end print:hidden">
                        {bookmarksControls && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                        bookmarksControls.toggleBookmark(
                                            id,
                                            section.title
                                                ? (chapterPrefix || '') + section.title
                                                : fallbackTitle,
                                        chapterId,
                                        bookmarkSection,
                                        bookmarkDocumentId,
                                    );
                                }}
                                className={`text-sm border rounded px-2 py-1 transition-colors ${isBookmarked ? 'bg-purple-100 text-purple-700 border-purple-200' : 'text-gray-500 hover:text-purple-600 border-transparent hover:border-purple-100'}`}
                                title={isBookmarked ? 'Remove bookmark' : 'Bookmark this section'}
                            >
                                {isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
                            </button>
                        )}
                        <div ref={citeContainerRef} className="relative">
                            <button
                                ref={citeTriggerRef}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCiteMenuOpen(!citeMenuOpen); }}
                                className="text-sm text-[#0099A7] hover:text-[#007A86] border border-transparent hover:border-cyan-100 rounded px-2 py-1 flex items-center gap-1 font-medium transition-colors"
                                title="Copy citation or reference link for this section"
                                aria-expanded={citeMenuOpen}
                                aria-controls={citeMenuOpen ? citeMenuId : undefined}
                            >
                                <span>Cite/Link</span>
                                <AppIcon name={citeMenuOpen ? "ChevronUp" : "ChevronDown"} size={12} />
                            </button>
                            {citeMenuOpen && (
                                <div
                                    id={citeMenuId}
                                    role="group"
                                    aria-label="Copy reference"
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50 animate-fade-in text-left"
                                >
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">Copy Reference</div>
                                    <button
                                        type="button"
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
                                        type="button"
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
                                        type="button"
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
                            type="button"
                            onClick={(e) => { e.stopPropagation(); copyPlainText(); }}
                            className="text-sm text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200 rounded px-2 py-1 font-medium transition-colors"
                            title="Copy clean plain text of this section"
                        >
                            Copy Text
                        </button>
                </div>
            </div>
            <div className="prose prose-slate max-w-none text-gray-800 leading-relaxed reader-content" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
            {supplement}
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
            {copyFeedback && (
                <div
                    role={copyFeedback.kind === 'error' ? 'alert' : 'status'}
                    aria-live={copyFeedback.kind === 'error' ? 'assertive' : 'polite'}
                    aria-atomic="true"
                    className={`fixed bottom-6 right-6 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-fade-in border print:hidden ${
                        copyFeedback.kind === 'error'
                            ? 'bg-red-700 border-red-600'
                            : 'bg-slate-900 border-slate-700/50'
                    }`}
                >
                    <AppIcon
                        name={copyFeedback.kind === 'error' ? 'AlertCircle' : 'Check'}
                        size={16}
                        className={copyFeedback.kind === 'error' ? 'text-red-100 shrink-0' : 'text-emerald-400 shrink-0'}
                    />
                    <span>{copyFeedback.message}</span>
                </div>
            )}
            {(showQA || printAllQA) && section.qas && (
                <div
                    id={`qa-block-${id}`}
                    className={`mt-4 space-y-4 scroll-mt-24 ${!showQA && printAllQA ? 'hidden print-always' : ''}`}
                >
                    {processedQas.map((qa, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100 print:bg-transparent print:border-none print:p-0 print:my-4">
                            {qa.label && (
                                <p className="text-xs font-bold text-[#0099A7] underline underline-offset-2 mb-2 reader-content">
                                    {qa.label}
                                </p>
                            )}
                            <p
                                className="font-bold text-gray-900 mb-1 reader-content"
                                dangerouslySetInnerHTML={{ __html: qa.questionHtml }}
                            />
                            <div
                                className="text-gray-700 prose prose-sm max-w-none reader-content"
                                dangerouslySetInnerHTML={{ __html: qa.answerHtml }}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
