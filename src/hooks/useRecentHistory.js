import { useState, useCallback } from 'react';
import { FULL_CODE_DATA } from '../data/codeData';

export const useRecentHistory = (maxItems = 5) => {
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('mte_recent_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading history', e);
      return [];
    }
  });

  const addHistory = useCallback((chapterId) => {
    if (!chapterId || chapterId === 'home') return;
    
    setHistory(prev => {
      // Find the chapter
      const chapter = FULL_CODE_DATA.find(c => c.id === chapterId);
      if (!chapter) return prev;

      const newEntry = {
        id: chapter.id,
        title: chapter.title,
        icon: chapter.icon,
        part: chapter.part,
        timestamp: Date.now()
      };

      // Remove existing entry for same chapter if it exists
      const filtered = prev.filter(item => item.id !== chapterId);
      
      const newHistory = [newEntry, ...filtered].slice(0, maxItems);
      
      try {
        localStorage.setItem('mte_recent_history', JSON.stringify(newHistory));
      } catch (e) {
        console.error('Error saving history', e);
      }
      return newHistory;
    });
  }, [maxItems]);

  return { history, addHistory };
};
