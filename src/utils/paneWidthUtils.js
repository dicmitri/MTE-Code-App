// Widths chosen by dragging the edge of the sidebar or of the reader's side panel. They are
// saved in rem so they scale with the interface on very large screens (see index.css).
// The panes' narrowest and widest sizes are applied by CSS (--sidebar-size and
// --side-pane-size), which reads these values from the variables below.
export const PANE_WIDTH_VARIABLES = Object.freeze({
  sidebar: '--sidebar-width',
  sidePane: '--side-pane-width',
});

// Anything outside this range is not a width a pane was ever dragged to.
const MIN_SAVED_REM = 8;
const MAX_SAVED_REM = 120;

const normalizeWidth = (value) => (
  typeof value === 'number' && Number.isFinite(value) && value >= MIN_SAVED_REM && value <= MAX_SAVED_REM
    ? Math.round(value * 100) / 100
    : null
);

// null means "not resized": the pane follows its default width.
export function normalizePaneWidths(value) {
  const widths = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(
    Object.keys(PANE_WIDTH_VARIABLES).map((pane) => [pane, normalizeWidth(widths[pane])]),
  );
}

export const pxToRem = (px, rootFontSizePx) => px / (rootFontSizePx > 0 ? rootFontSizePx : 16);
