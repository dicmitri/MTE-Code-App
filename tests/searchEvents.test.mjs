import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeSearchResponse,
  emitSearchEvent,
  isSearchDebugEnabled,
  SEARCH_EVENT_NAME,
} from '../src/utils/searchEvents.js';

// Hand-built, synthetic response shaped like runSearch()'s return value -- never real Code or
// Transparency content, per AGENTS.md's zero-upkeep rule for search.
const buildResponse = (overrides = {}) => ({
  query: '  Wife   Travel  ',
  scope: 'code',
  exact: false,
  shortcut: null,
  concepts: [
    {
      label: 'wife',
      quoted: false,
      matched: true,
      members: [
        {
          text: 'wife', source: 'query', weight: 1, matched: true,
        },
        {
          text: 'spouse', source: 'phrasebook', weight: 0.7, matched: true,
        },
        // Not matched anywhere in scope -- must never appear in `sources`.
        {
          text: 'partner', source: 'phrasebook', weight: 0.7, matched: false,
        },
      ],
    },
    {
      label: 'travel',
      quoted: false,
      matched: true,
      members: [
        {
          text: 'travel', source: 'query', weight: 1, matched: true,
        },
      ],
    },
  ],
  corrections: [],
  results: [
    { id: 'r1' }, { id: 'r2' }, { id: 'r3' }, { id: 'r4' }, { id: 'r5' }, { id: 'r6' },
  ],
  appResults: [],
  allTermsMatched: true,
  highlight: null,
  ...overrides,
});

test('describeSearchResponse normalizes the query (lower-cased, whitespace-collapsed)', () => {
  const described = describeSearchResponse(buildResponse());
  assert.equal(described.query, 'wife travel');
  assert.equal(described.scope, 'code');
});

test('describeSearchResponse builds an order-independent key', () => {
  const forward = describeSearchResponse(buildResponse({ query: 'wife travel' }));
  const reversed = describeSearchResponse(buildResponse({ query: 'Travel   Wife' }));
  const repeated = describeSearchResponse(buildResponse({ query: 'wife wife travel' }));

  assert.equal(forward.key, 'travel wife');
  assert.equal(reversed.key, forward.key);
  assert.equal(repeated.key, forward.key);
});

test('describeSearchResponse reports zeroResults and caps topIds at 5', () => {
  const withResults = describeSearchResponse(buildResponse());
  assert.equal(withResults.zeroResults, false);
  assert.equal(withResults.topIds.length, 5);
  assert.deepEqual(withResults.topIds, ['r1', 'r2', 'r3', 'r4', 'r5']);

  const zero = describeSearchResponse(buildResponse({ results: [] }));
  assert.equal(zero.zeroResults, true);
  assert.deepEqual(zero.topIds, []);
  assert.equal(zero.resultCount, 0);
});

test('describeSearchResponse collects unique matched sources other than "query"', () => {
  const described = describeSearchResponse(buildResponse());
  // "partner" (phrasebook, unmatched) and both "query" members are excluded; "spouse"
  // (phrasebook, matched) contributes exactly one "phrasebook" entry, not duplicated.
  assert.deepEqual(described.sources, ['phrasebook']);
});

test('describeSearchResponse carries the shortcut through unchanged', () => {
  assert.equal(describeSearchResponse(buildResponse({ shortcut: 'qa-number' })).shortcut, 'qa-number');
  assert.equal(describeSearchResponse(buildResponse()).shortcut, null);
});

test('describeSearchResponse tolerates a missing/empty response', () => {
  const described = describeSearchResponse(undefined);
  assert.equal(described.query, '');
  assert.equal(described.key, '');
  assert.equal(described.zeroResults, true);
  assert.deepEqual(described.topIds, []);
  assert.deepEqual(described.sources, []);
});

test('emitSearchEvent does not throw when window is unavailable', () => {
  assert.equal(typeof window, 'undefined');
  assert.doesNotThrow(() => {
    emitSearchEvent('select', {
      query: 'wife travel', id: 'code/ch1-3-guests', rank: 0, type: 'provision',
    });
  });
});

test('SEARCH_EVENT_NAME is the documented event name', () => {
  assert.equal(SEARCH_EVENT_NAME, 'mte:search');
});

test('isSearchDebugEnabled returns false (never throws) without window', () => {
  assert.equal(isSearchDebugEnabled(), false);
});
