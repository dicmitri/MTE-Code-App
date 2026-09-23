import test from 'node:test';
import assert from 'node:assert/strict';

import { handleHistoricalDeclarationsRequest } from '../historical-declarations-api.js';

// Records every statement the handler prepares and returns empty results.
function createFakeDb() {
  const statements = [];

  return {
    statements,
    prepare(sql) {
      const statement = { sql, params: [] };
      statements.push(statement);

      return {
        bind(...params) {
          statement.params = params;
          return this;
        },
        async first() {
          return { total: 0 };
        },
        async all() {
          return { results: [] };
        },
      };
    },
  };
}

async function request(path) {
  const env = { DB: createFakeDb() };
  const response = await handleHistoricalDeclarationsRequest(
    new Request(`https://medtecheurope-code.org/api/historical-declarations/${path}`),
    env,
  );
  return { response, statements: env.DB.statements };
}

function pageQuery(statements) {
  const statement = statements.find(({ sql }) => sql.includes('LIMIT ? OFFSET ?'));
  const [limit, offset] = statement.params.slice(-2);
  return { sql: statement.sql, params: statement.params, limit, offset };
}

test('clamps the page size to 1-100, so a negative limit cannot remove the SQL LIMIT', async () => {
  for (const [limitParam, expectedLimit] of [
    ['-1', 1],
    ['0', 1],
    ['500', 100],
    [null, 50],
  ]) {
    const query = limitParam === null ? 'year=2024' : `year=2024&limit=${limitParam}`;
    const { statements } = await request(`search?${query}`);

    assert.equal(pageQuery(statements).limit, expectedLimit, `limit=${limitParam}`);
  }
});

test('matches search text literally, so a bare wildcard does not match every row', async () => {
  const { sql, params } = pageQuery((await request('search?q=%25')).statements);

  assert.match(sql, /LIKE \? ESCAPE '!'/);
  assert.deepEqual(params.slice(0, 2), ['%!%%', '%!%%']);

  const escaped = pageQuery((await request('search?q=50_off!')).statements);
  assert.deepEqual(escaped.params.slice(0, 2), ['%50!_off!!%', '%50!_off!!%']);
});

test('treats whitespace-only search text as no filter', async () => {
  const { response, statements } = await request('search?q=%20%20');

  assert.equal(response.status, 400);
  assert.equal(statements.length, 0);
});

test('returns 404 for malformed declaration ids without querying the database', async () => {
  const { response, statements } = await request('%E0%A4%A');

  assert.equal(response.status, 404);
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.equal(statements.length, 0);
});
