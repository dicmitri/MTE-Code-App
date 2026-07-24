export const filterDecisionTrees = (trees, query) => {
  if (!Array.isArray(trees)) return [];

  const term = typeof query === 'string' ? query.trim().toLocaleLowerCase() : '';
  if (!term) return trees;

  return trees.filter((tree) => (
    tree?.title?.toLocaleLowerCase().includes(term)
    || tree?.description?.toLocaleLowerCase().includes(term)
  ));
};
