import { useState, useEffect } from 'react';
import { buildBookmarkKey, normalizeBookmarks } from '../utils/bookmarkUtils';

export const useBookmarks = () => {
    const [bookmarks, setBookmarks] = useState(() => {
        try {
            const item = window.localStorage.getItem('codeAppBookmarks');
            const saved = item ? JSON.parse(item) : [];
            return normalizeBookmarks(saved);
        } catch (error) {
            console.error(error);
            return [];
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem('codeAppBookmarks', JSON.stringify(bookmarks));
        } catch (error) {
            console.error(error);
        }
    }, [bookmarks]);

    const addBookmark = (id, title, chapterId, section = 'code', documentId = null) => {
        const key = buildBookmarkKey(id, section, documentId, chapterId);
        if (!bookmarks.some((bookmark) => bookmark.key === key)) {
            setBookmarks([
                ...bookmarks,
                {
                    key,
                    id,
                    title,
                    chapterId,
                    section,
                    documentId,
                    dateAdded: new Date().toISOString(),
                },
            ]);
        }
    };

    const removeBookmark = (id, section = 'code', documentId = null, chapterId = '') => {
        const key = buildBookmarkKey(id, section, documentId, chapterId);
        setBookmarks(bookmarks.filter((bookmark) => bookmark.key !== key));
    };

    const toggleBookmark = (id, title, chapterId, section = 'code', documentId = null) => {
        const key = buildBookmarkKey(id, section, documentId, chapterId);
        if (bookmarks.some((bookmark) => bookmark.key === key)) {
            removeBookmark(id, section, documentId, chapterId);
        } else {
            addBookmark(id, title, chapterId, section, documentId);
        }
    };

    const isBookmarked = (id, section = 'code', documentId = null, chapterId = '') => {
        const key = buildBookmarkKey(id, section, documentId, chapterId);
        return bookmarks.some((bookmark) => bookmark.key === key);
    };

    return { bookmarks, addBookmark, removeBookmark, toggleBookmark, isBookmarked };
};

