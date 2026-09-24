import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadSearchIndexes } from '../scripts/lib/search-content.mjs';
import { runSearch } from '../src/utils/searchEngine.js';

// These checks run against the live Code and Disclosure Guidelines, but they assert only
// content-independent properties: every document must be findable by its own wording, and ids
// and anchors must be unique. They adapt automatically when the Code changes, so an ordinary
// content update can never break them.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexes = loadSearchIndexes(projectRoot);

const MIN_SELF_RETRIEVAL = 0.95;

// How a reader would look for a document: a Q&A by its question, a definition by its term,
// anything else by its chapter and heading.
function selfQuery(doc) {
  if (doc.type === 'qa') return doc.fields.title;
  if (doc.type === 'definition') return doc.fields.title.replace(/\s*\([^)]*\)$/, '');
  return `${doc.fields.context.split(/\s+/).slice(0, 6).join(' ')} ${doc.fields.title}`;
}

for (const [scope, index] of Object.entries(indexes)) {
  test(`${scope}: at least ${MIN_SELF_RETRIEVAL * 100}% of documents are found in the top 3 by their own wording`, () => {
    const documents = index.docs.filter((doc) => doc.authoritative);
    const misses = documents.filter((doc) => (
      !runSearch(index, selfQuery(doc)).results.slice(0, 3).some((hit) => hit.id === doc.id)
    ));
    const rate = (documents.length - misses.length) / documents.length;

    assert.ok(documents.length > 0, `${scope} has no searchable documents`);
    assert.ok(
      rate >= MIN_SELF_RETRIEVAL,
      `${scope} self-retrieval ${(rate * 100).toFixed(1)}% is below ${MIN_SELF_RETRIEVAL * 100}%. `
        + `Missed: ${misses.map((doc) => doc.id).join(', ')}`,
    );
  });

  test(`${scope}: search ids and navigation anchors are unique`, () => {
    const ids = index.docs.map((doc) => doc.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate search document ids');

    const anchors = index.docs
      .map((doc) => doc.target)
      .filter((target) => target?.anchor)
      .map((target) => `${target.documentId || ''}/${target.anchor}`);
    assert.equal(new Set(anchors).size, anchors.length, 'duplicate navigation anchors');
  });

  test(`${scope}: every document has a label, a title and a navigation target`, () => {
    for (const doc of index.docs) {
      assert.ok(doc.label, `${doc.id} has no label`);
      assert.ok(doc.title, `${doc.id} has no title`);
      assert.ok(doc.target?.kind, `${doc.id} has no navigation target`);
    }
  });
}
