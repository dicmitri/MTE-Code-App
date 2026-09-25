import { useEffect, useState } from 'react';

// Widths in the reader layout (see Sidebar.jsx and DocumentReader.jsx): sidebar, the text
// column's side padding, the gap before the side column, and the side panel.
const SIDEBAR_PX = 320;
const READER_PADDING_PX = 80;
const COLUMN_GAP_PX = 56;
const SIDE_PANEL_PX = 320;
const SIDE_PANEL_MIN_VIEWPORT_PX = 1440;

// The narrowest window that holds the sidebar, the text column at its chosen width and the
// side panel without squeezing the text: 1440px at the default settings, more for larger text.
export const getSidePanelMinWidth = (fontSize, lineLength) => {
  const textColumnPx = (parseFloat(fontSize) || 1) * 16 * (Number(lineLength) || 40);
  return Math.max(
    SIDE_PANEL_MIN_VIEWPORT_PX,
    Math.ceil(SIDEBAR_PX + READER_PADDING_PX + COLUMN_GAP_PX + SIDE_PANEL_PX + textColumnPx),
  );
};

export const useSidePanelFits = (fontSize, lineLength) => {
  const query = `(min-width: ${getSidePanelMinWidth(fontSize, lineLength)}px)`;
  const [fits, setFits] = useState(() => (
    typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches)
  ));

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(query);
    if (!mediaQuery) return undefined;
    setFits(mediaQuery.matches);
    const handleChange = (event) => setFits(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return fits;
};
