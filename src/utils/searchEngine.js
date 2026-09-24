// The Code/Transparency search engine: builds an in-memory index from SearchDocument objects
// (see searchDocuments.js) and answers queries against it. Pure, deterministic, no DOM, no
// React, no Date/Math.random, no dependency on specific Code content -- everything content-
// specific (vocabulary, abbreviations, Glossary links, phrasebook targets) is derived from the
// `documents`/`glossary`/`phrasebook` passed in at build time.
//
// Ranking is a faithful port of the reference search prototype (BM25F per field, concept-level
// IDF over the union of member matches, best member per document, coverage^2, proximity, "your
// word first" one-way phrasebook weighting, chained abbreviations/Glossary links, the
// defined-term rule, and the relative cutoff). Quotes, completion, snippets, the highlight
// RegExp and the authoritative/app split are additive, as specified in the search work package
// brief; they do not change the base ranking math above.
import {
  boundedEditDistance,
  createWordResolver,
  spellingBudget,
  tokenizeWithOffsets,
  tokenizeWords,
} from './searchText.js';

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

export const SEARCH_RANKING = deepFreeze({
  k1: 1.2,
  fields: {
    title: { weight: 3, b: 0.5 },
    context: { weight: 0.6, b: 0.5 },
    body: { weight: 1, b: 0.75 },
  },
  weights: {
    same: 0.8,
    oneWay: 0.7,
    oneWayWhenWordInScope: 0.35,
    glossaryLink: 0.5,
    spelling1: 0.7,
    spelling2: 0.5,
  },
  rareWordMaxDocs: 2,
  glossaryLinkMaxDocShare: 0.04,
  glossaryLinkMinDocs: 3,
  ingGuardRatio: 5,
  proximity: 0.3,
  cutoff: 0.15,
  // Additions beyond the reference prototype (see the search work package brief).
  completion: { minLength: 3, maxWords: 8, weight: 0.6 },
  maxResults: 30,
  maxAppResults: 3,
});

// BM25F field order (title, context, body) -- matches Object.keys(SEARCH_RANKING.fields).
const FIELD_NAMES = Object.keys(SEARCH_RANKING.fields);
// Separate order used only to label which field a SearchHit's match came from.
const MATCHED_FIELD_ORDER = ['title', 'body', 'context'];

const EMPTY_SET = new Set();

const collapseWhitespace = (value) => String(value || '').trim().replace(/\s+/g, ' ');

// ---------------------------------------------------------------------------------------------
// Small, pure helpers ported directly from the reference prototype.
// ---------------------------------------------------------------------------------------------
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function countSequence(tokens, seq) {
  let n = 0;
  for (let i = 0; i <= tokens.length - seq.length; i += 1) {
    let ok = true;
    for (let j = 0; j < seq.length; j += 1) {
      if (tokens[i + j] !== seq[j]) { ok = false; break; }
    }
    if (ok) n += 1;
  }
  return n;
}

function sequencePositions(tokens, seq) {
  const out = [];
  for (let i = 0; i <= tokens.length - seq.length; i += 1) {
    let ok = true;
    for (let j = 0; j < seq.length; j += 1) {
      if (tokens[i + j] !== seq[j]) { ok = false; break; }
    }
    if (ok) out.push(i);
  }
  return out;
}

// Schwartz & Hearst (2003): find the long form immediately preceding a "(SHORT)" abbreviation.
function bestLongForm(shortForm, longForm) {
  let s = shortForm.length - 1;
  let l = longForm.length - 1;
  for (; s >= 0; s -= 1) {
    const c = shortForm[s].toLowerCase();
    if (!/[a-z0-9]/.test(c)) continue;
    while ((l >= 0 && longForm[l].toLowerCase() !== c)
      || (s === 0 && l > 0 && /[a-z0-9]/i.test(longForm[l - 1]))) {
      l -= 1;
    }
    if (l < 0) return null;
    l -= 1;
  }
  return longForm.slice(longForm.lastIndexOf(' ', l) + 1);
}

// ---------------------------------------------------------------------------------------------
// Quoting ("exact wording"): straight or curly double quotes. An unmatched quote is ignored
// (folded back into the surrounding plain text).
// ---------------------------------------------------------------------------------------------
const QUOTE_CHARACTERS = new Set(['"', '“', '”']);
const isQuoteChar = (character) => QUOTE_CHARACTERS.has(character);

function splitQuotedSegments(rawQuery) {
  const segments = [];
  let buffer = '';
  let i = 0;
  while (i < rawQuery.length) {
    const character = rawQuery[i];
    if (isQuoteChar(character)) {
      let close = -1;
      for (let j = i + 1; j < rawQuery.length; j += 1) {
        if (isQuoteChar(rawQuery[j])) { close = j; break; }
      }
      if (close === -1) {
        buffer += character;
        i += 1;
        continue;
      }
      if (buffer) { segments.push({ text: buffer, quoted: false }); buffer = ''; }
      segments.push({ text: rawQuery.slice(i + 1, close), quoted: true });
      i = close + 1;
      continue;
    }
    buffer += character;
    i += 1;
  }
  if (buffer) segments.push({ text: buffer, quoted: false });
  return segments;
}

// ---------------------------------------------------------------------------------------------
// Phrasebook parsing: defensive against a malformed src/data/search/phrasebook.json.
// ---------------------------------------------------------------------------------------------
const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');

function parsePhrasebookGroups(phrasebook) {
  const groups = phrasebook && Array.isArray(phrasebook.groups) ? phrasebook.groups : [];
  const parsed = [];
  for (const group of groups) {
    if (!group || typeof group !== 'object') continue;
    if (isStringArray(group.same)) {
      if (group.same.length >= 2) parsed.push({ kind: 'same', phrases: group.same });
      continue;
    }
    if (isStringArray(group.from) && isStringArray(group.to)) {
      if (group.from.length > 0 && group.to.length > 0) {
        parsed.push({ kind: 'oneWay', from: group.from, to: group.to });
      }
    }
    // Anything else (wrong shape, unknown keys) is skipped silently.
  }
  return parsed;
}

// ---------------------------------------------------------------------------------------------
// Index construction.
// ---------------------------------------------------------------------------------------------
export const createSearchIndex = (documents, { phrasebook = { groups: [] }, glossary = [], scope = 'code' } = {}) => {
  const docs = documents || [];

  // 1. Vocabulary: surface word -> frequency, across every field of every document.
  const vocabulary = new Map();
  for (const doc of docs) {
    for (const field of FIELD_NAMES) {
      for (const word of tokenizeWords(doc.fields[field])) {
        vocabulary.set(word, (vocabulary.get(word) || 0) + 1);
      }
    }
  }
  const vocabularyWords = [...vocabulary.keys()];

  const resolver = createWordResolver(vocabulary, { ingGuardRatio: SEARCH_RANKING.ingGuardRatio });
  const keyOf = resolver.key;
  // NOTE: keyOf must always be invoked as keyOf(word) -- never handed bare to Array#map, whose
  // (element, index) callback signature would otherwise feed the array index in as `depth`.
  const keysOf = (text) => tokenizeWords(text).map((word) => keyOf(word));

  // 2. Per-document field keys, plus body token offsets (for snippets) and average field
  // lengths (for BM25F length normalization). Mutates each doc with a `k` property, mirroring
  // the reference prototype.
  const averageLength = Object.fromEntries(FIELD_NAMES.map((field) => [field, 0]));
  const bodyTokensByDoc = [];
  docs.forEach((doc, di) => {
    doc.k = {};
    for (const field of FIELD_NAMES) {
      if (field === 'body') {
        const withOffsets = tokenizeWithOffsets(doc.fields.body);
        bodyTokensByDoc[di] = withOffsets;
        doc.k.body = withOffsets.map((token) => keyOf(token.word));
      } else {
        doc.k[field] = tokenizeWords(doc.fields[field]).map((word) => keyOf(word));
      }
      averageLength[field] += doc.k[field].length;
    }
  });
  for (const field of FIELD_NAMES) averageLength[field] /= Math.max(1, docs.length);

  // 3. Postings: key -> Set(doc index).
  const postings = new Map();
  docs.forEach((doc, di) => {
    for (const field of FIELD_NAMES) {
      for (const key of doc.k[field]) {
        if (!postings.has(key)) postings.set(key, new Set());
        postings.get(key).add(di);
      }
    }
  });
  const docFrequency = (key) => (postings.get(key)?.size) || 0;
  const isIndexedKey = (key) => postings.has(key);
  const resolveWord = (word) => resolver.resolve(word, isIndexedKey);
  const resolvedPhrase = (text) => tokenizeWords(text).map(resolveWord).join(' ');

  // Resolved key/phrase -> human display text, for explanations. First source to claim a key
  // wins (abbreviations, then Glossary links, then the phrasebook -- the same order they are
  // derived in below).
  const displayText = new Map();
  const registerDisplayText = (resolvedKey, humanText) => {
    if (resolvedKey && humanText && !displayText.has(resolvedKey)) displayText.set(resolvedKey, humanText);
  };

  // 4. Abbreviations: every "Long Form (ABBR)" anywhere in the text, plus Glossary headwords.
  const equivalents = new Map();
  const addEquivalent = (a, b) => {
    if (!a || !b || a === b) return;
    if (!equivalents.has(a)) equivalents.set(a, new Set());
    equivalents.get(a).add(b);
  };
  const abbreviationSources = [
    ...docs.flatMap((doc) => [doc.fields.title, doc.fields.body]),
    ...glossary.map((entry) => entry.headword),
  ];
  for (const text of abbreviationSources) {
    const source = String(text || '');
    for (const match of source.matchAll(/\(([A-Za-z][A-Za-z0-9-]{1,9})\)/g)) {
      const shortForm = match[1];
      if (!/[A-Z]/.test(shortForm)) continue;
      const preceding = source.slice(0, match.index).trim().split(/\s+/);
      const window = preceding.slice(-Math.min(shortForm.length + 5, shortForm.length * 2)).join(' ');
      const longForm = bestLongForm(shortForm, window);
      if (!longForm || longForm.split(/\s+/).length < 2) continue;
      const shortKey = resolvedPhrase(shortForm);
      const longKey = resolvedPhrase(longForm);
      addEquivalent(shortKey, longKey);
      addEquivalent(longKey, shortKey);
      registerDisplayText(shortKey, shortForm);
      registerDisplayText(longKey, longForm);
    }
  }

  // 5. Glossary links: a rare word, appearing in exactly one definition outside a negated
  // clause, points to that defined term.
  const maxLinkDocs = Math.max(
    SEARCH_RANKING.glossaryLinkMinDocs,
    Math.ceil(docs.length * SEARCH_RANKING.glossaryLinkMaxDocShare),
  );
  const termWords = new Set(glossary.flatMap((entry) => (entry.forms || []).flatMap((form) => keysOf(form))));
  const seenIn = new Map();
  for (const entry of glossary) {
    const clauses = String(entry.text || '')
      .replace(/\b(?:but )?(?:are |is )?not limited to\b/gi, ' ')
      .split(/[.;:(),]/)
      .filter((clause) => !/\b(not|never|except|excluding|unless)\b|other than/i.test(clause));
    for (const word of new Set(clauses.flatMap((clause) => keysOf(clause)))) {
      if (!seenIn.has(word)) seenIn.set(word, new Set());
      seenIn.get(word).add(entry);
    }
  }
  const glossaryLinks = new Map();
  for (const [word, definitions] of seenIn) {
    if (definitions.size !== 1 || termWords.has(word) || /\d/.test(word) || docFrequency(word) > maxLinkDocs) continue;
    const [entry] = definitions;
    const target = resolvedPhrase(String(entry.term || '').replace(/\s*\([^)]*\)$/, ''));
    glossaryLinks.set(word, target);
    registerDisplayText(target, entry.term);
  }

  // 6. Phrasebook rules, compiled against this scope's vocabulary (a target like "spouse" is
  // resolved to how this scope actually spells it, e.g. "spouses").
  const rules = [];
  for (const group of parsePhrasebookGroups(phrasebook)) {
    if (group.kind === 'same') {
      const validPhrases = group.phrases.filter((phrase) => resolvedPhrase(phrase).length > 0);
      if (validPhrases.length < 2) continue;
      for (const phrase of validPhrases) {
        const to = validPhrases.filter((other) => other !== phrase).map((other) => resolvedPhrase(other));
        if (to.length === 0) continue;
        const from = resolvedPhrase(phrase);
        rules.push({ from, to, kind: 'same' });
        registerDisplayText(from, phrase);
      }
    } else {
      const validTo = group.to.filter((phrase) => resolvedPhrase(phrase).length > 0);
      if (validTo.length === 0) continue;
      const resolvedTo = validTo.map((phrase) => resolvedPhrase(phrase));
      validTo.forEach((phrase) => registerDisplayText(resolvedPhrase(phrase), phrase));
      for (const phrase of group.from) {
        const from = resolvedPhrase(phrase);
        if (!from) continue;
        rules.push({ from, to: resolvedTo, kind: 'oneWay' });
        registerDisplayText(from, phrase);
      }
    }
  }
  const phrasebookWords = new Set(rules.flatMap((rule) => rule.from.split(' ')));

  // 7. Defined terms: the whole query equals a Glossary term, form or abbreviation.
  const definedTerms = new Map();
  for (const doc of docs) {
    if (doc.type !== 'definition') continue;
    for (const term of doc.terms || []) definedTerms.set(keysOf(term).join(' '), doc);
  }

  // 8. Surface forms per key ("guest" -> guest, guests), for the reader-highlight RegExp.
  const surfaceFormsByKey = new Map();
  for (const surface of vocabularyWords) {
    const key = keyOf(surface);
    if (!surfaceFormsByKey.has(key)) surfaceFormsByKey.set(key, []);
    surfaceFormsByKey.get(key).push(surface);
  }

  return {
    scope,
    docs,
    fieldNames: FIELD_NAMES,
    averageLength,
    postings,
    docFrequency,
    vocabulary,
    vocabularyWords,
    key: keyOf,
    resolveWord,
    rules,
    phrasebookWords,
    glossaryLinks,
    equivalents,
    definedTerms,
    displayText,
    bodyTokensByDoc,
    surfaceFormsByKey,
  };
};

// ---------------------------------------------------------------------------------------------
// Query-time correction (unknown words only) -- ported directly from the prototype.
// ---------------------------------------------------------------------------------------------
function correctToken(word, index) {
  const key = index.resolveWord(word);
  if (index.postings.has(key) || index.phrasebookWords.has(key)) {
    return {
      word, key, weight: 1, source: 'query',
    };
  }
  const budget = spellingBudget(word);
  let bestDistance = budget + 1;
  let bestCandidate = null;
  if (budget) {
    for (const candidate of [...index.vocabularyWords, ...index.phrasebookWords]) {
      const distance = boundedEditDistance(word, candidate, budget);
      const better = distance < bestDistance
        || (distance === bestDistance
          && (index.vocabulary.get(candidate) || 0) > (index.vocabulary.get(bestCandidate) || 0));
      if (better) { bestDistance = distance; bestCandidate = candidate; }
    }
  }
  if (bestCandidate && bestDistance <= budget) {
    return {
      word,
      key: index.resolveWord(bestCandidate),
      weight: bestDistance === 1 ? SEARCH_RANKING.weights.spelling1 : SEARCH_RANKING.weights.spelling2,
      source: 'spelling',
    };
  }
  return {
    word, key, weight: 1, source: 'query',
  };
}

const displayFor = (index, resolvedText, fallback) => index.displayText.get(resolvedText) || fallback;

// One position's concept: the longest phrasebook phrase starting here (else the single word),
// chained once through abbreviations and Glossary links (two passes, half weight for links).
function buildStandardConceptAt(corrected, keysInQuery, i, index) {
  let rule = null;
  for (const candidateRule of index.rules) {
    const len = candidateRule.from.split(' ').length;
    if (keysInQuery.slice(i, i + len).join(' ') === candidateRule.from
      && (!rule || len > rule.from.split(' ').length)) {
      rule = candidateRule;
    }
  }
  const length = rule ? rule.from.split(' ').length : 1;
  const literal = rule ? rule.from : keysInQuery[i];
  // A plain, uncorrected word is shown as typed; a phrasebook phrase or a spelling correction
  // is shown as its resolved, human display text (never the raw typo).
  const literalText = (!rule && corrected[i].source === 'query')
    ? corrected[i].word
    : displayFor(index, literal, literal);
  const members = new Map([[literal, { weight: corrected[i].weight, source: corrected[i].source, text: literalText }]]);
  const wordInScope = index.docFrequency(literal.split(' ')[0]) > SEARCH_RANKING.rareWordMaxDocs;

  if (rule) {
    for (const candidateRule of index.rules.filter((r) => r.from === rule.from)) {
      const weightFactor = candidateRule.kind === 'same'
        ? SEARCH_RANKING.weights.same
        : (wordInScope ? SEARCH_RANKING.weights.oneWayWhenWordInScope : SEARCH_RANKING.weights.oneWay);
      for (const to of candidateRule.to) {
        if (!members.has(to)) {
          members.set(to, {
            weight: corrected[i].weight * weightFactor,
            source: 'phrasebook',
            text: displayFor(index, to, to),
          });
        }
      }
    }
  }

  for (let pass = 0; pass < 2; pass += 1) {
    for (const [member, info] of [...members]) {
      for (const equivalent of index.equivalents.get(member) || []) {
        if (!members.has(equivalent)) {
          members.set(equivalent, { weight: info.weight, source: 'abbreviation', text: displayFor(index, equivalent, equivalent) });
        }
      }
      const link = index.glossaryLinks.get(member);
      if (link && !members.has(link)) {
        members.set(link, {
          weight: info.weight * SEARCH_RANKING.weights.glossaryLink,
          source: 'glossary',
          text: displayFor(index, link, link),
        });
      }
    }
  }

  const label = corrected.slice(i, i + length).map((c) => c.word).join(' ');
  return {
    length,
    concept: {
      quoted: false,
      label,
      members: [...members].map(([resolvedKey, info]) => ({ seq: resolvedKey.split(' '), ...info })),
    },
  };
}

// A quoted segment becomes one concept with a single member: the phrase of resolved keys, no
// spelling correction and no expansions.
function buildQuotedConcept(innerText, index) {
  const words = tokenizeWords(innerText);
  if (words.length === 0) return null;
  const seq = words.map((word) => index.resolveWord(word));
  return {
    quoted: true,
    label: collapseWhitespace(innerText),
    members: [{
      seq, text: seq.join(' '), weight: 1, source: 'query',
    }],
  };
}

// The last unknown, unquoted word (>= 3 letters) completes to up to 8 vocabulary words sharing
// its prefix, frequency desc then alphabetical.
function buildCompletionConcept(word, index) {
  const candidates = index.vocabularyWords
    .filter((surface) => surface.startsWith(word))
    .sort((a, b) => {
      const freqDiff = (index.vocabulary.get(b) || 0) - (index.vocabulary.get(a) || 0);
      if (freqDiff !== 0) return freqDiff;
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    })
    .slice(0, SEARCH_RANKING.completion.maxWords);
  if (candidates.length === 0) return null;

  const members = new Map();
  for (const candidate of candidates) {
    const key = index.key(candidate);
    if (!members.has(key)) {
      members.set(key, { weight: SEARCH_RANKING.completion.weight, source: 'completion', text: candidate });
    }
  }
  return {
    quoted: false,
    label: word,
    members: [...members].map(([resolvedKey, info]) => ({ seq: resolvedKey.split(' '), ...info })),
  };
}

// Splits the raw query into quoted/unquoted segments and builds the flat list of query
// concepts, applying completion (only to the last unquoted word, only while it is still being
// typed) and quoting along the way. Also returns a flat resolved-key sequence for the
// defined-term rule.
function planQuery(index, rawQuery) {
  const segments = splitQuotedSegments(rawQuery);
  const endsWithBoundary = /[\s"“”]$/.test(rawQuery);
  let lastUnquotedSegmentIndex = -1;
  segments.forEach((segment, idx) => {
    if (!segment.quoted) lastUnquotedSegmentIndex = idx;
  });

  const concepts = [];
  const flatKeys = [];
  let exact = false;

  segments.forEach((segment, segmentIndex) => {
    if (segment.quoted) {
      exact = true;
      const concept = buildQuotedConcept(segment.text, index);
      if (concept) {
        concepts.push(concept);
        flatKeys.push(...concept.members[0].seq);
      }
      return;
    }

    const tokens = tokenizeWords(segment.text);
    if (tokens.length === 0) return;
    const corrected = tokens.map((word) => correctToken(word, index));
    const keysInQuery = corrected.map((c) => c.key);
    flatKeys.push(...keysInQuery);

    const lastIndex = tokens.length - 1;
    let completionConcept = null;
    if (segmentIndex === lastUnquotedSegmentIndex && !endsWithBoundary) {
      const word = tokens[lastIndex];
      if (word.length >= SEARCH_RANKING.completion.minLength) {
        const key = keysInQuery[lastIndex];
        const known = index.postings.has(key) || index.phrasebookWords.has(key);
        if (!known) completionConcept = buildCompletionConcept(word, index);
      }
    }

    let i = 0;
    while (i < tokens.length) {
      if (completionConcept && i === lastIndex) {
        concepts.push(completionConcept);
        i += 1;
        continue;
      }
      const { length, concept } = buildStandardConceptAt(corrected, keysInQuery, i, index);
      concepts.push(concept);
      i += length;
    }
  });

  return { concepts, exact, flatKeys };
}

// ---------------------------------------------------------------------------------------------
// Scoring: BM25F per concept, IDF over the union of matching documents, best member per
// document, coverage^2 * proximity. Ported directly from the reference prototype.
// ---------------------------------------------------------------------------------------------
function scoreQuery(index, concepts) {
  const N = index.docs.length;
  const perDoc = new Map();

  concepts.forEach((concept, ci) => {
    const hits = new Map();
    for (const member of concept.members) {
      const candidateDocs = index.postings.get(member.seq[0]) || EMPTY_SET;
      for (const di of candidateDocs) {
        const doc = index.docs[di];
        let tf = 0;
        for (const field of index.fieldNames) {
          const n = countSequence(doc.k[field], member.seq);
          if (n) {
            const { weight, b } = SEARCH_RANKING.fields[field];
            tf += (weight * n) / (1 - b + (b * doc.k[field].length) / index.averageLength[field]);
          }
        }
        if (tf) {
          const s = member.weight * tf;
          const previous = hits.get(di);
          if (!previous || s > previous.s) hits.set(di, { s, member });
        }
      }
    }
    const idf = Math.log(1 + (N - hits.size + 0.5) / (hits.size + 0.5));
    for (const [di, h] of hits) {
      if (!perDoc.has(di)) perDoc.set(di, new Map());
      perDoc.get(di).set(ci, {
        score: (idf * h.s * (SEARCH_RANKING.k1 + 1)) / (h.s + SEARCH_RANKING.k1),
        member: h.member,
      });
    }
  });

  const effectiveConcepts = concepts.filter((_, ci) => [...perDoc.values()].some((m) => m.has(ci))).length;

  const hits = [];
  for (const [di, matched] of perDoc) {
    const doc = index.docs[di];
    let base = 0;
    for (const v of matched.values()) base += v.score;
    let proximity = 1;
    if (matched.size >= 2) {
      let bestSpan = Infinity;
      for (const field of ['title', 'body']) {
        const events = [];
        for (const [ci, v] of matched) {
          for (const p of sequencePositions(doc.k[field], v.member.seq)) events.push([p, ci]);
        }
        events.sort((a, b) => a[0] - b[0]);
        const counts = new Map();
        let left = 0;
        for (let right = 0; right < events.length; right += 1) {
          counts.set(events[right][1], (counts.get(events[right][1]) || 0) + 1);
          while (counts.size === matched.size) {
            bestSpan = Math.min(bestSpan, events[right][0] - events[left][0] + 1);
            const remaining = counts.get(events[left][1]) - 1;
            if (remaining) counts.set(events[left][1], remaining); else counts.delete(events[left][1]);
            left += 1;
          }
        }
      }
      if (bestSpan < Infinity) proximity = 1 + (SEARCH_RANKING.proximity * matched.size) / bestSpan;
    }
    const coverage = matched.size / Math.max(1, effectiveConcepts);
    hits.push({
      doc, di, matched, coverage, proximity, score: base * coverage * coverage * proximity,
    });
  }
  hits.sort((a, b) => b.score - a.score);

  return { hits, effectiveConcepts };
}

// Does this member's sequence appear anywhere (any field, any document) in this scope?
function memberMatchesScope(index, seq) {
  const candidateDocs = index.postings.get(seq[0]);
  if (!candidateDocs || candidateDocs.size === 0) return false;
  if (seq.length === 1) return true;
  for (const di of candidateDocs) {
    const doc = index.docs[di];
    for (const field of index.fieldNames) {
      if (countSequence(doc.k[field], seq) > 0) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Snippets: a body-token window covering the most distinct matched concepts, rendered from the
// original body text so highlights line up with real characters.
// ---------------------------------------------------------------------------------------------
const SNIPPET_WINDOW_TOKENS = 24;
const SNIPPET_LEAD_TOKENS = 3;
const SNIPPET_MAX_CHARS = 220;
const SNIPPET_CONTEXT_CHARS = 200;

function buildSnippet(doc, di, matched, index) {
  const body = doc.fields.body || '';
  const trimmedBody = body.trim();
  if (!trimmedBody) return null;

  const bodyTokens = index.bodyTokensByDoc[di] || [];
  const occurrences = [];
  for (const [ci, info] of matched) {
    const { seq } = info.member;
    for (const position of sequencePositions(doc.k.body, seq)) {
      occurrences.push({
        ci, start: position, end: position + seq.length,
      });
    }
  }

  if (occurrences.length === 0 || bodyTokens.length === 0) {
    const cut = trimmedBody.length > SNIPPET_CONTEXT_CHARS
      ? `${trimmedBody.slice(0, SNIPPET_CONTEXT_CHARS).trimEnd()}…`
      : trimmedBody;
    return { text: cut, highlights: [] };
  }

  // Choose the 24-token window covering the most distinct concepts (earliest start on ties).
  const candidateStarts = [...new Set(
    occurrences.flatMap((o) => [o.start, Math.max(0, o.end - SNIPPET_WINDOW_TOKENS)]),
  )].sort((a, b) => a - b);

  let bestStart = candidateStarts[0];
  let bestCoverage = -1;
  for (const start of candidateStarts) {
    const end = start + SNIPPET_WINDOW_TOKENS;
    const covered = new Set(occurrences.filter((o) => o.start >= start && o.end <= end).map((o) => o.ci));
    if (covered.size > bestCoverage) {
      bestCoverage = covered.size;
      bestStart = start;
    }
  }

  const windowEnd = bestStart + SNIPPET_WINDOW_TOKENS;
  const inWindow = occurrences.filter((o) => o.start >= bestStart && o.end <= windowEnd);
  const anchorPool = inWindow.length ? inWindow : occurrences;
  const firstMatchedPosition = Math.min(...anchorPool.map((o) => o.start));

  // Render starting 3 tokens before the first match (clamped), extending to ~220 chars, cut at
  // token boundaries.
  const startTokenIndex = Math.max(0, firstMatchedPosition - SNIPPET_LEAD_TOKENS);
  const startChar = bodyTokens[startTokenIndex].start;
  let endTokenIndex = startTokenIndex;
  let endChar = bodyTokens[startTokenIndex].end;
  for (let t = startTokenIndex; t < bodyTokens.length; t += 1) {
    if (t > startTokenIndex && bodyTokens[t].end - startChar > SNIPPET_MAX_CHARS) break;
    endTokenIndex = t;
    endChar = bodyTokens[t].end;
  }

  const prefix = startTokenIndex > 0 ? '…' : '';
  const truncatedEnd = endTokenIndex < bodyTokens.length - 1;
  const core = body.slice(startChar, endChar);
  const text = `${prefix}${core}${truncatedEnd ? '…' : ''}`;

  // Offsets are relative to `text` itself, including any leading ellipsis.
  const offset = prefix.length - startChar;
  const highlights = occurrences
    .filter((o) => o.start >= startTokenIndex && o.end - 1 <= endTokenIndex)
    .map((o) => [bodyTokens[o.start].start + offset, bodyTokens[o.end - 1].end + offset])
    .sort((a, b) => a[0] - b[0]);

  return { text, highlights };
}

// ---------------------------------------------------------------------------------------------
// Highlight RegExp: covers every member that matched at least one document in this scope, so
// the reader highlights the words that actually matched (including expansions), not the raw
// query.
// ---------------------------------------------------------------------------------------------
const PHRASE_CONNECTOR = '(?:[\\s-]+[a-z]+){0,2}?[\\s-]+';

function surfaceFormsForKey(index, keyWord) {
  return index.surfaceFormsByKey.get(keyWord) || [keyWord];
}

function collectAlternatives(index, seq) {
  if (seq.length === 1) {
    return surfaceFormsForKey(index, seq[0]).map(escapeRegExp);
  }
  const phrasePattern = seq.map((word) => {
    const forms = surfaceFormsForKey(index, word).map(escapeRegExp);
    return forms.length > 1 ? `(?:${forms.join('|')})` : forms[0];
  }).join(PHRASE_CONNECTOR);
  return [phrasePattern];
}

function buildHighlightRegExp(index, concepts, matchesScope) {
  const alternatives = new Set();
  const seenSeq = new Set();
  for (const concept of concepts) {
    for (const member of concept.members) {
      const seqKey = member.seq.join(' ');
      if (seenSeq.has(seqKey)) continue;
      seenSeq.add(seqKey);
      if (!matchesScope(member.seq)) continue;
      for (const alternative of collectAlternatives(index, member.seq)) {
        if (alternative) alternatives.add(alternative);
      }
    }
  }
  if (alternatives.size === 0) return null;
  const sorted = [...alternatives].sort((a, b) => b.length - a.length);
  return new RegExp(`\\b(${sorted.join('|')})\\b`, 'gi');
}

// ---------------------------------------------------------------------------------------------
// SearchHit shaping.
// ---------------------------------------------------------------------------------------------
function fieldFor(doc, seq) {
  for (const field of MATCHED_FIELD_ORDER) {
    if (countSequence(doc.k[field], seq) > 0) return field;
  }
  return 'body';
}

function toSearchHit(hit, index, concepts) {
  const {
    doc, di, score, coverage, proximity,
  } = hit;
  const matched = hit.matched instanceof Map ? hit.matched : new Map();
  const sortedMatches = [...matched].sort((a, b) => a[0] - b[0]);

  return {
    id: doc.id,
    type: doc.type,
    label: doc.label,
    title: doc.title,
    location: doc.location,
    target: doc.target,
    score,
    coverage,
    proximity,
    snippet: buildSnippet(doc, di, matched, index),
    matched: sortedMatches.map(([ci, m]) => ({
      concept: concepts[ci]?.label ?? null,
      text: m.member.text,
      source: m.member.source,
      field: fieldFor(doc, m.member.seq),
    })),
  };
}

// ---------------------------------------------------------------------------------------------
// runSearch.
// ---------------------------------------------------------------------------------------------
const emptyResponse = (query, scope, exact = false) => ({
  query,
  scope,
  exact,
  shortcut: null,
  concepts: [],
  corrections: [],
  results: [],
  appResults: [],
  allTermsMatched: false,
  highlight: null,
});

const QA_NUMBER_PATTERN = /^\s*q\s*&?\s*a\s*(\d+)\s*$/i;

export const runSearch = (index, rawQueryInput) => {
  const rawQuery = String(rawQueryInput ?? '');
  const query = rawQuery.trim();
  const { scope } = index;

  if (!query) return emptyResponse(query, scope);

  const qaMatch = QA_NUMBER_PATTERN.exec(query);
  if (qaMatch) {
    const matches = index.docs.filter((doc) => doc.authoritative && doc.qaNumber === qaMatch[1]);
    if (matches.length > 0) {
      const results = matches.map((doc) => ({
        id: doc.id,
        type: doc.type,
        label: doc.label,
        title: doc.title,
        location: doc.location,
        target: doc.target,
        score: Infinity,
        coverage: 1,
        proximity: 1,
        snippet: null,
        matched: [],
      }));
      return {
        query,
        scope,
        exact: false,
        shortcut: 'qa-number',
        concepts: [],
        corrections: [],
        results,
        appResults: [],
        allTermsMatched: true,
        highlight: null,
      };
    }
  }

  const { concepts, exact, flatKeys } = planQuery(index, rawQuery);
  if (concepts.length === 0) return emptyResponse(query, scope, exact);

  const { hits } = scoreQuery(index, concepts);

  const definedDoc = index.definedTerms.get(flatKeys.join(' '));
  if (definedDoc) {
    const at = hits.findIndex((h) => h.doc === definedDoc);
    const promoted = at >= 0 ? hits.splice(at, 1)[0] : {
      doc: definedDoc,
      di: index.docs.indexOf(definedDoc),
      matched: new Map(),
      coverage: 1,
      proximity: 1,
      score: 0,
    };
    promoted.score = (hits[0]?.score || 1) + 1;
    hits.unshift(promoted);
  }

  const authoritativeHits = hits.filter((h) => h.doc.authoritative);
  const appHits = hits.filter((h) => !h.doc.authoritative);
  const topAuthoritative = authoritativeHits[0]?.score || 0;
  const topApp = appHits[0]?.score || 0;

  const results = authoritativeHits
    .filter((h) => h.score >= SEARCH_RANKING.cutoff * topAuthoritative)
    .slice(0, SEARCH_RANKING.maxResults)
    .map((h) => toSearchHit(h, index, concepts));
  const appResults = appHits
    .filter((h) => h.score >= SEARCH_RANKING.cutoff * topApp)
    .slice(0, SEARCH_RANKING.maxAppResults)
    .map((h) => toSearchHit(h, index, concepts));

  // Whether a member occurs anywhere in this scope, computed once per member for this query.
  const scopeMatches = new Map();
  const matchesScope = (seq) => {
    const seqKey = seq.join(' ');
    if (!scopeMatches.has(seqKey)) scopeMatches.set(seqKey, memberMatchesScope(index, seq));
    return scopeMatches.get(seqKey);
  };

  const reportedConcepts = concepts.map((concept) => {
    const members = concept.members.map((member) => ({
      text: member.text,
      source: member.source,
      weight: member.weight,
      matched: matchesScope(member.seq),
    }));
    return {
      label: concept.label,
      quoted: concept.quoted,
      matched: members.some((member) => member.matched),
      members,
    };
  });

  const corrections = concepts
    .filter((concept) => !concept.quoted && concept.members[0]?.source === 'spelling')
    .map((concept) => ({ from: concept.label, to: concept.members[0].text }));

  return {
    query,
    scope,
    exact,
    shortcut: null,
    concepts: reportedConcepts,
    corrections,
    results,
    appResults,
    allTermsMatched: results.some((h) => h.coverage === 1),
    highlight: buildHighlightRegExp(index, concepts, matchesScope),
  };
};
