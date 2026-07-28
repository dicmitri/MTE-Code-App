export function buildBookmarkKey(
  id,
  section = 'code',
  documentId = null,
  chapterId = '',
) {
  return [section, documentId || '', chapterId || '', id].join(':');
}

export function normalizeBookmarks(value) {
  if (!Array.isArray(value)) return [];

  return value.map((bookmark) => {
    const section = bookmark.section || 'code';
    const documentId = bookmark.documentId || null;
    return {
      ...bookmark,
      section,
      documentId,
      key: bookmark.key || buildBookmarkKey(
        bookmark.id,
        section,
        documentId,
        bookmark.chapterId,
      ),
    };
  });
}
