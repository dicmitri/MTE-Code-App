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
  isContentWord,
  spellingBudget,
  tokenizeAllWithOffsets,
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
    oneWayWhenWordInScope: 0.3,
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

// ---------------------------------------------------------------------------------------------
// Members. `full` holds every key of a word or phrase, `seq` only its content words. A phrase
// with a small word in it ("in kind", "at no cost"), and any quoted phrase, is matched word for
// word on the full token stream (`doc.fk`), small words included. Everything else is matched on
// the content words (`doc.k`), exactly as before. Positions are always reported in content-word
// units, so proximity and snippets compare like with like.
// ---------------------------------------------------------------------------------------------
function makeMember(key, info, { quoted = false } = {}) {
  const full = key.split(' ');
  const seq = full.filter(isContentWord);
  if (seq.length === 0) return null;
  const matchOn = seq.length !== full.length || (quoted && full.length > 1) ? 'full' : 'content';
  return {
    ...info, full, seq, matchOn, lead: full.findIndex(isContentWord),
  };
}

const memberId = (member) => `${member.matchOn}:${member.full.join(' ')}`;

function memberCount(doc, field, member) {
  return member.matchOn === 'full'
    ? countSequence(doc.fk[field], member.full)
    : countSequence(doc.k[field], member.seq);
}

function memberPositions(doc, field, member) {
  if (member.matchOn !== 'full') return sequencePositions(doc.k[field], member.seq);
  return sequencePositions(doc.fk[field], member.full).map((p) => doc.f2c[field][p + member.lead]);
}

// Body occurrences for snippets: content-word start/end (end exclusive) plus the character
// range to highlight, which for a phrase includes its small words ("in kind", not "kind").
function memberBodyOccurrences(doc, di, member, index) {
  if (member.matchOn !== 'full') {
    const tokens = index.bodyTokensByDoc[di];
    return sequencePositions(doc.k.body, member.seq).map((p) => ({
      start: p,
      end: p + member.seq.length,
      charStart: tokens[p].start,
      charEnd: tokens[p + member.seq.length - 1].end,
    }));
  }
  const tokens = index.bodyFullTokensByDoc[di];
  return sequencePositions(doc.fk.body, member.full).map((p) => {
    const contentPositions = doc.f2c.body.slice(p, p + member.full.length).filter((c) => c >= 0);
    return {
      start: contentPositions[0],
      end: contentPositions[contentPositions.length - 1] + 1,
      charStart: tokens[p].start,
      charEnd: tokens[p + member.full.length - 1].end,
    };
  });
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

  // 1. Tokens (every word, small words flagged) and the vocabulary: content word -> frequency,
  // across every field of every document.
  const fieldTokens = docs.map((doc) => Object.fromEntries(
    FIELD_NAMES.map((field) => [field, tokenizeAllWithOffsets(doc.fields[field])]),
  ));
  const vocabulary = new Map();
  for (const tokensByField of fieldTokens) {
    for (const field of FIELD_NAMES) {
      for (const token of tokensByField[field]) {
        if (token.content) vocabulary.set(token.word, (vocabulary.get(token.word) || 0) + 1);
      }
    }
  }
  const vocabularyWords = [...vocabulary.keys()];

  const resolver = createWordResolver(vocabulary, { ingGuardRatio: SEARCH_RANKING.ingGuardRatio });
  const keyOf = resolver.key;
  // NOTE: keyOf must always be invoked as keyOf(word) -- never handed bare to Array#map, whose
  // (element, index) callback signature would otherwise feed the array index in as `depth`.
  const keysOf = (text) => tokenizeWords(text).map((word) => keyOf(word));

  // 2. Per-document field keys, body token offsets (for snippets) and average field lengths
  // (for BM25F length normalization). Mutates each doc: `k` holds the content words (lengths,
  // postings, proximity, as in the reference prototype), `fk` every word including small words
  // (for phrases), and `f2c` maps each `fk` position to its `k` position (-1 for a small word).
  const averageLength = Object.fromEntries(FIELD_NAMES.map((field) => [field, 0]));
  const bodyTokensByDoc = [];
  const bodyFullTokensByDoc = [];
  docs.forEach((doc, di) => {
    doc.k = {};
    doc.fk = {};
    doc.f2c = {};
    for (const field of FIELD_NAMES) {
      const tokens = fieldTokens[di][field];
      const k = [];
      const fk = [];
      const f2c = [];
      for (const token of tokens) {
        if (token.content) {
          const key = keyOf(token.word);
          f2c.push(k.length);
          k.push(key);
          fk.push(key);
        } else {
          f2c.push(-1);
          fk.push(token.word);
        }
      }
      doc.k[field] = k;
      doc.fk[field] = fk;
      doc.f2c[field] = f2c;
      if (field === 'body') {
        bodyFullTokensByDoc[di] = tokens;
        bodyTokensByDoc[di] = tokens.filter((token) => token.content);
      }
      averageLength[field] += k.length;
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
  // A phrase's key: content words resolved like query words, small words kept as they are, so
  // "in kind" stays a two-word phrase instead of collapsing to "kind". Empty when the text has
  // no content word at all.
  const phraseKey = (text) => {
    const tokens = tokenizeAllWithOffsets(text);
    if (!tokens.some((token) => token.content)) return '';
    return tokens.map((token) => (token.content ? resolveWord(token.word) : token.word)).join(' ');
  };
  // Every word of a term, keyed like the documents themselves (for the defined-term rule).
  const fullKeysOf = (text) => tokenizeAllWithOffsets(text)
    .map((token) => (token.content ? keyOf(token.word) : token.word));

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
      const shortKey = phraseKey(shortForm);
      const longKey = phraseKey(longForm);
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
    const target = phraseKey(String(entry.term || '').replace(/\s*\([^)]*\)$/, ''));
    if (!target) continue;
    glossaryLinks.set(word, target);
    registerDisplayText(target, entry.term);
  }

  // 6. Phrasebook rules, compiled against this scope's vocabulary (a target like "spouse" is
  // resolved to how this scope actually spells it, e.g. "spouses").
  const rules = [];
  for (const group of parsePhrasebookGroups(phrasebook)) {
    if (group.kind === 'same') {
      const validPhrases = group.phrases.filter((phrase) => phraseKey(phrase).length > 0);
      if (validPhrases.length < 2) continue;
      for (const phrase of validPhrases) {
        const to = validPhrases.filter((other) => other !== phrase).map((other) => phraseKey(other));
        if (to.length === 0) continue;
        const from = phraseKey(phrase);
        rules.push({ from, to, kind: 'same' });
        registerDisplayText(from, phrase);
      }
    } else {
      const validTo = group.to.filter((phrase) => phraseKey(phrase).length > 0);
      if (validTo.length === 0) continue;
      const resolvedTo = validTo.map((phrase) => phraseKey(phrase));
      validTo.forEach((phrase) => registerDisplayText(phraseKey(phrase), phrase));
      for (const phrase of group.from) {
        const from = phraseKey(phrase);
        if (!from) continue;
        rules.push({ from, to: resolvedTo, kind: 'oneWay' });
        registerDisplayText(from, phrase);
      }
    }
  }
  // Content words only: a typo must never be "corrected" into a small word.
  const phrasebookWords = new Set(rules.flatMap((rule) => rule.from.split(' ').filter(isContentWord)));

  // Phrases a query can contain (phrasebook "from" phrases, abbreviation long forms), with the
  // number of small words before their first content word, for lining them up with the query.
  const toCandidate = (phrase, kind) => {
    const full = phrase.split(' ');
    return {
      phrase,
      full,
      kind,
      lead: full.findIndex(isContentWord),
      contentLength: full.filter(isContentWord).length,
    };
  };
  const phraseCandidates = [
    ...[...new Set(rules.map((rule) => rule.from))].map((from) => toCandidate(from, 'rule')),
    ...[...equivalents.keys()].filter((key) => key.includes(' ')).map((key) => toCandidate(key, 'longForm')),
  ];

  // 7. Defined terms: the whole query equals a Glossary term, form or abbreviation (every word,
  // small words included: "in kind" is a defined term, "kind" is not).
  const definedTerms = new Map();
  for (const doc of docs) {
    if (doc.type !== 'definition') continue;
    for (const term of doc.terms || []) definedTerms.set(fullKeysOf(term).join(' '), doc);
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
    phraseCandidates,
    definedTerms,
    displayText,
    bodyTokensByDoc,
    bodyFullTokensByDoc,
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

// One position's concept: the longest phrasebook phrase or abbreviation long form whose words,
// small words included, line up with the typed words here (else the single word), chained once
// through abbreviations and Glossary links (two passes, half weight for links). A phrasebook
// phrase beats a long form of the same length.
function buildStandardConceptAt(ctx, i, index) {
  const {
    corrected, keysInQuery, fullKeys, fullWords, fullIndexOfContent,
  } = ctx;
  const at = fullIndexOfContent[i];
  let best = null;
  let bestStart = at;
  for (const candidate of index.phraseCandidates) {
    const start = at - candidate.lead;
    if (start < 0 || start + candidate.full.length > fullKeys.length) continue;
    if (!candidate.full.every((key, j) => fullKeys[start + j] === key)) continue;
    const longer = !best
      || candidate.contentLength > best.contentLength
      || (candidate.contentLength === best.contentLength && candidate.full.length > best.full.length);
    if (longer) {
      best = candidate;
      bestStart = start;
    }
  }
  const rule = best?.kind === 'rule' ? best : null;
  const length = best ? best.contentLength : 1;
  const literal = best ? best.phrase : keysInQuery[i];
  const typed = best ? fullWords.slice(bestStart, bestStart + best.full.length).join(' ') : corrected[i].word;
  // A spelling correction anywhere in the phrase lowers the whole phrase's weight.
  const span = corrected.slice(i, i + length);
  const spanWeight = Math.min(...span.map((c) => c.weight));
  const spanCorrected = span.some((c) => c.source !== 'query');
  // Uncorrected words are shown as typed; a phrasebook phrase or a spelling correction is
  // shown as its resolved, human display text (never the raw typo).
  const literalText = (!rule && !spanCorrected) ? typed : displayFor(index, literal, literal);
  const members = new Map([[literal, { weight: spanWeight, source: spanCorrected ? 'spelling' : 'query', text: literalText }]]);
  // "Your word first": when what was typed already appears in this scope, the phrasebook's
  // suggestions count for less. A single word must appear in more than a couple of documents; a
  // typed phrase is specific enough that appearing once counts ("advance payment" is in the Code,
  // "at no cost" is not).
  const literalMember = makeMember(literal, {});
  const wordInScope = literal.includes(' ')
    ? Boolean(literalMember) && memberMatchesScope(index, literalMember)
    : index.docFrequency(literal) > SEARCH_RANKING.rareWordMaxDocs;

  if (rule) {
    for (const candidateRule of index.rules.filter((r) => r.from === rule.phrase)) {
      const weightFactor = candidateRule.kind === 'same'
        ? SEARCH_RANKING.weights.same
        : (wordInScope ? SEARCH_RANKING.weights.oneWayWhenWordInScope : SEARCH_RANKING.weights.oneWay);
      for (const to of candidateRule.to) {
        if (!members.has(to)) {
          members.set(to, {
            weight: spanWeight * weightFactor,
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

  return {
    length,
    concept: {
      quoted: false,
      label: typed,
      members: [...members].map(([key, info]) => makeMember(key, info)).filter(Boolean),
    },
  };
}

// A quoted segment becomes one concept with a single member: the exact phrase, every word in
// order and small words included (word forms still count, so "educational grant" also finds
// "Educational Grants"), with no spelling correction and no expansions.
function buildQuotedConcept(innerText, index) {
  const tokens = tokenizeAllWithOffsets(innerText);
  if (!tokens.some((token) => token.content)) return null;
  const key = tokens.map((token) => (token.content ? index.resolveWord(token.word) : token.word)).join(' ');
  const label = collapseWhitespace(innerText);
  return {
    quoted: true,
    label,
    members: [makeMember(key, { weight: 1, source: 'query', text: label }, { quoted: true })],
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
    members: [...members].map(([key, info]) => makeMember(key, info)).filter(Boolean),
  };
}

// Splits the raw query into quoted/unquoted segments and builds the flat list of query
// concepts, applying completion (only to the last unquoted word, only while it is still being
// typed) and quoting along the way. Also returns every typed key in order (small words
// included) for the defined-term rule, and, for a query without quotes, what the exact-phrase
// suggestion needs.
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
  let phrase = null;

  segments.forEach((segment, segmentIndex) => {
    if (segment.quoted) {
      exact = true;
      const concept = buildQuotedConcept(segment.text, index);
      if (concept) {
        concepts.push(concept);
        flatKeys.push(...concept.members[0].full);
      }
      return;
    }

    const allTokens = tokenizeAllWithOffsets(segment.text);
    const tokens = allTokens.filter((token) => token.content).map((token) => token.word);
    if (tokens.length === 0) return;
    const corrected = tokens.map((word) => correctToken(word, index));
    const keysInQuery = corrected.map((c) => c.key);
    // Every typed word in order, small words included: content words by their (corrected) key.
    const fullIndexOfContent = [];
    const fullKeys = allTokens.map((token, fi) => {
      if (!token.content) return token.word;
      fullIndexOfContent.push(fi);
      return keysInQuery[fullIndexOfContent.length - 1];
    });
    const fullWords = allTokens.map((token) => token.word);
    flatKeys.push(...fullKeys);

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

    if (segments.length === 1) {
      phrase = {
        full: fullKeys,
        hasSmallWord: allTokens.some((token) => !token.content),
        endsWithContentWord: allTokens[allTokens.length - 1].content,
        altered: Boolean(completionConcept) || corrected.some((c) => c.source !== 'query'),
      };
    }

    const ctx = {
      corrected, keysInQuery, fullKeys, fullWords, fullIndexOfContent,
    };
    let i = 0;
    while (i < tokens.length) {
      if (completionConcept && i === lastIndex) {
        concepts.push(completionConcept);
        i += 1;
        continue;
      }
      const { length, concept } = buildStandardConceptAt(ctx, i, index);
      concepts.push(concept);
      i += length;
    }
  });

  return {
    concepts, exact, flatKeys, phrase,
  };
}

// An unquoted query with small words ("in kind") whose exact wording occurs in this scope: offer
// the quoted search, which matches only that phrase. Not offered when a word was corrected or is
// still being completed, or when the query ends in a small word (usually mid-typing).
function suggestExactPhrase(index, phrase, query) {
  if (!phrase || !phrase.hasSmallWord || !phrase.endsWithContentWord || phrase.altered) return null;
  if (phrase.full.length < 2 || /["“”]/.test(query)) return null;
  const member = makeMember(phrase.full.join(' '), {}, { quoted: true });
  if (!member || !memberMatchesScope(index, member)) return null;
  return `"${collapseWhitespace(query)}"`;
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
          const n = memberCount(doc, field, member);
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
          for (const p of memberPositions(doc, field, v.member)) events.push([p, ci]);
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

// Does this member appear anywhere (any field, any document) in this scope?
function memberMatchesScope(index, member) {
  const candidateDocs = index.postings.get(member.seq[0]);
  if (!candidateDocs || candidateDocs.size === 0) return false;
  if (member.matchOn === 'content' && member.seq.length === 1) return true;
  for (const di of candidateDocs) {
    const doc = index.docs[di];
    for (const field of index.fieldNames) {
      if (memberCount(doc, field, member) > 0) return true;
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
    for (const occurrence of memberBodyOccurrences(doc, di, info.member, index)) {
      occurrences.push({ ci, ...occurrence });
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
  let startChar = bodyTokens[startTokenIndex].start;
  let endTokenIndex = startTokenIndex;
  let endChar = bodyTokens[startTokenIndex].end;
  for (let t = startTokenIndex; t < bodyTokens.length; t += 1) {
    if (t > startTokenIndex && bodyTokens[t].end - startChar > SNIPPET_MAX_CHARS) break;
    endTokenIndex = t;
    endChar = bodyTokens[t].end;
  }
  // A phrase's small words lie outside the content words: widen the text to include them
  // ("In kind" at the very start of the body).
  const shown = occurrences.filter((o) => o.start >= startTokenIndex && o.end - 1 <= endTokenIndex);
  for (const o of shown) {
    startChar = Math.min(startChar, o.charStart);
    endChar = Math.max(endChar, o.charEnd);
  }

  const prefix = startTokenIndex > 0 ? '…' : '';
  const truncatedEnd = endTokenIndex < bodyTokens.length - 1;
  const core = body.slice(startChar, endChar);
  const text = `${prefix}${core}${truncatedEnd ? '…' : ''}`;

  // Offsets are relative to `text` itself, including any leading ellipsis.
  const offset = prefix.length - startChar;
  // Sorted, with overlapping ranges merged (a phrase and one of its own words can both match).
  const ranges = shown.map((o) => [o.charStart + offset, o.charEnd + offset]).sort((a, b) => a[0] - b[0]);
  const highlights = [];
  for (const [start, end] of ranges) {
    const last = highlights[highlights.length - 1];
    if (last && start < last[1]) last[1] = Math.max(last[1], end);
    else highlights.push([start, end]);
  }

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

// Between the words of a phrase matched word for word: any run of spaces or punctuation (so
// "in kind" also highlights "In-Kind"), but never another word.
const FULL_PHRASE_CONNECTOR = '[^a-z0-9]+';

function collectAlternatives(index, member) {
  if (member.matchOn === 'full') {
    return [member.full.map((key) => {
      if (!isContentWord(key)) return escapeRegExp(key);
      const forms = surfaceFormsForKey(index, key).map(escapeRegExp);
      return forms.length > 1 ? `(?:${forms.join('|')})` : forms[0];
    }).join(FULL_PHRASE_CONNECTOR)];
  }
  const { seq } = member;
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
  const seen = new Set();
  for (const concept of concepts) {
    for (const member of concept.members) {
      const id = memberId(member);
      if (seen.has(id)) continue;
      seen.add(id);
      if (!matchesScope(member)) continue;
      for (const alternative of collectAlternatives(index, member)) {
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
function fieldFor(doc, member) {
  for (const field of MATCHED_FIELD_ORDER) {
    if (memberCount(doc, field, member) > 0) return field;
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
      field: fieldFor(doc, m.member),
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
  phraseSuggestion: null,
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
        phraseSuggestion: null,
      };
    }
  }

  const {
    concepts, exact, flatKeys, phrase,
  } = planQuery(index, rawQuery);
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
  const matchesScope = (member) => {
    const id = memberId(member);
    if (!scopeMatches.has(id)) scopeMatches.set(id, memberMatchesScope(index, member));
    return scopeMatches.get(id);
  };

  const reportedConcepts = concepts.map((concept) => {
    const members = concept.members.map((member) => ({
      text: member.text,
      source: member.source,
      weight: member.weight,
      matched: matchesScope(member),
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
    phraseSuggestion: suggestExactPhrase(index, phrase, query),
  };
};
