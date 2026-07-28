import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveResourceLinks } from '../src/utils/resourceUtils.js';

test('resolves a local resource link and download filename without changing visible text', () => {
  const source = '<p>Downloadable at <a href="resource:template">this link</a>.</p>';
  const result = resolveResourceLinks(source, {
    template: {
      url: '/assets/template.csv',
      filename: 'declaration.csv',
    },
  });

  assert.equal(
    result,
    '<p>Downloadable at <a href="/assets/template.csv" download="declaration.csv">this link</a>.</p>',
  );
});

test('leaves unresolved resource identifiers visible to validation', () => {
  const source = '<a href="resource:missing">this link</a>';
  assert.equal(resolveResourceLinks(source, {}), source);
});

test('escapes generated resource attributes', () => {
  const result = resolveResourceLinks('<a href="resource:file">file</a>', {
    file: {
      url: '/download?name="template"&format=csv',
      filename: 'a"b.csv',
    },
  });

  assert.match(result, /name=&quot;template&quot;&amp;format=csv/);
  assert.match(result, /download="a&quot;b.csv"/);
});
