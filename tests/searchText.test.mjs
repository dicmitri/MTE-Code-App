import assert from 'node:assert/strict';
import test from 'node:test';

import {
  boundedEditDistance,
  createWordResolver,
  normalizeText,
  spellingBudget,
  STOPWORDS,
  tokenizeAllWithOffsets,
  tokenizeWithOffsets,
  tokenizeWords,
} from '../src/utils/searchText.js';

test('normalizes accents, case and curly punctuation to a plain comparable form', () => {
  assert.equal(normalizeText('Café'), 'cafe');
  assert.equal(normalizeText('HCP’s'), "hcp's");
  // A spacing acute accent (´) decomposes under NFKD into a space plus a combining mark, so it
  // separates words rather than acting as an apostrophe.
  assert.equal(normalizeText('HCP‘quote`tick´acute'), "hcp'quote'tick acute");
  assert.equal(normalizeText(''), '');
  assert.equal(normalizeText(null), '');
});

test('tokenizes with offsets into the original string', () => {
  const text = "HCP’s travel-costs (FMV) in 2026";
  const tokens = tokenizeWithOffsets(text);

  assert.deepEqual(tokens.map((token) => token.word), ['hcp', 'travel', 'costs', 'fmv', '2026']);
  for (const token of tokens) {
    assert.equal(
      normalizeText(text.slice(token.start, token.end)),
      token.word,
      `offsets for "${token.word}" should point back at the same text`,
    );
  }
});

test('drops the possessive "\'s" after a letter, in both apostrophe styles', () => {
  assert.deepEqual(tokenizeWords("the HCP's travel"), ['hcp', 'travel']);
  assert.deepEqual(tokenizeWords('the HCP’s travel'), ['hcp', 'travel']);
  // A bare trailing "s" that is not possessive (no apostrophe before it) is still just a
  // 1-letter token, dropped by the ordinary length rule, not specially recognised as possessive.
  assert.deepEqual(tokenizeWords('go fast s now'), ['go', 'fast', 'now']);
});

test('drops stopwords and 1-character non-numeric tokens, keeps digits', () => {
  assert.deepEqual(tokenizeWords('In the event that a fee of 1 EUR is charged'), ['event', 'fee', '1', 'eur', 'charged']);
  for (const word of ['the', 'of', 'and', 'eg', 'ie', 'etc', 'vs', 'per', 'via', 'own', 'get']) {
    assert.ok(STOPWORDS.has(word), `"${word}" should be a stopword`);
  }
  assert.deepEqual(tokenizeWords('a I x 9'), ['9']);
});

test('tokenizeAllWithOffsets keeps small words, flagged as not content, with their offsets', () => {
  const text = 'Provided In-Kind, e.g. the Company’s gift';
  const tokens = tokenizeAllWithOffsets(text);
  assert.deepEqual(tokens.map((token) => [token.word, token.content]), [
    ['provided', true],
    ['in', false],
    ['kind', true],
    ['e', false],
    ['g', false],
    ['the', false],
    ['company', true],
    ['gift', true],
  ]);
  for (const token of tokens) {
    assert.equal(text.slice(token.start, token.end).toLowerCase(), token.word);
  }
  // Its content tokens are exactly what tokenizeWithOffsets returns.
  assert.deepEqual(
    tokens.filter((token) => token.content).map(({ word, start, end }) => ({ word, start, end })),
    tokenizeWithOffsets(text),
  );
});

test('splits on hyphens and punctuation, and normalizes multi-word text consistently', () => {
  assert.deepEqual(
    tokenizeWords('Third-Party Organised Educational Event(s); costs €1,000.'),
    ['third', 'party', 'organised', 'educational', 'event', 'costs', '1', '000'],
  );
  assert.deepEqual(tokenizeWords('  leading/trailing   spaces  '), ['leading', 'trailing', 'spaces']);
});

test('tokenizeWords matches word-for-word on ordinary English text', () => {
  const samples = [
    "The Member Company's Third-Party Organised Educational Event (TPOE) costs €1,000.",
    'organising, organised, organises, organisation',
    'training vs trainer vs trained',
    "don't we've it's O'Brien's children's",
    'Section 1.2. sub-clause (a)(i)',
  ];
  for (const sample of samples) {
    // Independent reference: normalize the whole string, drop a trailing possessive, then split
    // on runs of letters/digits and apply the same length/stopword filter.
    const reference = (normalizeText(sample).replace(/'s\b/g, '').match(/[a-z0-9]+/g) || [])
      .filter((word) => (word.length > 1 || /\d/.test(word)) && !STOPWORDS.has(word));
    assert.deepEqual(tokenizeWords(sample), reference, sample);
  }
});

test('boundedEditDistance is a bounded optimal-string-alignment distance', () => {
  assert.equal(boundedEditDistance('sponsor', 'sponsor', 2), 0);
  assert.equal(boundedEditDistance('consultacy', 'consultancy', 2), 1);
  assert.equal(boundedEditDistance('organization', 'organisation', 2), 1);
  // Transposition counts as one edit (optimal string alignment / Damerau).
  assert.equal(boundedEditDistance('teh', 'the', 1), 1);
  // Once the true distance exceeds the bound, the bound + 1 sentinel is returned rather than
  // the exact (more expensive) distance.
  assert.equal(boundedEditDistance('kitten', 'sitting', 1), 2);
  assert.equal(boundedEditDistance('abc', 'xyz', 1), 2);
});

test('spellingBudget scales with word length', () => {
  assert.equal(spellingBudget('cat'), 0);
  assert.equal(spellingBudget('gift'), 0);
  assert.equal(spellingBudget('grant'), 1);
  assert.equal(spellingBudget('hospital'), 1);
  assert.equal(spellingBudget('consultancy'), 2);
  assert.equal(spellingBudget('internationalization'), 2);
});

// --- createWordResolver: vocabulary-validated light stemming ---------------------------------

const vocab = (entries) => new Map(entries);

test('strips a plural only when the singular is itself in the vocabulary', () => {
  const { key } = createWordResolver(vocab([['hospital', 5], ['hospitals', 3], ['hospitality', 4]]));
  assert.equal(key('hospitals'), 'hospital');
  assert.equal(key('hospitality'), 'hospitality', 'hospitality must never collapse into hospital');
});

test('leaves a short, unstemmable word alone (cvs)', () => {
  const { key } = createWordResolver(vocab([['cvs', 5]]));
  assert.equal(key('cvs'), 'cvs');
});

test('stems -ed/-ing British spellings to their base form when the base exists', () => {
  const { key } = createWordResolver(vocab([
    ['organise', 5], ['organised', 3], ['organising', 2], ['organises', 1],
  ]));
  assert.equal(key('organised'), 'organise');
  assert.equal(key('organising'), 'organise');
});

test('stems travelling to travel and paying to pay', () => {
  const travel = createWordResolver(vocab([['travel', 10], ['travelling', 4]]));
  assert.equal(travel.key('travelling'), 'travel');

  const pay = createWordResolver(vocab([['pay', 10], ['paying', 4]]));
  assert.equal(pay.key('paying'), 'pay');
});

test('the -ing guard keeps a much more frequent -ing word as its own word', () => {
  // "training" is (just over) 5x more frequent than "train": stays "training".
  const guarded = createWordResolver(vocab([['train', 2], ['training', 11]]));
  assert.equal(guarded.key('training'), 'training');

  // Below the 5x ratio: normal stemming applies.
  const unguarded = createWordResolver(vocab([['train', 3], ['training', 12]]));
  assert.equal(unguarded.key('training'), 'train');
});

test('resolve completes a singular query to the plural the scope actually uses', () => {
  const { resolve } = createWordResolver(vocab([['hours', 5]]));
  const isIndexedKey = (key) => key === 'hours';
  assert.equal(resolve('hour', isIndexedKey), 'hours');
});

test('resolve returns the stemmed key unchanged when nothing else matches', () => {
  const { resolve } = createWordResolver(vocab([['grant', 4]]));
  const isIndexedKey = () => false;
  assert.equal(resolve('zzzzz', isIndexedKey), 'zzzzz');
});
