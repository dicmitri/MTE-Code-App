export const Highlight = ({ text, query }) => {
    if (!query || !query.trim() || !text) return <span>{text || ""}</span>;
    if (typeof text !== 'string') return text;
    const parts = text.toString().split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
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