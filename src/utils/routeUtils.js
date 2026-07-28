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

function createRoute(
  activeSection,
  activeId,
  canonicalUrl,
  anchor = null,
  activeDocumentId,
) {
  const route = { activeSection, activeId, anchor, canonicalUrl };

  if (activeDocumentId !== undefined) {
    route.activeDocumentId = activeDocumentId;
  }

  return route;
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

export function buildTransparencyHomePath() {
  return '/transparency';
}

export function buildTransparencyDocumentPath(documentId) {
  return `${buildTransparencyHomePath()}/${encodeURIComponent(documentId)}`;
}

export function buildTransparencyUnitPath(documentId, unitId) {
  return `${buildTransparencyDocumentPath(documentId)}/${encodeURIComponent(unitId)}`;
}

export function buildTransparencySectionPath(documentId, unitId, sectionId) {
  return `${buildTransparencyUnitPath(documentId, unitId)}#${encodeURIComponent(sectionId)}`;
}

export function createRouteUtils(chapters, trees, transparencyDocuments = []) {
  const chapterIds = new Set(chapters.map((chapter) => chapter.id));
  const treeIds = new Set(trees.map((tree) => tree.id));
  const sectionOwners = new Map();
  const transparencyDocumentIndex = new Map();

  chapters.forEach((chapter) => {
    chapter.sections.forEach((section, index) => {
      sectionOwners.set(generateSectionId(chapter.id, section.title, index), chapter.id);
    });
  });

  transparencyDocuments.forEach((document) => {
    const units = document.units || [];
    const unitIds = new Set();
    const transparencySectionOwners = new Map();

    units.forEach((unit) => {
      unitIds.add(unit.id);
      (unit.sections || []).forEach((section, index) => {
        const sectionId = generateSectionId(unit.id, section.title, index);
        transparencySectionOwners.set(sectionId, unit.id);
      });
    });

    transparencyDocumentIndex.set(document.id, {
      unitIds,
      sectionOwners: transparencySectionOwners,
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

  function resolveTransparencyHash(documentId, hash) {
    const value = hashValue(hash);
    if (!value) return null;

    const document = transparencyDocumentIndex.get(documentId);
    const unitId = document?.sectionOwners.get(value);

    if (!unitId) return null;

    return createRoute(
      'transparency',
      unitId,
      buildTransparencySectionPath(documentId, unitId, value),
      value,
      documentId,
    );
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

    if (segments[0] === 'transparency') {
      if (segments.length === 1) {
        return createRoute(
          'transparency',
          'transparency-home',
          buildTransparencyHomePath(),
        );
      }

      const documentId = segments[1];
      const document = transparencyDocumentIndex.get(documentId);

      if (!document) {
        return createRoute(
          'transparency',
          'transparency-home',
          buildTransparencyHomePath(),
        );
      }

      const hashRoute = resolveTransparencyHash(documentId, hash);

      if (segments.length === 2) {
        return hashRoute || createRoute(
          'transparency',
          'home',
          buildTransparencyDocumentPath(documentId),
          null,
          documentId,
        );
      }

      if (segments.length === 3 && document.unitIds.has(segments[2])) {
        if (hashRoute?.anchor) return hashRoute;
        return createRoute(
          'transparency',
          segments[2],
          buildTransparencyUnitPath(documentId, segments[2]),
          null,
          documentId,
        );
      }

      return createRoute(
        'transparency',
        'home',
        buildTransparencyDocumentPath(documentId),
        null,
        documentId,
      );
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
