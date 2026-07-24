import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addRecentSearch,
  normalizeRecentSearches,
} from '../src/utils/recentSearchUtils.js';

test('normalizes recent searches safely', () => {
  assert.deepEqual(normalizeRecentSearches(null), []);
  assert.deepEqual(
    normalizeRecentSearches(['  Grants ', 'grants', '', 42, 'TPPT']),
    ['Grants', 'TPPT'],
  );
});

test('adds explicit searches newest-first without partial duplicates', () => {
  const existing = ['Events', 'Grants', 'TPPT', 'Scope'];
  const updated = addRecentSearch(existing, ' grants ');

  assert.deepEqual(updated, ['grants', 'Events', 'TPPT', 'Scope']);
  assert.deepEqual(existing, ['Events', 'Grants', 'TPPT', 'Scope']);
  assert.deepEqual(addRecentSearch(updated, 'x'), updated);
});
