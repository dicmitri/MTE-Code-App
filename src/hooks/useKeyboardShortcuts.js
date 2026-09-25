import { useEffect } from 'react';
import { updateSearchStatus } from '../data/codeData';

// Below this width the sidebar is a slide-in menu (Tailwind's lg breakpoint).
const DRAWER_SIDEBAR_QUERY = '(max-width: 1023.98px)';

export const useKeyboardShortcuts = (setSearchTerm, setSidebarOpen) => {
  useEffect(() => {
    const handleKeydown = (e) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        e.preventDefault();
        // The search box lives in the sidebar, so open the slide-in menu first on small screens.
        if (setSidebarOpen && window.matchMedia?.(DRAWER_SIDEBAR_QUERY).matches) {
          setSidebarOpen(true);
        }
        document.getElementById('searchTerm')?.focus();
      }
      if (e.key === 'Escape') {
        const searchInput = document.getElementById('searchTerm');
        if (searchInput && searchInput === document.activeElement) {
          setSearchTerm('');
          updateSearchStatus('Search cleared');
          searchInput.blur();
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [setSearchTerm, setSidebarOpen]);
};
