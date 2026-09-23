import React, { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { AppIcon } from './AppIcons';

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export const DefinitionPopup = ({ term, definition, onClose }) => {
    const isOpen = Boolean(term);
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;

        // Focus moves into the dialog and returns to the glossary term when it closes.
        const previouslyFocused = document.activeElement;
        const focusFrame = window.requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });

        const handleDialogKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCloseRef.current();
                return;
            }

            if (event.key !== 'Tab') return;

            const focusableElements = Array.from(
                dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || [],
            ).filter((element) => element instanceof HTMLElement && element.offsetParent !== null);

            if (focusableElements.length === 0) {
                event.preventDefault();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement = document.activeElement;

            if (event.shiftKey && (activeElement === firstElement || !dialogRef.current?.contains(activeElement))) {
                event.preventDefault();
                lastElement.focus();
            } else if (
                !event.shiftKey
                && (activeElement === lastElement || !dialogRef.current?.contains(activeElement))
            ) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener('keydown', handleDialogKeyDown);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleDialogKeyDown);

            if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
                window.requestAnimationFrame(() => previouslyFocused.focus());
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in no-print"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="definition-popup-title"
                aria-describedby="definition-popup-body"
                className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
            >
                <div className="bg-[#007A86] p-4 flex justify-between items-center gap-3">
                    <h3 id="definition-popup-title" className="text-white font-bold text-lg">{term}</h3>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        className="shrink-0 text-white/90 hover:text-white p-1 rounded-lg hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white transition-colors"
                        aria-label="Close definition"
                    >
                        <AppIcon name="X" size={24} />
                    </button>
                </div>
                <div
                    id="definition-popup-body"
                    tabIndex={0}
                    className="p-6 max-h-[60vh] overflow-y-auto space-y-3 leading-relaxed text-gray-700 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#007A86]"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(definition) }}
                />
            </div>
        </div>
    );
};
