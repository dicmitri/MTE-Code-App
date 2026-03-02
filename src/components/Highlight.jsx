import React from 'react';

const renderJsonToReact = (node, query) => {
    if (typeof node === 'string' || typeof node === 'number') {
        if (!query || !query.trim()) return node;
        const parts = node.toString().split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) => 
                    part.toLowerCase() === query.toLowerCase() 
                        ? <mark key={i} className="bg-yellow-200 text-black rounded px-0.5">{part}</mark> 
                        : part
                )}
            </span>
        );
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
    if (!query || !query.trim()) return <span>{text}</span>;
    
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) => 
                part.toLowerCase() === query.toLowerCase() 
                    ? <mark key={i} className="bg-yellow-200 text-black rounded px-0.5">{part}</mark> 
                    : part
            )}
        </span>
    );
};