import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import { formatExplain, parseArgs, parseReportQueries } from '../scripts/search-tools.mjs';

// These checks are content-independent: the unit tests below use a hand-built fixture rather
// than the live Code/Transparency content, and the two spawned-process checks assert only that
// the CLI runs and prints its expected section headings -- never anything about search rankings
// or content, so an ordinary content update can never break them.
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_PATH = resolve(PROJECT_ROOT, 'scripts/search-tools.mjs');

// ---------------------------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------------------------
test('parseArgs reads the query, --scope and --limit', () => {
  const parsed = parseArgs(['explain', 'wife travel', '--scope', 'transparency', '--limit', '5']);
  assert.deepEqual(parsed, {
    command: 'explain', query: 'wife travel', scope: 'transparency', limit: 5,
  });
});

test('parseArgs accepts --scope=value and --limit=value', () => {
  const parsed = parseArgs(['explain', 'flight', '--scope=transparency', '--limit=3']);
  assert.equal(parsed.scope, 'transparency');
  assert.equal(parsed.limit, 3);
});

test('parseArgs defaults to scope "code" and limit 10', () => {
  const parsed = parseArgs(['explain', 'flight']);
  assert.equal(parsed.scope, 'code');
  assert.equal(parsed.limit, 10);
});

test('parseArgs joins unquoted words into one query', () => {
  const parsed = parseArgs(['explain', 'wife', 'travel']);
  assert.equal(parsed.query, 'wife travel');
});

test('parseArgs reads a bare "report" with no extra arguments', () => {
  assert.deepEqual(parseArgs(['report']), { command: 'report' });
});

test('parseArgs rejects an unknown scope', () => {
  assert.throws(() => parseArgs(['explain', 'flight', '--scope', 'nope']), /Unknown scope/);
});

test('parseArgs rejects an unknown command', () => {
  assert.throws(() => parseArgs(['bogus']), /Unknown command/);
});

test('parseArgs rejects a missing query', () => {
  assert.throws(() => parseArgs(['explain']), /Missing query/);
});

test('parseArgs rejects extra arguments after "report"', () => {
  assert.throws(() => parseArgs(['report', 'extra']), /Unknown report argument/);
});

test('parseArgs accepts report query files and JSON output and rejects malformed options', () => {
  assert.deepEqual(parseArgs(['report', '--queries', 'queries.json', '--json']), {
    command: 'report', queriesPath: 'queries.json', json: true,
  });
  assert.deepEqual(parseArgs(['report', '--json', '--queries=queries.json']), {
    command: 'report', queriesPath: 'queries.json', json: true,
  });
  assert.throws(() => parseArgs(['report', '--queries']), /Missing JSON path/);
  assert.throws(() => parseArgs(['report', '--queries', '--json']), /Missing JSON path/);
  assert.throws(() => parseArgs(['report', '--queries=a.json', '--queries=b.json']), /Duplicate --queries/);
  assert.throws(() => parseArgs(['report', '--json', '--json']), /Duplicate --json/);
});

test('parseReportQueries validates shape, scope and nonempty queries', () => {
  assert.deepEqual(parseReportQueries([{ scope: 'code', query: 'travel' }]), [
    { scope: 'code', query: 'travel' },
  ]);
  assert.throws(() => parseReportQueries({ code: ['travel'] }), /JSON array/);
  assert.throws(() => parseReportQueries([null]), /only "scope" and "query"/);
  assert.throws(() => parseReportQueries([{ scope: 'code', query: 'travel', typo: true }]), /only "scope" and "query"/);
  assert.throws(() => parseReportQueries([{ scope: 'wrong', query: 'travel' }]), /invalid scope/);
  assert.throws(() => parseReportQueries([{ scope: 'code', query: '  ' }]), /non-empty string/);
});

// ---------------------------------------------------------------------------------------------
// formatExplain
// ---------------------------------------------------------------------------------------------
function buildFixtureResponse() {
  return {
    query: 'wife travel',
    scope: 'code',
    exact: false,
    shortcut: null,
    concepts: [
      {
        label: 'wife',
        quoted: false,
        matched: true,
        members: [
          {
            text: 'wife', source: 'query', weight: 1, matched: true,
          },
          {
            text: 'spouse', source: 'phrasebook', weight: 0.7, matched: true,
          },
        ],
      },
      {
        label: 'exact phrase',
        quoted: true,
        matched: false,
        members: [
          {
            text: 'exact phrase', source: 'query', weight: 1, matched: false,
          },
        ],
      },
    ],
    corrections: [{ from: 'trravel', to: 'travel' }],
    results: [
      {
        id: 'code/example-section',
        type: 'provision',
        label: 'Provision',
        title: 'Example section',
        location: 'Chapter 5 › Example section',
        target: { kind: 'code-section', chapterId: 'ch5', anchor: 'example-section' },
        score: Infinity,
        coverage: 1,
        proximity: 1,
        snippet: {
          text: 'This is matched text.',
          highlights: [[8, 15]],
        },
        matched: [
          {
            concept: 'wife', text: 'wife', source: 'query', field: 'body',
          },
        ],
      },
    ],
    appResults: [],
    allTermsMatched: true,
    highlight: null,
  };
}

test('formatExplain includes the section headings, snippet markers and the Infinity symbol', () => {
  const output = formatExplain(buildFixtureResponse(), { limit: 10, buildTimeMs: 12.4, queryTimeMs: 3.1 });

  assert.match(output, /Scope: code/);
  assert.match(output, /Query: wife travel/);
  assert.match(output, /Interpretation/);
  assert.match(output, /Spelling corrections/);
  assert.match(output, /Results/);
  assert.match(output, /App content \(not Code text\)/);
  assert.ok(output.includes('[[matched]]'), 'expected the snippet highlight to render as [[matched]]');
  assert.ok(output.includes('∞'), 'expected the Infinity score to render as the ∞ symbol');
  assert.ok(output.includes('(exact)'), 'expected the quoted concept to be marked exact');
  assert.ok(output.includes('trravel -> travel'), 'expected the spelling correction to be listed');
});

test('formatExplain reports no concepts, no results and no corrections gracefully', () => {
  const output = formatExplain({
    query: '   ',
    scope: 'transparency',
    exact: false,
    shortcut: null,
    concepts: [],
    corrections: [],
    results: [],
    appResults: [],
    allTermsMatched: false,
    highlight: null,
  });

  assert.match(output, /Interpretation/);
  assert.match(output, /\(no concepts identified\)/);
  assert.match(output, /Spelling corrections:\n  none/);
  assert.match(output, /\(no results\)/);
  assert.match(output, /Publication details \(not Guidelines text\)/);
});

test('formatExplain prints the exact-phrase suggestion only when there is one', () => {
  const withSuggestion = formatExplain({ ...buildFixtureResponse(), phraseSuggestion: '"in kind"' });
  assert.match(withSuggestion, /Phrase suggestion: "in kind"/);

  const without = formatExplain({ ...buildFixtureResponse(), phraseSuggestion: null });
  assert.doesNotMatch(without, /Phrase suggestion/);
});

test('formatExplain reports a shortcut when present', () => {
  const output = formatExplain({
    query: 'Q&A 31',
    scope: 'code',
    exact: false,
    shortcut: 'qa-number',
    concepts: [],
    corrections: [],
    results: [],
    appResults: [],
    allTermsMatched: true,
    highlight: null,
  });

  assert.match(output, /Shortcut: qa-number/);
});

// ---------------------------------------------------------------------------------------------
// CLI process behaviour
// ---------------------------------------------------------------------------------------------
test('spawning "explain" with a real query exits 0 and prints Interpretation and Results', () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, 'explain', 'travel'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Interpretation/);
  assert.match(result.stdout, /Results/);
});

test('spawning with no arguments exits 1 and prints usage', () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(`${result.stdout}${result.stderr}`, /Usage/);
});

test('bare report keeps its existing plain-text summary', () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, 'report'], {
    cwd: PROJECT_ROOT, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Search report \(informational only/);
  assert.match(result.stdout, /Scope: code/);
  assert.match(result.stdout, /Scope: transparency/);
  assert.match(result.stdout, /Self-retrieval/);
  assert.doesNotMatch(result.stdout, /"stemCollisions"/);
});

test('report --queries --json emits query interpretation, result and collision diagnostics', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'search-report-test-'));
  try {
    const path = resolve(directory, 'queries.json');
    writeFileSync(path, JSON.stringify([
      { scope: 'code', query: 'unfamiliar phrase' },
      { scope: 'transparency', query: 'disclosure' },
    ]));
    const result = spawnSync(process.execPath, [SCRIPT_PATH, 'report', '--queries', path, '--json'], {
      cwd: PROJECT_ROOT, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.queries.map(({ scope, query }) => ({ scope, query })), [
      { scope: 'code', query: 'unfamiliar phrase' },
      { scope: 'transparency', query: 'disclosure' },
    ]);
    for (const query of report.queries) {
      assert.ok(Array.isArray(query.concepts));
      assert.ok(Array.isArray(query.unmatchedTerms));
      assert.ok(Array.isArray(query.topResults));
      assert.equal(typeof query.queryTimeMs, 'number');
    }
    assert.deepEqual(report.stemCollisions.map(({ scope }) => scope), ['code', 'transparency']);
    assert.equal(typeof report.timing.buildTimeMs, 'number');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('report rejects missing, invalid JSON and malformed query files with a nonzero exit', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'search-report-invalid-'));
  try {
    const path = resolve(directory, 'queries.json');
    const invoke = (file) => spawnSync(process.execPath, [SCRIPT_PATH, 'report', '--queries', file, '--json'], {
      cwd: PROJECT_ROOT, encoding: 'utf8',
    });
    assert.match(invoke(resolve(directory, 'missing.json')).stderr, /Could not read query file/);
    writeFileSync(path, '{');
    const invalidJson = invoke(path);
    assert.equal(invalidJson.status, 1);
    assert.match(invalidJson.stderr, /Invalid JSON in query file/);
    writeFileSync(path, JSON.stringify([{ scope: 'code', query: '' }]));
    const invalidQuery = invoke(path);
    assert.equal(invalidQuery.status, 1);
    assert.match(invalidQuery.stderr, /non-empty string/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
