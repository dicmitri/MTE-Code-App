import React from 'react';

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasQuery = (query) => (
    query instanceof RegExp ? true : Boolean(query && query.trim())
);

// Splits `text` into `{ text, match }` segments for either kind of query:
// - a RegExp (e.g. the search engine's compiled highlight pattern, which already carries its
//   own word forms/expansions and word-boundary logic) -- matched with matchAll, which clones
//   the pattern internally, so a shared regex instance's lastIndex is never disturbed;
// - a plain string (existing behaviour, unchanged) -- matched with a single escaped-regex split.
const splitIntoSegments = (text, query) => {
    if (query instanceof RegExp) {
        const pattern = query.global ? query : new RegExp(query.source, `${query.flags}g`);
        const segments = [];
        let cursor = 0;
        for (const match of text.matchAll(pattern)) {
            const matched = match[0];
            if (matched.length === 0) continue; // skip empty matches
            if (match.index > cursor) segments.push({ text: text.slice(cursor, match.index), match: false });
            segments.push({ text: matched, match: true });
            cursor = match.index + matched.length;
        }
        if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
        return segments;
    }

    const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
    return parts.map((part) => ({ text: part, match: part.toLowerCase() === query.toLowerCase() }));
};

const renderSegments = (segments) => (
    <span>
        {segments.map((segment, i) => (
            segment.match
                ? <mark key={i} className="bg-yellow-200 text-black rounded px-0.5">{segment.text}</mark>
                : segment.text
        ))}
    </span>
);

const renderJsonToReact = (node, query) => {
    if (typeof node === 'string' || typeof node === 'number') {
        if (!hasQuery(query)) return node;
        return renderSegments(splitIntoSegments(node.toString(), query));
    }

    if (!node || typeof node !== 'object') return null;

    if (Array.isArray(node)) {
        return node.map((child, i) => <React.Fragment key={i}>{renderJsonToReact(child, query)}</React.Fragment>);
    }

    if (node.type && node.props) {
        const { children, ...restProps } = node.props;
        return React.createElement(
            node.type,
            { ...restProps, key: node.key },
            children ? renderJsonToReact(children, query) : null
        );
    }

    return null;
};

export const Highlight = ({ text, query }) => {
    if (!text) return null;
    if (typeof text !== 'string') {
        return renderJsonToReact(text, query);
    }
    if (!hasQuery(query)) return <span>{text}</span>;

    return renderSegments(splitIntoSegments(text, query));
};
