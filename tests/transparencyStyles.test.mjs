import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const stylesheet = await readFile(
  new URL('../src/index.css', import.meta.url),
  'utf8',
);

test('scopes Disclosure table defaults to the Transparency reader', () => {
  assert.match(
    stylesheet,
    /\.transparency-reader \.reader-content table \{/,
  );
  assert.match(
    stylesheet,
    /\.transparency-reader \.reader-content th,\s*\.transparency-reader \.reader-content td \{/,
  );
  assert.doesNotMatch(
    stylesheet,
    /(^|\n)\s*\.reader-content (?:table|tr|th|td)(?:\s|,|\{)/m,
  );
});
