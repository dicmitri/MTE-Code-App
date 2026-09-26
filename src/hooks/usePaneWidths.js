import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PANE_WIDTH_VARIABLES, normalizePaneWidths, pxToRem } from '../utils/paneWidthUtils';

const STORAGE_KEY = 'mte_pane_widths';

const loadPaneWidths = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return normalizePaneWidths(saved ? JSON.parse(saved) : null);
  } catch (error) {
    console.error('Could not load pane widths', error);
    return normalizePaneWidths(null);
  }
};

const applyWidth = (pane, width) => {
  const { style } = document.documentElement;
  if (width === null) style.removeProperty(PANE_WIDTH_VARIABLES[pane]);
  else style.setProperty(PANE_WIDTH_VARIABLES[pane], width);
};

const toCssWidth = (rem) => (rem === null ? null : `${rem}rem`);

/**
 * The widths the sidebar and the side panel were dragged to, saved between visits and applied
 * as CSS variables before the first paint. Each pane gets { preview, commit, cancel, reset }
 * for its ResizeHandle: a drag previews widths without re-rendering the app, and only the
 * width it ends on is saved.
 */
export const usePaneWidths = () => {
  const [widths, setWidths] = useState(loadPaneWidths);
  const savedWidthsRef = useRef(widths);

  useLayoutEffect(() => {
    savedWidthsRef.current = widths;
    Object.keys(PANE_WIDTH_VARIABLES).forEach((pane) => applyWidth(pane, toCssWidth(widths[pane])));
  }, [widths]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch (error) {
      console.error('Could not save pane widths', error);
    }
  }, [widths]);

  return useMemo(() => {
    const controlsFor = (pane) => ({
      preview: (px) => applyWidth(pane, `${px}px`),
      commit: (px) => {
        const rootFontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
        setWidths((current) => normalizePaneWidths({ ...current, [pane]: pxToRem(px, rootFontSize) }));
      },
      cancel: () => applyWidth(pane, toCssWidth(savedWidthsRef.current[pane])),
      reset: () => setWidths((current) => ({ ...current, [pane]: null })),
    });
    return { sidebar: controlsFor('sidebar'), sidePane: controlsFor('sidePane') };
  }, []);
};
