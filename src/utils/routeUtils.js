import { generateSectionId } from './textUtils.js';

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/';
  return `/${pathname.split('/').filter(Boolean).join('/')}`;
}

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return '';
  }
}

function normalizeHash(hash) {
  if (!hash) return '';
  return hash.startsWith('#') ? hash : `#${hash}`;
}

function hashValue(hash) {
  return decodeSegment(normalizeHash(hash).slice(1));
}

function createRoute(activeSection, activeId, canonicalUrl, anchor = null) {
  return { activeSection, activeId, anchor, canonicalUrl };
}

export function buildHomePath() {
  return '/';
}

export function buildCodeHomePath() {
  return '/code';
}

export function buildChapterPath(chapterId) {
  return `/code/${encodeURIComponent(chapterId)}`;
}

export function buildCodeSectionPath(chapterId, sectionId) {
  return `${buildChapterPath(chapterId)}#${encodeURIComponent(sectionId)}`;
}

export function buildTreesHomePath() {
  return '/trees';
}

export function buildTreePath(treeId) {
  return `/trees/${encodeURIComponent(treeId)}`;
}

export function buildQuizPath(quizHash = '') {
  const normalizedQuizHash = normalizeHash(quizHash);
  return normalizedQuizHash === '#quiz' ? '/quiz' : `/quiz${normalizedQuizHash}`;
}

export function buildTpptPath() {
  return '/tppt';
}

export function createRouteUtils(chapters, trees) {
  const chapterIds = new Set(chapters.map((chapter) => chapter.id));
  const treeIds = new Set(trees.map((tree) => tree.id));
  const sectionOwners = new Map();

  chapters.forEach((chapter) => {
    chapter.sections.forEach((section, index) => {
      sectionOwners.set(generateSectionId(chapter.id, section.title, index), chapter.id);
    });
  });

  function resolveCodeHash(hash) {
    const value = hashValue(hash);
    if (!value) return null;

    if (chapterIds.has(value)) {
      return createRoute('code', value, buildChapterPath(value));
    }

    const chapterId = sectionOwners.get(value);
    if (chapterId) {
      return createRoute('code', chapterId, buildCodeSectionPath(chapterId, value), value);
    }

    return null;
  }

  function resolveLegacyHash(hash) {
    const value = hashValue(hash);
    if (!value) return null;

    if (value.startsWith('quiz')) {
      return createRoute('quiz', 'quiz', buildQuizPath(hash));
    }

    if (value.startsWith('tppt')) {
      return createRoute('tppt', 'tppt-home', buildTpptPath());
    }

    if (treeIds.has(value)) {
      return createRoute('trees', value, buildTreePath(value));
    }

    return resolveCodeHash(hash);
  }

  function parseAppLocation(pathname, hash = '') {
    const normalizedPath = normalizePathname(pathname);
    const segments = normalizedPath.split('/').filter(Boolean).map(decodeSegment);

    if (normalizedPath === '/') {
      return resolveLegacyHash(hash) || createRoute(null, 'home', buildHomePath());
    }

    if (segments[0] === 'code') {
      const hashRoute = resolveCodeHash(hash);

      if (segments.length === 1) {
        return hashRoute || createRoute('code', 'home', buildCodeHomePath());
      }

      if (segments.length === 2 && chapterIds.has(segments[1])) {
        if (hashRoute?.anchor) return hashRoute;
        return createRoute('code', segments[1], buildChapterPath(segments[1]));
      }
    }

    if (segments[0] === 'trees') {
      if (segments.length === 1) {
        return createRoute('trees', 'trees-home', buildTreesHomePath());
      }

      if (segments.length === 2 && treeIds.has(segments[1])) {
        return createRoute('trees', segments[1], buildTreePath(segments[1]));
      }
    }

    if (segments.length === 1 && segments[0] === 'quiz') {
      const value = hashValue(hash);
      const quizHash = value.startsWith('quiz') ? hash : '';
      return createRoute('quiz', 'quiz', buildQuizPath(quizHash));
    }

    if (segments.length === 1 && segments[0] === 'tppt') {
      return createRoute('tppt', 'tppt-home', buildTpptPath());
    }

    return resolveLegacyHash(hash) || createRoute(null, 'home', buildHomePath());
  }

  return { parseAppLocation };
}
