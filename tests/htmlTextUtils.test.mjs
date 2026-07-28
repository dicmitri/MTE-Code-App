import assert from 'node:assert/strict';
import test from 'node:test';

import { htmlToPlainText } from '../src/utils/htmlTextUtils.js';

test('keeps visible legal text while excluding tags and resource attributes', () => {
  const html = '<p>Please find the <a href="resource:declaration-csv-template">this link</a>.</p>';
  const text = htmlToPlainText(html);

  assert.match(text, /Please find the/);
  assert.match(text, /this link/);
  assert.doesNotMatch(text, /resource|href|declaration-csv-template/);
});

test('decodes common and numeric entities used by publication HTML', () => {
  assert.equal(
    htmlToPlainText('&ldquo;Guidance&rdquo;&nbsp;&#x2022;&nbsp;&#169;'),
    '“Guidance” • ©',
  );
});
