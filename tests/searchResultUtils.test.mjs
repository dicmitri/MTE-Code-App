import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSearchQuery } from '../src/utils/searchResultUtils.js';

test('normalizes whitespace-only searches to an empty query', () => {
  assert.equal(normalizeSearchQuery('   \t  '), '');
  assert.equal(normalizeSearchQuery('  educational grant  '), 'educational grant');
});
