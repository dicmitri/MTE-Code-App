import { useCallback, useEffect } from 'react';
import { parseAppLocation } from '../config/routes';
import {
  buildChapterPath,
  buildCodeHomePath,
  buildCodeSectionPath,
  buildHomePath,
  buildQuizPath,
  buildTpptPath,
  buildTreePath,
  buildTreesHomePath,
} from '../utils/routeUtils';

function currentRouteUrl() {
  return `${window.location.pathname}${window.location.hash}`;
}

export const useAppRouting = ({
  setActiveId,
  setActiveSection,
  setShowSummary,
  setShowFullText,
  scrollRef,
}) => {
  const applyRoute = useCallback((route) => {
    setActiveSection(route.activeSection);
    setActiveId(route.activeId);

    if (route.anchor) {
      setShowSummary(true);
      setShowFullText(true);
    }

    window.setTimeout(() => {
      if (route.anchor) {
        const element = document.getElementById(route.anchor);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          element.classList.add('bg-yellow-50', 'transition-colors', 'duration-1000');
          window.setTimeout(() => element.classList.remove('bg-yellow-50'), 2000);
        }
        return;
      }

      scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }, route.anchor ? 500 : 0);
  }, [scrollRef, setActiveId, setActiveSection, setShowFullText, setShowSummary]);

  const syncFromBrowser = useCallback(() => {
    const route = parseAppLocation(window.location.pathname, window.location.hash);

    if (currentRouteUrl() !== route.canonicalUrl) {
      window.history.replaceState(null, '', route.canonicalUrl);
    }

    applyRoute(route);
  }, [applyRoute]);

  useEffect(() => {
    syncFromBrowser();
    window.addEventListener('popstate', syncFromBrowser);
    window.addEventListener('hashchange', syncFromBrowser);

    return () => {
      window.removeEventListener('popstate', syncFromBrowser);
      window.removeEventListener('hashchange', syncFromBrowser);
    };
  }, [syncFromBrowser]);

  const navigateTo = useCallback((requestedUrl, { replace = false } = {}) => {
    const target = new URL(requestedUrl, window.location.origin);
    const route = parseAppLocation(target.pathname, target.hash);

    if (currentRouteUrl() !== route.canonicalUrl) {
      const historyMethod = replace ? 'replaceState' : 'pushState';
      window.history[historyMethod](null, '', route.canonicalUrl);
    }

    applyRoute(route);
  }, [applyRoute]);

  const navigateHome = useCallback(() => navigateTo(buildHomePath()), [navigateTo]);
  const navigateCodeHome = useCallback(() => navigateTo(buildCodeHomePath()), [navigateTo]);
  const navigateChapter = useCallback((chapterId) => {
    navigateTo(buildChapterPath(chapterId));
  }, [navigateTo]);
  const navigateCodeSection = useCallback((chapterId, sectionId) => {
    navigateTo(buildCodeSectionPath(chapterId, sectionId));
  }, [navigateTo]);
  const navigateTreesHome = useCallback(() => navigateTo(buildTreesHomePath()), [navigateTo]);
  const navigateTree = useCallback((treeId) => navigateTo(buildTreePath(treeId)), [navigateTo]);
  const navigateQuiz = useCallback(() => navigateTo(buildQuizPath()), [navigateTo]);
  const navigateTppt = useCallback(() => navigateTo(buildTpptPath()), [navigateTo]);

  return {
    navigateHome,
    navigateCodeHome,
    navigateChapter,
    navigateCodeSection,
    navigateTreesHome,
    navigateTree,
    navigateQuiz,
    navigateTppt,
  };
};
