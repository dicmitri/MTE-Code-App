import { useEffect } from 'react';
import { updateSearchStatus } from '../data/codeData';

export const useKeyboardShortcuts = (setSearchTerm) => {
  useEffect(() => {
    const handleKeydown = (e) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        e.preventDefault();
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
  }, [setSearchTerm]);
};
