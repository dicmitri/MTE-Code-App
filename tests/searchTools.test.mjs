import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { formatExplain, parseArgs } from '../scripts/search-tools.mjs';

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
  assert.throws(() => parseArgs(['report', 'extra']), /takes no arguments/);
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
