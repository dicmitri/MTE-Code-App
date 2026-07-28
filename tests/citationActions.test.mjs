import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const fullTextSectionSource = await readFile(
  new URL('../src/components/FullTextSection.jsx', import.meta.url),
  'utf8',
);

test('uses one shared Cite/Link menu without a redundant Link button', () => {
  assert.match(fullTextSectionSource, /<span>Cite\/Link<\/span>/);
  assert.doesNotMatch(fullTextSectionSource, /\bcopyLink\b/);
  assert.doesNotMatch(fullTextSectionSource, />\s*Link\s*<\/button>/);

  assert.match(fullTextSectionSource, />Formal Citation<\/div>/);
  assert.match(fullTextSectionSource, />Markdown Link<\/div>/);
  assert.match(fullTextSectionSource, />Direct Link URL<\/div>/);
});
