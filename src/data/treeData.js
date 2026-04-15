import TREE_DATA_JSON from './treeData.json';

export const TREE_DATA = TREE_DATA_JSON;

/**
 * Get all unique categories from tree data.
 */
export const getTreeCategories = () => {
  const cats = new Set(TREE_DATA.map(t => t.category));
  return [...cats];
};

/**
 * Get trees related to a specific chapter ID.
 */
export const getTreesByChapter = (chapterId) => {
  return TREE_DATA.filter(t => 
    Array.isArray(t.relatedChapter) ? t.relatedChapter.includes(chapterId) : t.relatedChapter === chapterId
  );
};

/**
 * Get trees related to a specific section ID.
 */
export const getTreesBySection = (sectionId) => {
  return TREE_DATA.filter(t => 
    Array.isArray(t.relatedSection) ? t.relatedSection.includes(sectionId) : t.relatedSection === sectionId
  );
};
