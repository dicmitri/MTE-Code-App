export function normalizeSearchQuery(value) {
  return String(value || '').trim();
}

export function hasOnlyQaMatches(matchBreakdown) {
  if (!matchBreakdown) return false;

  return Number(matchBreakdown.qa || 0) > 0
    && Number(matchBreakdown.title || 0) === 0
    && Number(matchBreakdown.text || 0) === 0;
}

export function getSearchExpansionSnapshot({
  currentSnapshot,
  scope,
  expandedGroups,
  defaultExpandedGroups,
}) {
  if (currentSnapshot?.scope === scope) return currentSnapshot;

  return {
    scope,
    groups: new Set(
      currentSnapshot ? defaultExpandedGroups : expandedGroups,
    ),
  };
}

export function getSearchExpansionRestore({
  snapshot,
  scope,
  defaultExpandedGroups,
}) {
  const groups = snapshot?.scope === scope
    ? snapshot.groups
    : defaultExpandedGroups;

  return new Set(groups || []);
}
