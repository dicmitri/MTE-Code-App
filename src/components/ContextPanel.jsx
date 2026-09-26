import React, { useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import { AppIcon } from './AppIcons';
import { isPlainLinkClick } from '../utils/crossReferences';

/**
 * ContextPanel — shown in the side panel beside the reader text on wide screens. It shows one
 * item at a time (a definition, or a referenced chapter, section or Q&A in full) and only opens
 * when the reader asks for it. The side panel scrolls on its own, so nothing is cut short.
 *
 * item: { key, label, title, location?, html, href?, target?, actionLabel? }
 */
export const ContextPanel = ({ item, onClose, onOpenTarget }) => {
  const headingRef = useRef(null);
  // Memoized so re-renders don't re-sanitize the markup and clear a text selection.
  const markup = useMemo(() => ({ __html: DOMPurify.sanitize(item?.html || '') }), [item?.html]);

  // Move focus to the new item so screen readers announce it; closing returns focus to the
  // term or link that opened it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [item?.key]);

  if (!item) return null;

  return (
    <section
      aria-labelledby="context-panel-title"
      className="rounded-xl border border-gray-200 bg-white no-print animate-fade-in"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onClose?.();
      }}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#007A86]">
          {item.label}
        </span>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="-mr-1 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-[#7654A1] transition-colors"
          aria-label="Close side panel"
          title="Close (Esc)"
        >
          <AppIcon name="X" size={16} />
        </button>
      </div>
      <h2
        id="context-panel-title"
        ref={headingRef}
        tabIndex={-1}
        className="px-4 pt-1 text-[15px] font-bold leading-snug text-gray-900 focus:outline-none"
      >
        {item.title}
      </h2>
      {item.location && (
        <p className="px-4 mt-0.5 text-[11px] font-medium text-gray-500">{item.location}</p>
      )}
      {/* Above the text, so it stays at hand when the text is long. */}
      {item.target && item.actionLabel && (
        <p className="px-4 mt-2">
          <a
            href={item.href}
            onClick={(event) => {
              if (!isPlainLinkClick(event)) return;
              event.preventDefault();
              onOpenTarget?.(item.target);
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#007A86] hover:text-[#7654A1] focus-visible:outline-2 focus-visible:outline-[#7654A1] rounded"
          >
            {item.actionLabel}
            <AppIcon name="ArrowRight" size={12} />
          </a>
        </p>
      )}
      <div
        className="mt-2 border-t border-gray-100 px-4 pt-3 pb-4 text-sm leading-relaxed text-gray-700 space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_strong]:font-semibold [&_strong]:text-gray-900 [&_img]:rounded-md"
        dangerouslySetInnerHTML={markup}
      />
    </section>
  );
};
