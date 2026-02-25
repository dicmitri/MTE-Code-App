import React, { useState, useMemo } from 'react';
import { highlightSearchTerm, processTextWithTerms } from '../utils/textUtils';

export const FullTextSection = ({ id, section, showQA, query, glossaryMap, onTermClick }) => {
    const processedHtml = useMemo(() => {
        let html = section.legalText;
        if (query) return highlightSearchTerm(html, query);
        if (glossaryMap && !id.includes('glossary')) return processTextWithTerms(html, glossaryMap);
        return html;
    }, [section.legalText, query, glossaryMap, id]);

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

    return (
        <div id={id} className="mb-8 scroll-mt-24" onClick={handleClick}>
            {section.title && (
                <div className="group flex justify-between items-baseline mb-3 mt-6">
                    <h3 className="text-xl font-bold text-gray-800">{section.title}</h3>
                    <button
                        onClick={(e) => { e.stopPropagation(); copyLink(id); }}
                        className="text-sm text-purple-600 hover:text-blue-800 border border-transparent hover:border-blue-100 rounded px-2 py-1 ml-4"
                        title="Copy link to this section"
                    >
                        Link
                    </button>
                </div>
            )}
            <div className="prose prose-slate max-w-none text-gray-800 leading-relaxed reader-content" dangerouslySetInnerHTML={{ __html: processedHtml }} />
            {showCopyMsg && (
                <div className="fixed bottom-5 right-5 bg-[#7654A1] text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity duration-300">
                    Link copied to clipboard!
                </div>
            )}
            {showQA && section.qas && (
                <div className="mt-4 space-y-4">
                    {section.qas.map((qa, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <p className="font-bold text-grey-900 mb-1 reader-content">{qa.q}</p>
                            <div className="text-gray-700 prose prose-sm max-w-none reader-content" dangerouslySetInnerHTML={{ __html: 'A: ' + (qa.a) }} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
