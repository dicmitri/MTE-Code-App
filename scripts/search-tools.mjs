// Command-line tools that let maintainers see how the deterministic search (src/utils/
// searchEngine.js) interprets and ranks a query, without opening the app in a browser. Two
// subcommands:
//
//   node scripts/search-tools.mjs explain "<query>" [--scope code|transparency] [--limit N]
//   node scripts/search-tools.mjs report
//
// "explain" prints exactly how one query was understood (its concepts, spelling corrections,
// and ranked hits) for one search scope. "report" runs a fixed list of everyday example queries
// against both scopes and prints the top few hits for each, plus a self-retrieval check (can
// every authoritative document be found by searching its own wording?). Both commands are
// read-only: they print plain text and never change a file.
import { performance } from 'node:perf_hooks';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { loadSearchIndexes } from './lib/search-content.mjs';
import { runSearch } from '../src/utils/searchEngine.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');

const VALID_SCOPES = new Set(['code', 'transparency']);
const DEFAULT_SCOPE = 'code';
const DEFAULT_LIMIT = 10;

const USAGE = [
  'Usage:',
  '  node scripts/search-tools.mjs explain "<query>" [--scope code|transparency] [--limit N]',
  '  node scripts/search-tools.mjs report',
  '',
  'explain prints how one query is interpreted and ranked in a search scope',
  '(default scope: "code", default limit: 10 results).',
  '',
  'report runs a fixed list of everyday example queries against both scopes and prints a',
  'short, informational summary. It never asserts anything about the content.',
].join('\n');

// -------------------------------------------------------------------------------------------
// Argument parsing (pure).
// -------------------------------------------------------------------------------------------
export function parseArgs(argv) {
  const args = Array.isArray(argv) ? [...argv] : [];
  const command = args.shift();

  if (command === 'report') {
    if (args.length > 0) {
      throw new Error(`"report" takes no arguments (got "${args[0]}").`);
    }
    return { command: 'report' };
  }

  if (command === 'explain') {
    const queryParts = [];
    let scope = DEFAULT_SCOPE;
    let limit = DEFAULT_LIMIT;

    for (let i = 0; i < args.length; i += 1) {
      const arg = args[i];
      if (arg === '--scope') {
        i += 1;
        scope = args[i];
      } else if (arg.startsWith('--scope=')) {
        scope = arg.slice('--scope='.length);
      } else if (arg === '--limit') {
        i += 1;
        limit = args[i];
      } else if (arg.startsWith('--limit=')) {
        limit = arg.slice('--limit='.length);
      } else {
        queryParts.push(arg);
      }
    }

    const query = queryParts.join(' ').trim();
    if (!query) {
      throw new Error('Missing query. Usage: explain "<query>" [--scope code|transparency] [--limit N]');
    }
    if (!VALID_SCOPES.has(scope)) {
      throw new Error(`Unknown scope "${scope}". Expected "code" or "transparency".`);
    }
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      throw new Error(`Invalid --limit "${limit}". Expected a positive whole number.`);
    }

    return {
      command: 'explain', query, scope, limit: parsedLimit,
    };
  }

  throw new Error(`Unknown command "${command ?? ''}". Expected "explain" or "report".`);
}

// -------------------------------------------------------------------------------------------
// Shared formatting helpers (pure).
// -------------------------------------------------------------------------------------------
function formatNumber(value) {
  if (value === Infinity) return '∞';
  if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a';
  return value.toFixed(2);
}

function formatMs(value) {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `${Math.round(number)}ms`;
}

// Renders a snippet's text with each highlighted range wrapped in [[...]], using the character
// offsets SearchHit.snippet.highlights gives relative to snippet.text.
function renderSnippetText(snippet) {
  if (!snippet || !snippet.text) return '(no snippet)';
  const { text, highlights } = snippet;
  if (!Array.isArray(highlights) || highlights.length === 0) return text;

  const marks = [...highlights].sort((a, b) => a[0] - b[0]);
  let rendered = '';
  let cursor = 0;
  for (const [start, end] of marks) {
    if (!(start >= cursor) || !(end > start)) continue; // ignore out-of-order/overlapping ranges
    rendered += text.slice(cursor, start);
    rendered += `[[${text.slice(start, end)}]]`;
    cursor = end;
  }
  rendered += text.slice(cursor);
  return rendered;
}

function formatConceptLines(concept, position) {
  const label = concept.quoted ? `"${concept.label}" (exact)` : concept.label;
  const lines = [`  ${position + 1}. ${label}`];
  for (const member of concept.members || []) {
    lines.push(
      `       - ${member.text} (source: ${member.source}, weight: ${formatNumber(member.weight)}, `
        + `matched: ${member.matched ? 'yes' : 'no'})`,
    );
  }
  return lines;
}

function formatHitLines(hit, rank) {
  const lines = [];
  lines.push(`  ${rank}. ${hit.title} (${hit.label})`);
  lines.push(`       location: ${hit.location || '(none)'}`);
  lines.push(`       id: ${hit.id}`);
  lines.push(
    `       score: ${formatNumber(hit.score)}, coverage: ${formatNumber(hit.coverage)}, `
      + `proximity: ${formatNumber(hit.proximity)}`,
  );
  if (hit.matched && hit.matched.length > 0) {
    lines.push('       matched:');
    for (const match of hit.matched) {
      lines.push(`         - ${match.text} (source: ${match.source}, field: ${match.field})`);
    }
  } else {
    lines.push('       matched: (none)');
  }
  lines.push(`       snippet: ${renderSnippetText(hit.snippet)}`);
  return lines;
}

function formatHitList(heading, hits, totalCount) {
  const lines = [`${heading} (showing ${hits.length} of ${totalCount}):`];
  if (hits.length === 0) {
    lines.push('  (no results)');
  } else {
    hits.forEach((hit, index) => lines.push(...formatHitLines(hit, index + 1)));
  }
  return lines;
}

// -------------------------------------------------------------------------------------------
// explain
// -------------------------------------------------------------------------------------------
export function formatExplain(response, options = {}) {
  const { limit = DEFAULT_LIMIT, buildTimeMs = 0, queryTimeMs = 0 } = options;
  const lines = [];

  lines.push(`Scope: ${response.scope}`);
  lines.push(`Query: ${response.query}`);
  if (response.shortcut) lines.push(`Shortcut: ${response.shortcut}`);
  lines.push('');

  lines.push('Interpretation:');
  if (!response.concepts || response.concepts.length === 0) {
    lines.push('  (no concepts identified)');
  } else {
    response.concepts.forEach((concept, index) => lines.push(...formatConceptLines(concept, index)));
  }
  lines.push('');

  lines.push('Spelling corrections:');
  if (!response.corrections || response.corrections.length === 0) {
    lines.push('  none');
  } else {
    response.corrections.forEach((correction) => lines.push(`  - ${correction.from} -> ${correction.to}`));
  }
  lines.push('');

  if (response.phraseSuggestion) {
    lines.push(`Phrase suggestion: ${response.phraseSuggestion}`);
    lines.push('');
  }

  const results = (response.results || []).slice(0, limit);
  lines.push(...formatHitList('Results', results, response.results?.length ?? 0));
  lines.push('');

  const appResults = (response.appResults || []).slice(0, limit);
  const appHeading = response.scope === 'transparency'
    ? 'Publication details (not Guidelines text)'
    : 'App content (not Code text)';
  lines.push(...formatHitList(appHeading, appResults, response.appResults?.length ?? 0));
  lines.push('');

  lines.push(`Build time: ${formatMs(buildTimeMs)}. Query time: ${formatMs(queryTimeMs)}.`);

  return lines.join('\n');
}

function runExplain({ query, scope, limit }) {
  const buildStart = performance.now();
  const indexes = loadSearchIndexes(PROJECT_ROOT);
  const buildTimeMs = performance.now() - buildStart;

  const index = indexes[scope];
  const queryStart = performance.now();
  const response = runSearch(index, query);
  const queryTimeMs = performance.now() - queryStart;

  console.log(formatExplain(response, { limit, buildTimeMs, queryTimeMs }));
}

// -------------------------------------------------------------------------------------------
// report
// -------------------------------------------------------------------------------------------
export const REPORT_QUERIES = Object.freeze({
  code: Object.freeze([
    'wife travel',
    'spouse travel',
    'doctor congress travel',
    'educational grant hospital',
    'hospital donation',
    'free booth',
    'paying a speaker',
    'consultacy agrrement',
    'business class',
    'airfare',
    'golf weekend',
    'honorarium',
    'hcp gift',
    'flight',
    'Q&A 31',
    'free sample',
    'pen',
    'bribe',
  ]),
  transparency: Object.freeze([
    'currency',
    'disclose payments',
    'methodology note update',
  ]),
});

const REPORT_TOP_N = 5;
const SELF_RETRIEVAL_TOP_N = 3;

// A reader would look for a document the way it is titled: a Q&A by its question, a definition
// by its term (dropping a trailing "(ABBR)"), anything else by its chapter/section context plus
// its own heading. This mirrors the self-retrieval check in tests/searchQuality.test.mjs.
function selfRetrievalQuery(doc) {
  if (doc.type === 'qa') return doc.fields.title;
  if (doc.type === 'definition') return doc.fields.title.replace(/\s*\([^)]*\)$/, '');
  return `${doc.fields.context.split(/\s+/).slice(0, 6).join(' ')} ${doc.fields.title}`;
}

// Runs every example query and the self-retrieval check for both scopes, timing each runSearch
// call. Not pure (it calls runSearch and reads the clock), but deterministic given `indexes`.
export function buildReportData(indexes) {
  const queryTimesMs = [];
  const scopes = [];
  const zeroResultQueries = [];

  for (const [scope, queries] of Object.entries(REPORT_QUERIES)) {
    const index = indexes[scope];
    const queryReports = queries.map((query) => {
      const start = performance.now();
      const response = runSearch(index, query);
      queryTimesMs.push(performance.now() - start);
      if (response.results.length === 0) zeroResultQueries.push({ scope, query });
      return { query, hits: response.results.slice(0, REPORT_TOP_N) };
    });
    scopes.push({ scope, queries: queryReports });
  }

  const selfRetrieval = Object.entries(indexes).map(([scope, index]) => {
    const documents = index.docs.filter((doc) => doc.authoritative);
    const misses = documents.filter((doc) => {
      const start = performance.now();
      const response = runSearch(index, selfRetrievalQuery(doc));
      queryTimesMs.push(performance.now() - start);
      return !response.results.slice(0, SELF_RETRIEVAL_TOP_N).some((hit) => hit.id === doc.id);
    });
    const rate = documents.length === 0 ? 1 : (documents.length - misses.length) / documents.length;
    return {
      scope, total: documents.length, misses, rate,
    };
  });

  const averageQueryTimeMs = queryTimesMs.length > 0
    ? queryTimesMs.reduce((sum, value) => sum + value, 0) / queryTimesMs.length
    : 0;

  return {
    scopes, zeroResultQueries, selfRetrieval, averageQueryTimeMs, queryCount: queryTimesMs.length,
  };
}

export function formatReport(reportData, options = {}) {
  const { buildTimeMs = 0 } = options;
  const lines = [];

  lines.push('Search report (informational only -- does not assert anything about the content)');
  lines.push('');

  for (const { scope, queries } of reportData.scopes) {
    lines.push(`Scope: ${scope}`);
    for (const { query, hits } of queries) {
      lines.push(`  "${query}"`);
      if (hits.length === 0) {
        lines.push('    (no results)');
      } else {
        hits.forEach((hit, index) => {
          lines.push(`    ${index + 1}. ${hit.label} — ${hit.title} (${hit.id})`);
        });
      }
    }
    lines.push('');
  }

  lines.push('Zero-result queries:');
  if (reportData.zeroResultQueries.length === 0) {
    lines.push('  none');
  } else {
    reportData.zeroResultQueries.forEach(({ scope, query }) => lines.push(`  - [${scope}] "${query}"`));
  }
  lines.push('');

  lines.push('Self-retrieval (share of authoritative documents found in the top 3 by their own wording):');
  for (const {
    scope, total, misses, rate,
  } of reportData.selfRetrieval) {
    lines.push(`  ${scope}: ${(rate * 100).toFixed(1)}% (${total - misses.length}/${total})`);
    if (misses.length > 0) {
      lines.push('    Missed:');
      misses.forEach((doc) => lines.push(`      - ${doc.id} (${doc.title})`));
    }
  }
  lines.push('');

  const queryWord = reportData.queryCount === 1 ? 'query' : 'queries';
  lines.push(
    `Build time: ${formatMs(buildTimeMs)}. Average query time: ${reportData.averageQueryTimeMs.toFixed(2)}ms `
      + `over ${reportData.queryCount} ${queryWord}.`,
  );

  return lines.join('\n');
}

function runReport() {
  const buildStart = performance.now();
  const indexes = loadSearchIndexes(PROJECT_ROOT);
  const buildTimeMs = performance.now() - buildStart;

  const reportData = buildReportData(indexes);
  console.log(formatReport(reportData, { buildTimeMs }));
}

// -------------------------------------------------------------------------------------------
// main
// -------------------------------------------------------------------------------------------
export function main(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    console.error('');
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  try {
    if (parsed.command === 'explain') {
      runExplain(parsed);
    } else {
      runReport();
    }
  } catch (error) {
    console.error(`search-tools could not run: ${error.message}`);
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main();
}
