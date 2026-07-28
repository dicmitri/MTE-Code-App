import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSearchExpansionRestore,
  getSearchExpansionSnapshot,
  hasOnlyQaMatches,
  normalizeSearchQuery,
} from '../src/utils/searchResultUtils.js';

test('normalizes whitespace-only searches to an empty query', () => {
  assert.equal(normalizeSearchQuery('   \t  '), '');
  assert.equal(normalizeSearchQuery('  educational grant  '), 'educational grant');
});

test('identifies results whose visible match exists only in Q&A content', () => {
  assert.equal(hasOnlyQaMatches({ title: 0, text: 0, qa: 2 }), true);
  assert.equal(hasOnlyQaMatches({ title: 1, text: 0, qa: 2 }), false);
  assert.equal(hasOnlyQaMatches({ title: 0, text: 1, qa: 2 }), false);
  assert.equal(hasOnlyQaMatches({ title: 0, text: 0, qa: 0 }), false);
});

test('replaces the saved expansion state when the search scope changes', () => {
  const codeSnapshot = getSearchExpansionSnapshot({
    currentSnapshot: null,
    scope: 'code:',
    expandedGroups: new Set(['section-code', 'code-part1']),
    defaultExpandedGroups: new Set(),
  });
  const transparencySnapshot = getSearchExpansionSnapshot({
    currentSnapshot: codeSnapshot,
    scope: 'transparency:disclosure-guidelines',
    expandedGroups: new Set(['section-code']),
    defaultExpandedGroups: new Set([
      'section-transparency',
      'transparency-disclosure-guidelines',
    ]),
  });

  assert.deepEqual(
    [...transparencySnapshot.groups],
    ['section-transparency', 'transparency-disclosure-guidelines'],
  );
  assert.deepEqual(
    [...getSearchExpansionRestore({
      snapshot: transparencySnapshot,
      scope: 'transparency:disclosure-guidelines',
      defaultExpandedGroups: new Set(),
    })],
    ['section-transparency', 'transparency-disclosure-guidelines'],
  );
});
