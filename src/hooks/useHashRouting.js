import { useEffect } from 'react';
import { FULL_CODE_DATA } from '../data/codeData';

export const useHashRouting = (setActiveId, setShowSummary, setShowFullText) => {
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    const getHashId = (chId, title, idx) => {
      let slug;
      if (title) {
        slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
      } else {
        slug = `section-${idx}`;
      }
      return `${chId}-${slug}`;
    };

    const targetChapter = FULL_CODE_DATA.find((ch) => {
      if (ch.id === hash) return true;
      return (
        ch.sections &&
        ch.sections.some((s, i) => getHashId(ch.id, s.title, i) === hash)
      );
    });

    if (targetChapter) {
      setActiveId(targetChapter.id);
      setShowSummary(true);
      setShowFullText(true);

      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          element.classList.add(
            'bg-yellow-50',
            'transition-colors',
            'duration-1000'
          );
          setTimeout(() => element.classList.remove('bg-yellow-50'), 2000);
        }
      }, 500);
    }
  }, [setActiveId, setShowSummary, setShowFullText]);
};
