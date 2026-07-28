import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parseSemicolonCsv } from '../src/utils/csvUtils.js';

test('parses the bundled semicolon format without changing cell values', () => {
  const parsed = parseSemicolonCsv(
    '"NAME";"AMOUNT";"COMMENT"\r\n'
    + '"Éghezée";"10,000";""\r\n'
    + '"A ""quoted"" value";"10.50";"line 1\nline 2"\r\n',
  );

  assert.deepEqual(parsed, {
    headers: ['NAME', 'AMOUNT', 'COMMENT'],
    rows: [
      ['Éghezée', '10,000', ''],
      ['A "quoted" value', '10.50', 'line 1\nline 2'],
    ],
  });
});

test('rejects malformed or structurally inconsistent CSV input', () => {
  assert.throws(
    () => parseSemicolonCsv('"A";"B"\n"only one"'),
    /expected 2/,
  );
  assert.throws(
    () => parseSemicolonCsv('"A";"unterminated'),
    /unterminated/,
  );
});

test('renders the bundled Annex I template as 11 exact columns and 3 example rows', () => {
  const source = readFileSync(
    new URL('../src/data/declaration-csv-template.csv', import.meta.url),
    'utf8',
  );
  const parsed = parseSemicolonCsv(source);

  assert.deepEqual(parsed.headers, [
    'BENEFICIARY_NAME',
    'BENEFICIARY_ADDRESS',
    'BENEFICIARY_POSTAL_CODE',
    'BENEFICIARY_CITY',
    'BENEFICIARY_COUNTRY_CODE',
    'BENEFICIARY_VAT_OR_UNIQUE_IDENTIFIER',
    'DECLARATION_YEAR',
    'EDUCATIONAL_GRANT_TYPE',
    'AMOUNT',
    'CURRENCY_CODE',
    'COMMENT',
  ]);
  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[1][3], 'Éghezée');
  assert.equal(parsed.rows[0][8], '10,000');
  assert.equal(parsed.rows[2][10], '');
});
