import React, { useEffect, useRef, useState } from 'react';
import { copyTextToClipboard } from '../utils/clipboardUtils';
import { AppIcon } from './AppIcons';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const SuggestionModal = ({ isOpen, onClose }) => {
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(null);
  const dialogRef = useRef(null);
  const subjectInputRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const copyFeedbackTimerRef = useRef(null);
  const dialogSessionRef = useRef(0);
  const copyRequestRef = useRef(0);

  const closeDialog = () => {
    dialogSessionRef.current += 1;
    copyRequestRef.current += 1;
    onCloseRef.current();
  };

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    dialogSessionRef.current += 1;
    previouslyFocusedRef.current = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setCopyFeedback(null);

    const focusFrame = window.requestAnimationFrame(() => {
      subjectInputRef.current?.focus();
    });

    const handleDialogKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
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
      dialogSessionRef.current += 1;
      copyRequestRef.current += 1;
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleDialogKeyDown);
      document.body.style.overflow = previousBodyOverflow;

      if (copyFeedbackTimerRef.current) {
        window.clearTimeout(copyFeedbackTimerRef.current);
        copyFeedbackTimerRef.current = null;
      }

      const previouslyFocused = previouslyFocusedRef.current;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        window.requestAnimationFrame(() => previouslyFocused.focus());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const recipientEmail = 'ethics@medtecheurope.org';

  const handleOpenDraft = (event) => {
    event.preventDefault();
    const mailtoSubject = subject.trim() ? `[Code App Suggestion] ${subject}` : '[Code App Suggestion] Feedback';
    const mailtoBody = details.trim() ? details : '(No details provided)';
    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(mailtoSubject)}&body=${encodeURIComponent(mailtoBody)}`;
    window.location.href = mailtoUrl;
    closeDialog();
  };

  const showCopyFeedback = (message, kind) => {
    if (copyFeedbackTimerRef.current) {
      window.clearTimeout(copyFeedbackTimerRef.current);
    }

    setCopyFeedback({ message, kind });
    copyFeedbackTimerRef.current = window.setTimeout(() => {
      setCopyFeedback(null);
      copyFeedbackTimerRef.current = null;
    }, 2500);
  };

  const handleCopyClipboard = async () => {
    const textToCopy = `To: ${recipientEmail}\nSubject: ${subject.trim() ? `[Code App Suggestion] ${subject}` : '[Code App Suggestion] Feedback'}\n\n${details.trim()}`;
    const dialogSession = dialogSessionRef.current;
    const requestId = ++copyRequestRef.current;

    try {
      await copyTextToClipboard(textToCopy);
      if (
        dialogSession !== dialogSessionRef.current
        || requestId !== copyRequestRef.current
      ) {
        return;
      }
      showCopyFeedback(
        'Suggestion copied to clipboard! Paste it into your email client.',
        'success',
      );
    } catch {
      if (
        dialogSession !== dialogSessionRef.current
        || requestId !== copyRequestRef.current
      ) {
        return;
      }
      showCopyFeedback(
        'Could not access the clipboard. Select the text and copy it manually.',
        'error',
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in no-print"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggestion-modal-title"
        aria-describedby="suggestion-modal-description"
        className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up"
      >
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AppIcon name="Lightbulb" size={22} className="text-amber-100 shrink-0" />
            <div>
              <h3 id="suggestion-modal-title" className="font-bold text-base leading-tight">
                Send a Suggestion
              </h3>
              <p id="suggestion-modal-description" className="text-xs text-amber-100 font-light">
                Direct feedback to ethics@medtecheurope.org
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            className="text-amber-100 hover:text-white p-1 rounded-lg hover:bg-amber-700/50 transition-colors"
            aria-label="Close suggestion dialog"
          >
            <AppIcon name="X" size={20} />
          </button>
        </div>

        <form onSubmit={handleOpenDraft} className="p-6 space-y-4 text-left">
          <div>
            <label
              htmlFor="suggestion-subject"
              className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
            >
              Title / Subject
            </label>
            <input
              ref={subjectInputRef}
              id="suggestion-subject"
              type="text"
              required
              placeholder="e.g. Feature Idea: Quick Search for Glossary"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-500 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="suggestion-details"
              className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
            >
              Details / Description
            </label>
            <textarea
              id="suggestion-details"
              required
              rows={4}
              placeholder="Describe your requested change, feature idea, or feedback..."
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-500 transition-all resize-none"
            />
          </div>

          {copyFeedback && (
            <div
              role={copyFeedback.kind === 'error' ? 'alert' : 'status'}
              aria-live={copyFeedback.kind === 'error' ? 'assertive' : 'polite'}
              aria-atomic="true"
              className={`text-xs rounded-xl p-3 flex items-center gap-2 animate-fade-in ${
                copyFeedback.kind === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              <AppIcon
                name={copyFeedback.kind === 'error' ? 'AlertCircle' : 'Check'}
                size={16}
                className={copyFeedback.kind === 'error' ? 'text-red-600 shrink-0' : 'text-emerald-600 shrink-0'}
              />
              <span>{copyFeedback.message}</span>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row gap-2.5 sm:justify-end">
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              title="Copy formatted text for webmail users"
            >
              <AppIcon name="Copy" size={15} />
              <span>Copy text</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <AppIcon name="Send" size={15} />
              <span>Open Email Draft</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
