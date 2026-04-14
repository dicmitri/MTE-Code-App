import { useState, useEffect } from 'react';

export const useBookmarks = () => {
    const [bookmarks, setBookmarks] = useState(() => {
        try {
            const item = window.localStorage.getItem('codeAppBookmarks');
            return item ? JSON.parse(item) : [];
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

    const addBookmark = (id, title, chapterId) => {
        if (!bookmarks.some(b => b.id === id)) {
            setBookmarks([...bookmarks, { id, title, chapterId, dateAdded: new Date().toISOString() }]);
        }
    };

    const removeBookmark = (id) => {
        setBookmarks(bookmarks.filter(b => b.id !== id));
    };

    const toggleBookmark = (id, title, chapterId) => {
        if (bookmarks.some(b => b.id === id)) {
            removeBookmark(id);
        } else {
            addBookmark(id, title, chapterId);
        }
    };

    const isBookmarked = (id) => {
        return bookmarks.some(b => b.id === id);
    };

    return { bookmarks, addBookmark, removeBookmark, toggleBookmark, isBookmarked };
};
