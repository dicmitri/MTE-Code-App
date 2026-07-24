export const RECENT_SEARCH_LIMIT = 4;

export const normalizeRecentSearches = (
  searches,
  limit = RECENT_SEARCH_LIMIT,
) => {
  if (!Array.isArray(searches)) return [];

  const normalized = [];
  const seen = new Set();

  for (const search of searches) {
    if (typeof search !== 'string') continue;

    const term = search.trim();
    const key = term.toLocaleLowerCase();
    if (term.length < 2 || seen.has(key)) continue;

    seen.add(key);
    normalized.push(term);
    if (normalized.length === limit) break;
  }

  return normalized;
};

export const addRecentSearch = (
  searches,
  search,
  limit = RECENT_SEARCH_LIMIT,
) => {
  const current = normalizeRecentSearches(searches, limit);
  if (typeof search !== 'string') return current;

  const term = search.trim();
  if (term.length < 2) return current;

  return [
    term,
    ...current.filter(
      (existing) => existing.toLocaleLowerCase() !== term.toLocaleLowerCase(),
    ),
  ].slice(0, limit);
};
