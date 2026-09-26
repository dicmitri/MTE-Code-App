import { useEffect, useState } from 'react';

// The side panel is docked beside the reader text from Tailwind's xl breakpoint (80rem, 1280px
// at the default text size), the same breakpoint that shows it in DocumentReader.jsx. From
// there the window holds the sidebar, the text and the panel at their narrowest (index.css).
export const SIDE_PANEL_MEDIA_QUERY = '(min-width: 80rem)';

export const useSidePanelFits = () => {
  const [fits, setFits] = useState(() => (
    typeof window !== 'undefined' && Boolean(window.matchMedia?.(SIDE_PANEL_MEDIA_QUERY).matches)
  ));

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(SIDE_PANEL_MEDIA_QUERY);
    if (!mediaQuery) return undefined;
    setFits(mediaQuery.matches);
    const handleChange = (event) => setFits(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return fits;
};
