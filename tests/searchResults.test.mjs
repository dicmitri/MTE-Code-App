import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { register } from 'tsx/esm/api';

// SearchResults.jsx and Highlight.jsx are .jsx -- Node's default loader can't parse JSX, so they
// are loaded through tsx's register(), the same approach tests/glossaryInteraction.test.mjs uses
// for DefinitionPopup.jsx.
const componentModules = register({ namespace: 'search-results-test' });
const { SearchResults } = await componentModules.import(
  '../src/components/SearchResults.jsx',
  import.meta.url,
);
const { Highlight } = await componentModules.import(
  '../src/components/Highlight.jsx',
  import.meta.url,
);

const noop = () => {};

// Synthetic, hand-built SearchHit/response fixtures only -- never real Code or Transparency
// content (AGENTS.md's zero-upkeep rule: search tests must never depend on specific content).
const makeHit = (overrides = {}) => ({
  id: 'fx/hit-1',
  type: 'provision',
  label: 'Provision',
  title: 'Guests at Events',
  location: 'Fixture Chapter › Guests',
  target: { kind: 'code-section', chapterId: 'fx-ch', anchor: 'fx-ch-guests' },
  score: 12.34,
  coverage: 1,
  proximity: 1.3,
  snippet: null,
  matched: [],
  ...overrides,
});

const makeResponse = (overrides = {}) => ({
  query: 'wife travel',
  scope: 'code',
  exact: false,
  shortcut: null,
  concepts: [],
  corrections: [],
  results: [makeHit()],
  appResults: [],
  allTermsMatched: true,
  highlight: null,
  ...overrides,
});

const render = (props) => renderToStaticMarkup(
  React.createElement(SearchResults, { onSelect: noop, ...props }),
);

test('renders each result type badge with its label', () => {
  const html = render({
    response: makeResponse({
      results: [
        makeHit({
          id: 'fx/provision', type: 'provision', label: 'Provision', title: 'Provision Title',
        }),
        makeHit({
          id: 'fx/qa', type: 'qa', label: 'Q&A 8', title: 'Q&A Title',
        }),
        makeHit({
          id: 'fx/definition', type: 'definition', label: 'Definition', title: 'Definition Title',
        }),
      ],
    }),
  });

  assert.match(html, />Provision</);
  assert.match(html, />Q&amp;A 8</);
  assert.match(html, />Definition</);
});

test('renders a snippet <mark> around exactly the highlighted substring', () => {
  const html = render({
    response: makeResponse({
      results: [
        makeHit({
          snippet: {
            text: 'A wife or husband may attend as a guest under the same conditions.',
            highlights: [[2, 6]],
          },
        }),
      ],
    }),
  });

  assert.match(html, /<mark class="bg-yellow-200 text-black rounded px-0\.5">wife<\/mark>/);
  // Only the highlighted range is marked -- the rest of the snippet stays plain text.
  assert.doesNotMatch(html, /<mark[^>]*>A wife/);
});

test('the Matched line attributes an expanded member to its concept', () => {
  const html = render({
    response: makeResponse({
      results: [
        makeHit({
          matched: [
            {
              concept: 'wife', text: 'wife', source: 'query', field: 'body',
            },
            {
              concept: 'wife', text: 'spouse', source: 'phrasebook', field: 'body',
            },
          ],
        }),
      ],
    }),
  });

  assert.match(html, /Matched:/);
  assert.match(html, /wife/);
  // Quote glyph is a presentational choice; what matters is the attribution reads "spouse (for
  // <quote>wife<quote>)".
  assert.match(html, /spouse \(for [“"]wife[”"]\)/);
});

test('the Matched line marks a spelling correction and skips entries with no concept', () => {
  const html = render({
    response: makeResponse({
      results: [
        makeHit({
          matched: [
            {
              concept: 'consultancy', text: 'consultancy', source: 'spelling', field: 'body',
            },
            {
              concept: null, text: 'should not appear', source: 'query', field: 'body',
            },
          ],
        }),
      ],
    }),
  });

  assert.match(html, /consultancy \(spelling\)/);
  assert.doesNotMatch(html, /should not appear/);
});

test('shows the "Also searching" and "Spelling" interpretation lines', () => {
  const html = render({
    response: makeResponse({
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
            // Unmatched in scope -- must not be counted or shown.
            {
              text: 'partner', source: 'phrasebook', weight: 0.7, matched: false,
            },
          ],
        },
      ],
      corrections: [{ from: 'consultacy', to: 'consultancy' }, { from: 'agrrement', to: 'agreement' }],
    }),
  });

  assert.match(html, /Also searching/);
  assert.match(html, /spouse/);
  assert.doesNotMatch(html, /partner/);
  assert.match(html, /Spelling:/);
  assert.match(html, /consultacy.*consultancy/);
  assert.match(html, /agrrement.*agreement/);
});

test('shows the partial-coverage notice when allTermsMatched is false, not when true', () => {
  const partial = render({
    response: makeResponse({ allTermsMatched: false }),
  });
  assert.match(partial, /No result contains all your words/);

  const full = render({
    response: makeResponse({ allTermsMatched: true }),
  });
  assert.doesNotMatch(full, /No result contains all your words/);
});

test('names words that match nothing, unless there are no results at all', () => {
  const concepts = [
    { label: 'medical', quoted: false, matched: true, members: [{ text: 'medical', source: 'query', weight: 1, matched: true }] },
    { label: 'students', quoted: false, matched: false, members: [] },
  ];
  const withResults = render({ response: makeResponse({ concepts }) });
  assert.ok(withResults.includes('No match for “students”; showing results for your other words.'));
  assert.ok(!withResults.includes('“medical”'));

  const withoutResults = render({ response: makeResponse({ concepts, results: [] }) });
  assert.ok(!withoutResults.includes('No match for'));
  assert.ok(withoutResults.includes('No results for'));
});

test('shows the tip only when an expansion or correction was used', () => {
  // React's server renderer escapes quotes in text nodes as &quot;.
  const withCorrection = render({
    response: makeResponse({ corrections: [{ from: 'agrrement', to: 'agreement' }] }),
  });
  assert.match(withCorrection, /Use &quot;quotes&quot; for exact wording\./);

  const plain = render({ response: makeResponse() });
  assert.doesNotMatch(plain, /Use &quot;quotes&quot; for exact wording\./);
});

test('renders appResults under the "not Code text" heading in the Code scope, muted', () => {
  const html = render({
    response: makeResponse({
      results: [],
      appResults: [
        makeHit({
          id: 'fx/summary', type: 'summary', label: 'App summary', title: 'Chapter Overview',
        }),
      ],
    }),
    scope: 'code',
  });

  assert.match(html, /App content.{0,3}not Code text/);
  assert.match(html, /Chapter Overview/);
});

test('uses the Guidelines-text heading for appResults in the Transparency scope', () => {
  const html = render({
    response: makeResponse({
      results: [],
      appResults: [
        makeHit({
          id: 'fx/publication', type: 'publication', label: 'Publication', title: 'Disclosure Guidelines',
        }),
      ],
    }),
    scope: 'transparency',
  });

  assert.match(html, /Publication details.{0,3}not Guidelines text/);
});

test('typeFilter hides filtered-out result types', () => {
  const html = render({
    response: makeResponse({
      results: [
        makeHit({
          id: 'fx/provision', type: 'provision', title: 'Provision Only Title',
        }),
        makeHit({
          id: 'fx/qa', type: 'qa', label: 'Q&A 8', title: 'QA Only Title',
        }),
      ],
    }),
    typeFilter: new Set(['qa']),
  });

  assert.doesNotMatch(html, /Provision Only Title/);
  assert.match(html, /QA Only Title/);
  // Summary line reflects the post-filter count.
  assert.match(html, /1 result/);
});

test('result buttons are disabled while isStale', () => {
  // Match the boolean HTML attribute itself (disabled=""), not the "disabled:opacity-50"
  // Tailwind class name that is always present in the button's class list.
  const html = render({ response: makeResponse(), isStale: true });
  assert.match(html, /<button type="button" disabled=""/);
});

test('result buttons are not disabled once results are current', () => {
  const html = render({ response: makeResponse(), isStale: false });
  assert.doesNotMatch(html, /disabled=""/);
});

test('debug mode shows score/coverage/proximity, the hit id and matched sources', () => {
  const withDebug = render({
    response: makeResponse({
      results: [
        makeHit({
          id: 'fx/debug-hit',
          score: Infinity,
          coverage: 0.5,
          proximity: 1.256,
          matched: [
            {
              concept: 'wife', text: 'wife', source: 'query', field: 'body',
            },
          ],
        }),
      ],
    }),
    debug: true,
  });

  assert.match(withDebug, /id: fx\/debug-hit/);
  assert.match(withDebug, /score: ∞/);
  assert.match(withDebug, /coverage: 0\.50/);
  assert.match(withDebug, /proximity: 1\.26/);
  assert.match(withDebug, /sources: query/);

  const withoutDebug = render({ response: makeResponse(), debug: false });
  assert.doesNotMatch(withoutDebug, /coverage: /);
});

test('shows the zero-results message when nothing matches after filtering', () => {
  const html = render({
    response: makeResponse({ query: 'zzznomatch', results: [], appResults: [] }),
  });

  assert.match(html, /No results for [“"]zzznomatch[”"]\./);
  assert.match(html, /Try other words, check the spelling, or browse the chapters\./);
  assert.doesNotMatch(html, /aria-label="Search results"/);
});

test('root carries no-print', () => {
  const html = render({ response: makeResponse() });
  assert.match(html, /class="no-print/);
});

test('Highlight wraps every alternative matched by a RegExp query', () => {
  const html = renderToStaticMarkup(
    React.createElement(Highlight, {
      text: 'A wife and a husband both attended.',
      query: /\b(wife|husband)\b/gi,
    }),
  );

  assert.match(html, /<mark class="bg-yellow-200 text-black rounded px-0\.5">wife<\/mark>/);
  assert.match(html, /<mark class="bg-yellow-200 text-black rounded px-0\.5">husband<\/mark>/);
});

test('Highlight still supports a plain string query', () => {
  const html = renderToStaticMarkup(
    React.createElement(Highlight, { text: 'A wife attends the event.', query: 'wife' }),
  );

  assert.match(html, /<mark class="bg-yellow-200 text-black rounded px-0\.5">wife<\/mark>/);
});

test('Highlight renders plain text unchanged with no query', () => {
  const html = renderToStaticMarkup(
    React.createElement(Highlight, { text: 'No highlighting here.', query: null }),
  );

  assert.doesNotMatch(html, /<mark/);
  assert.match(html, /No highlighting here\./);
});
