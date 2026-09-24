import { useEffect, useMemo, useRef } from 'react';
import { getSearchIndex, prebuildSearchIndex } from '../config/search';
import { runSearch } from '../utils/searchEngine';
import { describeSearchResponse, emitSearchEvent } from '../utils/searchEvents';

// How long a response must stay unchanged before it counts as "settled" for analytics -- a
// coarser stability window than the caller's own input debounce (see App.jsx's useDebounce).
const SETTLE_DELAY_MS = 1500;

/**
 * Runs the search engine against `query` in the given scope ('code' | 'transparency') and
 * returns the response, or null while there is nothing to search. Also prewarms the Code index
 * once on mount, and emits a `settled` analytics event once a non-null response has been stable
 * for 1.5s.
 */
export const useSearch = (query, scope) => {
  useEffect(() => {
    prebuildSearchIndex('code');
  }, []);

  const response = useMemo(() => {
    if (!query || !query.trim()) return null;
    return runSearch(getSearchIndex(scope), query);
  }, [query, scope]);

  const settleTimerRef = useRef(null);

  useEffect(() => {
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }

    if (!response) return undefined;

    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      emitSearchEvent('settled', describeSearchResponse(response));
    }, SETTLE_DELAY_MS);

    return () => {
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, [response]);

  return response;
};
