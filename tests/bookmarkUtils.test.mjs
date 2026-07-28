import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBookmarkKey,
  normalizeBookmarks,
} from '../src/utils/bookmarkUtils.js';

test('namespaces Code and Transparency bookmarks independently', () => {
  const codeKey = buildBookmarkKey('shared-id', 'code', null, 'ch1');
  const transparencyKey = buildBookmarkKey(
    'shared-id',
    'transparency',
    'disclosure-guidelines',
    'dg-ch1',
  );

  assert.notEqual(codeKey, transparencyKey);
  assert.equal(codeKey, 'code::ch1:shared-id');
  assert.equal(
    transparencyKey,
    'transparency:disclosure-guidelines:dg-ch1:shared-id',
  );
});

test('migrates existing Code bookmarks without losing their fields', () => {
  const [bookmark] = normalizeBookmarks([{
    id: 'ch1-scope',
    title: 'Scope',
    chapterId: 'ch1',
    dateAdded: '2026-01-01T00:00:00.000Z',
  }]);

  assert.equal(bookmark.section, 'code');
  assert.equal(bookmark.documentId, null);
  assert.equal(bookmark.key, 'code::ch1:ch1-scope');
  assert.equal(bookmark.title, 'Scope');
  assert.equal(bookmark.dateAdded, '2026-01-01T00:00:00.000Z');
});

test('normalizes invalid saved values to an empty list', () => {
  assert.deepEqual(normalizeBookmarks(null), []);
  assert.deepEqual(normalizeBookmarks({}), []);
});
