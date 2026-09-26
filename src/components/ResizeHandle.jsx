import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const KEY_STEP_PX = 16;
const LARGE_KEY_STEP_PX = 64;
// A pointer has to move this far before a press counts as a drag, so clicks don't resize.
const DRAG_THRESHOLD_PX = 2;
// Asked for when the widest width is wanted; CSS keeps each pane within its limits.
const WIDEST_PX = 100000;

/**
 * ResizeHandle — the draggable edge of a docked pane (the sidebar or the reader's side panel).
 * Place it inside the pane it resizes; `edge` is the side of the pane it sits on. Drag it, use
 * the arrow keys (Shift for bigger steps, Home and End for the narrowest and widest), or
 * double-click it to restore the default width. Esc during a drag puts the pane back.
 *
 * resize: { preview, commit, cancel, reset } from usePaneWidths.
 */
export const ResizeHandle = ({ edge = 'right', label, controls, resize, className = '' }) => {
  const handleRef = useRef(null);
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  // The pane's share of the window width, for assistive technology.
  const [share, setShare] = useState(null);

  const measurePane = () => handleRef.current?.parentElement?.getBoundingClientRect().width ?? 0;

  const updateShare = () => {
    const width = measurePane();
    setShare(width > 0 ? Math.round((width / window.innerWidth) * 100) : null);
  };

  useLayoutEffect(() => {
    updateShare();
  }, []);

  const endDrag = (keepWidth) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDragging(false);
    document.documentElement.classList.remove('pane-resizing');
    window.removeEventListener('keydown', drag.cancelOnEscape, true);
    if (drag.moved) {
      if (keepWidth) resize.commit(measurePane());
      else resize.cancel();
    }
    updateShare();
  };

  // A drag in progress when the pane goes away (a new page, a narrower window) is dropped.
  useEffect(() => () => {
    const drag = dragRef.current;
    if (!drag) return;
    document.documentElement.classList.remove('pane-resizing');
    window.removeEventListener('keydown', drag.cancelOnEscape, true);
  }, []);

  const handlePointerDown = (event) => {
    if (event.button !== 0 || !resize) return;
    // No text selection or focus change while dragging.
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const cancelOnEscape = (keyEvent) => {
      if (keyEvent.key !== 'Escape') return;
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      endDrag(false);
    };
    window.addEventListener('keydown', cancelOnEscape, true);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: measurePane(),
      moved: false,
      cancelOnEscape,
    };
    setDragging(true);
    document.documentElement.classList.add('pane-resizing');
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const offset = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(offset) < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    resize.preview(Math.max(0, drag.startWidth + (edge === 'right' ? offset : -offset)));
  };

  const handleKeyDown = (event) => {
    if (!resize) return;
    const step = event.shiftKey ? LARGE_KEY_STEP_PX : KEY_STEP_PX;
    const width = measurePane();
    const widen = edge === 'right' ? 'ArrowRight' : 'ArrowLeft';
    const narrow = edge === 'right' ? 'ArrowLeft' : 'ArrowRight';
    const targets = { [widen]: width + step, [narrow]: width - step, Home: 0, End: WIDEST_PX };
    if (!(event.key in targets)) return;
    event.preventDefault();
    resize.preview(Math.max(0, targets[event.key]));
    // Reading the width back gives the width within the pane's limits.
    resize.commit(measurePane());
    updateShare();
  };

  const handleDoubleClick = () => {
    resize?.reset();
    window.requestAnimationFrame(updateShare);
  };

  return (
    <div
      ref={handleRef}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-controls={controls}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={share ?? undefined}
      aria-valuetext={share === null ? undefined : `${share}% of the window width`}
      tabIndex={0}
      title="Drag to resize. Double-click to restore the default width."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => endDrag(true)}
      onPointerCancel={() => endDrag(false)}
      onLostPointerCapture={() => endDrag(true)}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onFocus={updateShare}
      className={`group absolute inset-y-0 z-20 w-2 pointer-coarse:w-4 cursor-col-resize touch-none select-none outline-none no-print ${
        edge === 'right' ? 'left-full' : 'left-0'
      } ${className}`}
    >
      {/* The visible line sits on the pane's border. */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 -translate-x-1/2 transition-colors ${
          dragging
            ? 'w-0.5 bg-[#7654A1]'
            : 'w-0.5 bg-transparent group-hover:bg-[#0099A7]/60 group-focus-visible:w-1 group-focus-visible:bg-[#7654A1]'
        }`}
      />
    </div>
  );
};
