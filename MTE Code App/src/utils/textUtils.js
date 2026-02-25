export const highlightSearchTerm = (html, query) => {
    if (!html) return "";
    if (!query || !query.trim()) return html;
    const term = query.trim();
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${escaped})`, 'gi');
    const parts = html.split(/(<[^>]*>)/);
    return parts.map(part => {
        if (part.startsWith('<')) return part;
        return part.replace(pattern, '<mark class="bg-yellow-200 text-black rounded px-0.5">$1</mark>');
    }).join('');
};

export const extractGlossaryMap = (data) => {
    const map = {};
    const glossaryChapter = data.find(c => c.id === 'glossary');
    if (!glossaryChapter || !glossaryChapter.sections) return map;
    const parser = new DOMParser();
    glossaryChapter.sections.forEach(section => {
        const doc = parser.parseFromString(section.legalText, 'text/html');
        const strongElements = doc.querySelectorAll('strong'); 
        strongElements.forEach(el => {
            const term = el.textContent.replace(/[:;,-]+$/, '').trim(); 
            if (term.length > 1 && term.length < 100) { 
                const definition = el.parentElement.innerHTML;
                const lowerTerm = term.toLowerCase();
                map[lowerTerm] = definition; 
                if (lowerTerm.endsWith('s')) {
                    const singular = lowerTerm.slice(0, -1);
                    if (singular.length > 1 && !map[singular]) map[singular] = definition;
                } else {
                    const plural = lowerTerm + 's';
                    if (!map[plural]) map[plural] = definition;
                } 
            }
        });
    });
    return map;
};

export const processTextWithTerms = (htmlContent, glossaryMap) => {
    if (!htmlContent || !glossaryMap) return htmlContent;
    const terms = Object.keys(glossaryMap).sort((a, b) => b.length - a.length);
    if (terms.length === 0) return htmlContent;
    const escapedTerms = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');
    const parts = htmlContent.split(/(<[^>]*>)/);
    return parts.map(part => {
        if (part.startsWith('<')) return part;
        return part.replace(pattern, (match) => {
            return `<span class="glossary-term text-[#60269e] cursor-pointer hover:bg-[#7654A1]/10 transition-colors rounded px-0.5" data-term="${match.toLowerCase()}">${match}</span>`;
        });
    }).join('');
};

export const generateSectionId = (chapterId, title, index) => {
    if (!chapterId) return '';
    
    let slug;
    if (title) {
        slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') 
            .replace(/(^-|-$)+/g, '');
    } else {
        slug = `section-${index}`;
    }
    
    return `${chapterId}-${slug}`;   
};
