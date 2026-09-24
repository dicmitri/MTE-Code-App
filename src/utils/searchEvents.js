// Analytics-ready search instrumentation. Pure where possible: no network calls and no storage
// of search queries anywhere. `describeSearchResponse` only ever summarizes a response that
// already exists in memory; `emitSearchEvent` only ever dispatches a CustomEvent that a future
// (out of scope) collector could listen for. Nothing here reads or writes localStorage.
export const SEARCH_EVENT_NAME = 'mte:search';

const normalizeQueryText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

// An order-independent key for grouping reformulations of "the same" search ("wife travel" and
// "travel wife" collapse to one key), used for future top-searches/zero-results reporting.
const buildQueryKey = (normalizedQuery) => (
  [...new Set(normalizedQuery.split(' ').filter(Boolean))].sort().join(' ')
);

/**
 * Summarizes a runSearch() response into the flat shape an analytics collector would want:
 * the normalized query, an order-independent key, the scope, how many authoritative results
 * came back, whether it was a zero-result search, the first few result ids, which expansion
 * sources fired (spelling/completion/phrasebook/abbreviation/glossary), and any shortcut taken.
 */
export const describeSearchResponse = (response) => {
  const query = normalizeQueryText(response?.query);
  const results = Array.isArray(response?.results) ? response.results : [];
  const concepts = Array.isArray(response?.concepts) ? response.concepts : [];

  const sources = new Set();
  for (const concept of concepts) {
    for (const member of concept?.members || []) {
      if (member?.matched && member.source && member.source !== 'query') {
        sources.add(member.source);
      }
    }
  }

  return {
    query,
    key: buildQueryKey(query),
    scope: response?.scope ?? null,
    resultCount: results.length,
    zeroResults: results.length === 0,
    topIds: results.slice(0, 5).map((hit) => hit.id),
    sources: [...sources].sort(),
    shortcut: response?.shortcut ?? null,
  };
};

/**
 * Dispatches a `mte:search` CustomEvent on window so a future collector (out of scope here) can
 * listen for it. Silently does nothing when window/CustomEvent are unavailable (SSR, Node tests,
 * a very old browser) -- analytics must never be able to break the app.
 */
export const emitSearchEvent = (type, detail = {}) => {
  try {
    if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
    window.dispatchEvent(new CustomEvent(SEARCH_EVENT_NAME, { detail: { type, ...detail } }));
  } catch {
    // Analytics must never break the UI.
  }
};

const SEARCH_DEBUG_STORAGE_KEY = 'MTE_SEARCH_DEBUG';

/**
 * A `?searchDebug=1` URL parameter turns on (and remembers, via sessionStorage) a debug mode
 * that shows score/coverage/proximity on each search result; `?searchDebug=0` turns it back
 * off. With no parameter present, the previously-remembered flag (if any) is used. Wrapped in
 * try/catch throughout: any storage or URL-parsing error is treated as "debug mode off".
 */
export const isSearchDebugEnabled = () => {
  try {
    if (typeof window === 'undefined') return false;

    const params = new URLSearchParams(window.location.search);
    if (params.has('searchDebug')) {
      if (params.get('searchDebug') === '1') {
        window.sessionStorage.setItem(SEARCH_DEBUG_STORAGE_KEY, '1');
      } else if (params.get('searchDebug') === '0') {
        window.sessionStorage.removeItem(SEARCH_DEBUG_STORAGE_KEY);
      }
    }

    return window.sessionStorage.getItem(SEARCH_DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};
