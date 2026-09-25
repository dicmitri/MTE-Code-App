// Pure text primitives for the search engine: normalization, tokenization with offsets,
// bounded edit distance, and vocabulary-validated light stemming. No DOM, no React, no
// Date/Math.random. Ported faithfully from the reference search prototype (see
// /root/.claude/plans and the prototype script referenced in the search work package brief).

// Exactly the prototype's stopword list.
export const STOPWORDS = new Set((
  'a an the of to in on at by for with from and or nor is are was were be been being '
  + 'can could may might must shall should will would do does did i we you he she it they me us my our your his '
  + 'her its their them this that these those what which who whom whose when where why how if then than as so '
  + 'such not no any all some each other into about also there here eg ie etc vs per via own get'
).split(' '));

// NFKD, strip combining marks, lowercase, curly apostrophes/backticks -> straight apostrophe.
export const normalizeText = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[’‘`´]/g, "'");

const isApostrophe = (character) => character === "'" || character === '’';
const isLetter = (character) => /\p{L}/u.test(character || '');

// A content word carries meaning on its own. Small words (stopwords, and one-letter words that
// are not digits) are kept only inside phrases: "in kind" is not the same as "kind".
export const isContentWord = (word) => (word.length > 1 || /\d/.test(word)) && !STOPWORDS.has(word);

// Nearly every word in the Code is plain ASCII, which normalizes to its own lowercase form.
const ASCII_RUN = /^[A-Za-z0-9]+$/;

// Every word, in order, as { word, start, end, content }: small words are included with
// `content: false`. Scans runs of [\p{L}\p{N}]+ in the ORIGINAL string, normalizes each run, and
// splits the normalized run into ASCII [a-z0-9]+ sub-runs (normalization only rarely changes a
// run's length -- e.g. a fraction character decomposing into digits and a separator -- and
// offsets for those sub-runs are approximated proportionally rather than being exact).
export const tokenizeAllWithOffsets = (text) => {
  const source = String(text || '');
  const tokens = [];
  const runPattern = /[\p{L}\p{N}]+/gu;
  let match = runPattern.exec(source);
  while (match) {
    const runText = match[0];
    const runStart = match.index;
    const runEnd = runStart + runText.length;

    // Possessive: a lone "s" run directly after an apostrophe that follows a letter.
    const isPossessiveS = runText.toLowerCase() === 's'
      && runStart > 1
      && isApostrophe(source[runStart - 1])
      && isLetter(source[runStart - 2]);

    if (isPossessiveS) {
      // skip
    } else if (ASCII_RUN.test(runText)) {
      const word = runText.toLowerCase();
      tokens.push({
        word, start: runStart, end: runEnd, content: isContentWord(word),
      });
    } else {
      const normalizedRun = normalizeText(runText);
      const subMatches = [...normalizedRun.matchAll(/[a-z0-9]+/g)];
      const exact = subMatches.length === 1 && normalizedRun.length === runText.length;
      const scale = normalizedRun.length > 0 ? runText.length / normalizedRun.length : 1;

      for (const subMatch of subMatches) {
        const word = subMatch[0];
        const start = exact ? runStart : runStart + Math.round(subMatch.index * scale);
        const end = exact ? runEnd : runStart + Math.round((subMatch.index + word.length) * scale);
        tokens.push({
          word, start, end, content: isContentWord(word),
        });
      }
    }

    match = runPattern.exec(source);
  }
  return tokens;
};

// Content words only, with offsets -- what ordinary word matching uses.
export const tokenizeWithOffsets = (text) => tokenizeAllWithOffsets(text)
  .filter((token) => token.content)
  .map(({ word, start, end }) => ({ word, start, end }));

export const tokenizeWords = (text) => tokenizeAllWithOffsets(text)
  .filter((token) => token.content)
  .map((token) => token.word);

// Bounded optimal-string-alignment (Damerau) distance; returns max + 1 once the bound is
// exceeded, so callers never need the exact distance beyond their budget.
export const boundedEditDistance = (a, b, max) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = [];
  for (let i = 0; i <= a.length; i += 1) d[i] = [i];
  for (let j = 0; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
};

export const spellingBudget = (word) => {
  if (word.length <= 4) return 0;
  if (word.length <= 8) return 1;
  return 2;
};

// Vocabulary-validated light stemming: an ending is stripped only if the shorter form is
// itself a word in the current vocabulary (so "hospitality" never collapses to "hospital").
// `vocabulary` is a Map<surfaceWord, frequency> built by the caller from the current index's
// scope (the current Code or Transparency content), so results change automatically as that
// content changes.
export const createWordResolver = (vocabulary, { ingGuardRatio = 5 } = {}) => {
  const keyCache = new Map();

  const candidates = (word) => {
    const out = [];
    if (word.length <= 3 || /^\d+$/.test(word)) return out;
    if (word.endsWith('ies')) out.push(`${word.slice(0, -3)}y`);
    if (word.endsWith('es')) out.push(word.slice(0, -2));
    if (word.endsWith('s') && !word.endsWith('ss')) out.push(word.slice(0, -1));
    if (word.endsWith('ied')) out.push(`${word.slice(0, -3)}y`);
    if (word.endsWith('ing')) {
      const base = word.slice(0, -3);
      const doubledBase = /(.)\1$/.test(base) ? base.slice(0, -1) : null;
      for (const candidate of [base, `${base}e`, doubledBase]) {
        // -ing guard: an -ing word far more frequent than its base ("training" vs "train")
        // is left alone rather than stemmed.
        const guarded = vocabulary.has(word)
          && (vocabulary.get(candidate) || 0) * ingGuardRatio < vocabulary.get(word);
        if (candidate && !guarded) out.push(candidate);
      }
    }
    if (word.endsWith('ed')) {
      const base = word.slice(0, -2);
      out.push(base, `${base}e`, word.slice(0, -1));
      if (/(.)\1$/.test(base)) out.push(base.slice(0, -1));
    }
    return out.filter((candidate) => candidate && candidate.length >= 3);
  };

  const key = (word, depth = 0) => {
    if (keyCache.has(word)) return keyCache.get(word);
    let result = word;
    if (depth < 2) {
      for (const candidate of candidates(word)) {
        if (vocabulary.has(candidate)) {
          result = key(candidate, depth + 1);
          break;
        }
      }
    }
    keyCache.set(word, result);
    return result;
  };

  // Query-side resolution: the stemmed key if it is already indexed; otherwise a
  // singular/plural completion ("hour" -> "hours") tried against the vocabulary; otherwise
  // the stemmed key as-is.
  const resolve = (word, isIndexedKey) => {
    const stemmed = key(word);
    if (isIndexedKey(stemmed)) return stemmed;
    for (const candidate of [`${word}s`, `${word}es`, word.replace(/y$/, 'ies')]) {
      if (vocabulary.has(candidate)) return key(candidate);
    }
    return stemmed;
  };

  return { key, resolve };
};
