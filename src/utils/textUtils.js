export const highlightSearchTerm = (html, query) => {
    if (!html) return "";
    if (!query) return html;
    const isPattern = query instanceof RegExp;
    if (!isPattern && !query.trim()) return html;

    const pattern = isPattern
        ? (query.global ? query : new RegExp(query.source, `${query.flags}g`))
        : new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const replacement = isPattern
        ? '<mark class="bg-yellow-200 text-black rounded px-0.5">$&</mark>'
        : '<mark class="bg-yellow-200 text-black rounded px-0.5">$1</mark>';

    const parts = html.split(/(<[^>]*>)/);
    return parts.map(part => {
        if (part.startsWith('<')) return part;
        return part.replace(pattern, replacement);
    }).join('');
};

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "Events" <-> "Event", "Third Party Intermediary" <-> "Third Party Intermediaries", "HCP" -> "HCPs".
const otherGrammaticalNumber = (text) => {
    if (/[^aeiou]y$/.test(text)) return `${text.slice(0, -1)}ies`;
    if (/ies$/.test(text)) return `${text.slice(0, -3)}y`;
    if (/[^s]s$/.test(text)) return text.slice(0, -1);
    return `${text}s`;
};

// The Code capitalises its defined terms ("Event", "Healthcare Professional"), so those only
// match as written. A headword written in sentence case ("In kind") is ordinary wording and
// matches in any case ("In Kind", "in kind").
const isSentenceCase = (text) => {
    const words = text.split(/\s+/);
    return words.length > 1 && words.slice(1).every((word) => word === word.toLowerCase());
};

// Words of a term may be separated by spaces, line breaks or a hyphen ("Third-Party", "in-kind").
const normaliseTermText = (text) => text.replace(/[\s-]+/g, ' ');

export const createGlossaryEntry = (headword, definition = '') => {
    const term = headword.trim().replace(/[:;,-]+$/, '').trim();
    // "Healthcare Professional (HCP)" is used as "Healthcare Professional(s)" and "HCP(s)";
    // "Medical Technology or Medical Technologies" names two wordings of one term.
    const abbreviations = [];
    const name = term.replace(/\s*\(([^)]+)\)$/, (match, abbreviation) => {
        abbreviations.push(abbreviation.trim());
        return '';
    });
    // Short names a definition introduces in brackets: members (“Member Companies”).
    const aliases = [...definition.matchAll(/\(\s*[“"]([A-Z][^”"]*)[”"]\s*\)/g)].map((match) => match[1].trim());
    const forms = [...name.split(/\s+or\s+/), ...aliases, ...abbreviations].flatMap((text) => {
        const caseless = isSentenceCase(text);
        return [text, otherGrammaticalNumber(text)].map((form) => ({ text: form, caseless }));
    });

    return {
        id: term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        term,
        definition,
        forms,
    };
};

// A headword is a <strong> that opens its paragraph: <p><strong>Event:</strong> means …</p>.
const isHeadword = (strong) => {
    const block = strong.parentElement;
    return block?.tagName === 'P'
        && block.firstElementChild === strong
        && block.textContent.trimStart().startsWith(strong.textContent.trim());
};

const containsHeadword = (element) => [...element.querySelectorAll('strong')].some(isHeadword);

export const extractGlossaryMap = (data) => {
    const map = {};
    const glossaryChapter = data.find(c => c.id === 'glossary');
    if (!glossaryChapter || !glossaryChapter.sections) return map;
    const parser = new DOMParser();
    glossaryChapter.sections.forEach(section => {
        const doc = parser.parseFromString(section.legalText, 'text/html');
        doc.querySelectorAll('strong').forEach(el => {
            if (!isHeadword(el)) return;
            // A definition runs from its headword's paragraph up to the next headword,
            // so lists and closing paragraphs stay with the term they define.
            const blocks = [el.parentElement];
            let next = el.parentElement.nextElementSibling;
            while (next && !containsHeadword(next)) {
                blocks.push(next);
                next = next.nextElementSibling;
            }
            const entry = createGlossaryEntry(el.textContent, blocks.map((block) => block.outerHTML).join(''));
            if (entry.term.length > 1 && entry.term.length < 100) map[entry.id] = entry;
        });
    });
    return map;
};

const glossaryMatchers = new WeakMap();

const getGlossaryMatcher = (glossaryMap) => {
    if (glossaryMatchers.has(glossaryMap)) return glossaryMatchers.get(glossaryMap);

    const exactForms = new Map();
    const caselessForms = new Map();
    const alternatives = [];
    Object.values(glossaryMap)
        .flatMap((entry) => entry.forms.map((form) => ({ ...form, id: entry.id })))
        .sort((a, b) => b.text.length - a.text.length)
        .forEach(({ text, caseless, id }) => {
            const key = normaliseTermText(text);
            const forms = caseless ? caselessForms : exactForms;
            const formKey = caseless ? key.toLowerCase() : key;
            if (forms.has(formKey)) return;
            forms.set(formKey, id);
            alternatives.push(text.split(/[\s-]+/).map((word) => {
                const escaped = escapeRegExp(word);
                return caseless
                    ? escaped.replace(/[a-z]/gi, (letter) => `[${letter.toLowerCase()}${letter.toUpperCase()}]`)
                    : escaped;
            }).join('[\\s-]+'));
        });

    const matcher = alternatives.length === 0 ? null : {
        pattern: new RegExp(`\\b(?:${alternatives.join('|')})\\b`, 'g'),
        findEntryId: (match) => {
            const key = normaliseTermText(match);
            return exactForms.get(key) ?? caselessForms.get(key.toLowerCase());
        },
    };
    glossaryMatchers.set(glossaryMap, matcher);
    return matcher;
};

// Terms are not linked inside links, headings or buttons.
const UNLINKED_ELEMENT_TAG = /^<(\/?)(a|button|h[1-6])\b/i;

const GLOSSARY_TERM_CLASSES = 'glossary-term text-[#60269e] underline decoration-dotted underline-offset-4 cursor-pointer hover:bg-[#7654A1]/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7654A1] transition-colors rounded print:text-inherit print:no-underline';

// Links each glossary term at its first occurrence only. Pass the same `linkedTerms` set for
// every block of a section so a term already linked earlier in the section stays plain text.
export const processTextWithTerms = (htmlContent, glossaryMap, linkedTerms = new Set()) => {
    if (!htmlContent || !glossaryMap) return htmlContent;
    const matcher = getGlossaryMatcher(glossaryMap);
    if (!matcher) return htmlContent;
    const parts = htmlContent.split(/(<[^>]*>)/);
    let unlinkedDepth = 0;
    return parts.map(part => {
        if (part.startsWith('<')) {
            const tag = part.match(UNLINKED_ELEMENT_TAG);
            if (tag) unlinkedDepth = Math.max(0, unlinkedDepth + (tag[1] ? -1 : 1));
            return part;
        }
        if (unlinkedDepth > 0) return part;
        return part.replace(matcher.pattern, (match) => {
            const entryId = matcher.findEntryId(match);
            if (!entryId || linkedTerms.has(entryId)) return match;
            linkedTerms.add(entryId);
            return `<span class="${GLOSSARY_TERM_CLASSES}" role="button" tabindex="0" aria-haspopup="dialog" data-term="${entryId}">${match}</span>`;
        });
    }).join('');
};

export const processReaderHtml = (
    htmlContent,
    {
        query = '',
        highlight = false,
        glossaryMap = null,
        enableGlossary = true,
        linkedTerms,
    } = {},
) => {
    if (!htmlContent) return '';
    if (query && highlight) return highlightSearchTerm(htmlContent, query);
    if (enableGlossary && glossaryMap) {
        return processTextWithTerms(htmlContent, glossaryMap, linkedTerms);
    }
    return htmlContent;
};

// Splits the Glossary chapter's raw HTML into its definition blocks without a DOM: each
// headword paragraph starts a new block that runs up to the next headword (or the end of the
// text). Mirrors the DOM-based splitting in extractGlossaryMap above, for callers (like the
// search index) that only have raw HTML available.
export const splitGlossaryDefinitions = (html) => {
    if (!html) return [];
    const source = String(html);
    const headwordPattern = /<p><strong>([^<]+)<\/strong>/g;
    const matches = [...source.matchAll(headwordPattern)];

    return matches.map((match, index) => {
        const start = match.index;
        const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
        const blockHtml = source.slice(start, end);
        const rawHeadword = match[1];

        return {
            headword: rawHeadword.replace(/:\s*$/, ''),
            entry: createGlossaryEntry(rawHeadword, blockHtml),
            html: blockHtml,
        };
    });
};

// The Q&A's position within its section (not the printed "Q&A N" number, which renumbers
// globally when the Code is republished). Stable as long as a section's own Q&As don't change.
export const getQaAnchorId = (sectionId, index) => `${sectionId}-qa-${index + 1}`;

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
