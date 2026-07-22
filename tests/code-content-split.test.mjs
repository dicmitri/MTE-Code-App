import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSplitPlan } from '../scripts/split-code-data.mjs';
import { extractRootArrayProperty } from '../scripts/lib/raw-json-array.mjs';

const trickySource = `{
  "metadata": {"purpose": "scanner fixture"},
  "chapters": [
    {
      "id": "first",
      "text": "commas, braces } ], and an escaped quote: \\"",
      "unicodeEscape": "\\u2019",
      "sections": [{"title": "One", "legalText": "Exact; punctuation.", "qas": []}]
    },
    {
      "id": "second",
      "nested": [{"value": "[not an array]"}],
      "sections": []
    }
  ]
}`;

test('extracts top-level array objects without interpreting nested punctuation', () => {
  const extraction = extractRootArrayProperty(trickySource, 'chapters');
  assert.equal(extraction.elements.length, 2);
  assert.equal(JSON.parse(extraction.elements[0].raw).text, 'commas, braces } ], and an escaped quote: "');
  assert.match(extraction.elements[0].raw, /"unicodeEscape": "\\u2019"/);

  const reconstructed = extraction.prefix
    + extraction.elements.map((element, index) => (
      index === 0 ? element.raw : `${extraction.separators[index - 1]}${element.raw}`
    )).join('')
    + extraction.suffix;
  assert.equal(reconstructed, trickySource);
});

test('builds raw chapter hashes without reserializing source objects', () => {
  const plan = buildSplitPlan(trickySource);
  assert.deepEqual(plan.manifest.chapterOrder, ['first', 'second']);
  assert.equal(plan.chapters[0].raw, plan.manifest.sourceReconstruction.prefix
    ? extractRootArrayProperty(trickySource, 'chapters').elements[0].raw
    : null);
  assert.equal(plan.manifest.source.sha256.length, 64);
  assert.equal(plan.manifest.totals.chapters, 2);
});

test('rejects duplicate and unsafe chapter IDs before any file is written', () => {
  const duplicate = '{"chapters":[{"id":"same","sections":[]},{"id":"same","sections":[]}]}';
  const unsafe = '{"chapters":[{"id":"../outside","sections":[]}]}';
  assert.throws(() => buildSplitPlan(duplicate), /Duplicate chapter ID/);
  assert.throws(() => buildSplitPlan(unsafe), /unsafe file ID/);
});
