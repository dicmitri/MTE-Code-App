// Search index registry -- same lazy, memoized-from-live-data pattern as routes.js, but built
// on first use (and idly prewarmed) instead of eagerly at import time, since building an index
// is much more work than parsing route tables.
import { FULL_CODE_DATA } from '../data/codeData';
import { TRANSPARENCY_DOCUMENTS } from '../data/transparency/transparencyData';
import phrasebook from '../data/search/phrasebook.json';
import { createSearchIndex } from '../utils/searchEngine';
import {
  buildCodeSearchDocuments,
  buildGlossaryTerms,
  buildTransparencySearchDocuments,
} from '../utils/searchDocuments';

// The Code Glossary is shared by both scopes, so general Code terms (and their abbreviations)
// stay searchable from within the Disclosure Guidelines too. Computed lazily, once, since
// building it walks the whole Glossary chapter.
let glossaryCache = null;
const getGlossary = () => {
  if (!glossaryCache) glossaryCache = buildGlossaryTerms(FULL_CODE_DATA);
  return glossaryCache;
};

const INDEX_BUILDERS = {
  code: () => createSearchIndex(buildCodeSearchDocuments(FULL_CODE_DATA), {
    phrasebook,
    glossary: getGlossary(),
    scope: 'code',
  }),
  transparency: () => createSearchIndex(buildTransparencySearchDocuments(TRANSPARENCY_DOCUMENTS), {
    phrasebook,
    glossary: getGlossary(),
    scope: 'transparency',
  }),
};

const indexCache = new Map();

/** Builds (once) and returns the search index for 'code' or 'transparency'. */
export const getSearchIndex = (scope) => {
  if (!indexCache.has(scope)) {
    const build = INDEX_BUILDERS[scope];
    if (!build) throw new Error(`Unknown search scope "${scope}".`);
    indexCache.set(scope, build());
  }
  return indexCache.get(scope);
};

/**
 * Builds the given scope's index in the background, during browser idle time, so the first real
 * query (almost always in the Code scope) doesn't pay the build cost. A no-op outside the
 * browser (SSR, Node tests) and safe to call more than once -- getSearchIndex is memoized.
 */
export const prebuildSearchIndex = (scope = 'code') => {
  if (typeof window === 'undefined') return;

  const schedule = typeof window.requestIdleCallback === 'function'
    ? (callback) => window.requestIdleCallback(callback)
    : (callback) => window.setTimeout(callback, 1500);

  schedule(() => {
    try {
      getSearchIndex(scope);
    } catch {
      // Best-effort only -- a real query later will build (and surface) the index anyway.
    }
  });
};
