import React from 'react';
import DOMPurify from 'dompurify';

export const DefinitionPopup = ({ term, definition, onClose }) => {
    if (!term) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="bg-[#0099A7] p-4 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg capitalize">{term}</h3>
                    <button onClick={onClose} className="text-blue-200 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto prose prose-sm leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(definition) }} />
            </div>
        </div>
    );
};

