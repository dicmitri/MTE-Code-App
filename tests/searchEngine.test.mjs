import assert from 'node:assert/strict';
import test from 'node:test';

import { createSearchIndex, runSearch, SEARCH_RANKING } from '../src/utils/searchEngine.js';

// Synthetic fixtures only -- this file never depends on real Code or Transparency content, so
// it can never break because the Code changed (AGENTS.md's zero-upkeep rule).
const FILLER = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet';

const makeDoc = (overrides) => ({
  type: 'provision',
  authoritative: true,
  label: 'Provision',
  qaNumber: null,
  location: 'Fixture',
  target: { kind: 'test', anchor: overrides.id },
  ...overrides,
  fields: { context: 'Fixture', ...overrides.fields },
});

const FIXTURE_PHRASEBOOK = {
  groups: [
    { from: ['doctor'], to: ['physician'] },
    { same: ['boat', 'vessel'] },
    // A oneWay bridge used only to prove abbreviations chain through a phrasebook expansion
    // (querying "streetlamp fund" must reach a document that only ever spells out "LSP").
    { from: ['streetlamp fund'], to: ['Lantern Society Program'] },
  ],
};

const FIXTURE_GLOSSARY = [
  {
    id: 'vessel-grant',
    term: 'Vessel Grant',
    headword: 'Vessel Grant',
    forms: ['Vessel Grant', 'Vessel Grants'],
    text: 'means funding for community boats used in a regatta or similar outreach event. '
      + 'A deposit is required before funds are released.',
  },
  {
    id: 'harbor-fee',
    term: 'Harbor Fee',
    headword: 'Harbor Fee',
    forms: ['Harbor Fee', 'Harbor Fees'],
    text: 'means a charge collected at docking, but does not cover a kiosk fee. '
      + 'A deposit and a deposit receipt are also required.',
  },
];

const FIXTURE_DOCUMENTS = [
  // doctor / physician: one-way phrasebook direction, and "your word first".
  makeDoc({
    id: 'fx/physician-only',
    title: 'Clinic Standards Overview',
    fields: {
      title: 'Clinic Standards Overview',
      context: 'Wellness Chapter',
      body: 'A physician at the clinic must review new patient intake forms every week for safety.',
    },
  }),
  makeDoc({
    id: 'fx/doctor-only',
    title: 'Home Visit Rules',
    fields: {
      title: 'Home Visit Rules',
      context: 'Wellness Chapter',
      body: 'A doctor making a home visit should carry identification at all times for safety.',
    },
  }),
  makeDoc({
    id: 'fx/wellness-summary',
    type: 'summary',
    authoritative: false,
    label: 'App summary',
    title: 'Wellness Chapter Overview',
    fields: {
      title: 'Wellness Chapter Overview',
      context: '',
      body: 'This chapter explains physician and doctor visit standards for the wellness program.',
    },
  }),
  // sponsor / dinner: used for quotes, spelling correction and completion.
  makeDoc({
    id: 'fx/sponsor-directory',
    title: 'Sponsor Directory',
    fields: {
      title: 'Sponsor Directory',
      context: 'Events Chapter',
      body: 'Sponsor list: sponsor Acme, sponsor Globex, sponsor Initech.',
    },
  }),
  makeDoc({
    id: 'fx/dinner-close',
    type: 'qa',
    title: 'Dinner Proximity Sample A',
    fields: {
      title: 'Dinner Proximity Sample A',
      context: 'Events Chapter',
      body: `A sponsor dinner ${FILLER}.`,
    },
  }),
  makeDoc({
    id: 'fx/dinner-far',
    type: 'qa',
    title: 'Dinner Proximity Sample B',
    fields: {
      title: 'Dinner Proximity Sample B',
      context: 'Events Chapter',
      body: `A sponsor ${FILLER} dinner.`,
    },
  }),
  // Lantern Society Program (LSP): abbreviation detection both ways.
  makeDoc({
    id: 'fx/lantern-defines-lsp',
    title: 'Lantern Society Program (LSP) Charter',
    fields: {
      title: 'Lantern Society Program (LSP) Charter',
      context: 'Community Chapter',
      body: 'The Lantern Society Program supports neighborhood lighting projects each autumn.',
    },
  }),
  makeDoc({
    id: 'fx/lsp-only',
    title: 'LSP Application Steps',
    fields: {
      title: 'LSP Application Steps',
      context: 'Community Chapter',
      body: 'Submit your LSP request through the online portal before the autumn deadline.',
    },
  }),
  makeDoc({
    id: 'fx/lantern-long-form-only',
    type: 'qa',
    title: 'How does the Lantern Society Program help residents?',
    fields: {
      title: 'How does the Lantern Society Program help residents?',
      context: 'Community Chapter',
      body: 'The Lantern Society Program installs lighting in public parks each year.',
    },
  }),
  // boat / vessel: two-way "same" group, and no-double-credit for two members.
  makeDoc({
    id: 'fx/boat-repeat',
    title: 'Boat Repeat Sample',
    fields: { title: 'Boat Repeat Sample', context: 'Transport Chapter', body: `boat ${FILLER} boat.` },
  }),
  makeDoc({
    id: 'fx/boat-vessel-mixed',
    title: 'Boat Vessel Mixed Sample',
    fields: { title: 'Boat Vessel Mixed Sample', context: 'Transport Chapter', body: `boat ${FILLER} vessel.` },
  }),
  makeDoc({
    id: 'fx/boat-only',
    type: 'qa',
    title: 'Where can a boat be launched?',
    fields: { title: 'Where can a boat be launched?', context: 'Transport Chapter', body: 'A boat may be launched from the north dock on weekends.' },
  }),
  makeDoc({
    id: 'fx/vessel-only',
    type: 'qa',
    title: 'What paperwork does a vessel need?',
    fields: { title: 'What paperwork does a vessel need?', context: 'Transport Chapter', body: 'A vessel needs a valid registration sticker before launching.' },
  }),
  // Q&A number shortcut.
  makeDoc({
    id: 'fx/qa-seven',
    type: 'qa',
    qaNumber: '7',
    title: 'Sample Question Seven',
    fields: { title: 'Sample Question Seven', context: 'Reference Chapter', body: 'This is the seventh sample answer for testing the Q&A number shortcut.' },
  }),
  makeDoc({
    id: 'fx/qa-three',
    type: 'qa',
    qaNumber: '3',
    title: 'Sample Question Three',
    fields: { title: 'Sample Question Three', context: 'Reference Chapter', body: 'This is the third sample answer for testing the Q&A number shortcut.' },
  }),
  // Definitions: the defined-term rule and Glossary links. Bodies are deliberately generic (the
  // link-triggering words live only in FIXTURE_GLOSSARY's `.text`) so a link can be told apart
  // from a document that would have matched anyway.
  makeDoc({
    id: 'fx/definition-vessel-grant',
    type: 'definition',
    label: 'Definition',
    title: 'Vessel Grant',
    location: 'Glossary',
    terms: ['Vessel Grant', 'Vessel Grants'],
    fields: { title: 'Vessel Grant', context: 'Glossary', body: 'General terms and conditions apply to this grant category.' },
  }),
  makeDoc({
    id: 'fx/definition-harbor-fee',
    type: 'definition',
    label: 'Definition',
    title: 'Harbor Fee',
    location: 'Glossary',
    terms: ['Harbor Fee', 'Harbor Fees'],
    fields: { title: 'Harbor Fee', context: 'Glossary', body: 'General terms and conditions apply to this fee category.' },
  }),
];

const buildFixtureIndex = () => createSearchIndex(FIXTURE_DOCUMENTS.map((doc) => ({ ...doc, fields: { ...doc.fields } })), {
  phrasebook: FIXTURE_PHRASEBOOK,
  glossary: FIXTURE_GLOSSARY,
  scope: 'fixture',
});

// createSearchIndex mutates its documents (adds a `k` property), so each test that needs its
// own isolated corpus rebuilds from a fresh deep-ish copy. The shared index below is built once
// and only ever read from.
const index = buildFixtureIndex();
const idsOf = (response) => response.results.map((hit) => hit.id);
const find = (response, id) => response.results.find((hit) => hit.id === id);

test('ranks full-coverage documents above partial-coverage documents', () => {
  const documents = [
    makeDoc({
      id: 'full',
      title: 'Sponsor Dinner Venue Music Policy',
      fields: { title: 'Sponsor Dinner Venue Music Policy', context: 'Events Chapter', body: 'A sponsor may fund a dinner at an approved venue with live music for volunteers.' },
    }),
    makeDoc({
      id: 'partial',
      title: 'Sponsor Dinner Venue Overview',
      fields: { title: 'Sponsor Dinner Venue Overview', context: 'Events Chapter', body: 'A sponsor may fund a dinner at an approved venue for volunteers without live entertainment.' },
    }),
  ];
  const localIndex = createSearchIndex(documents, { phrasebook: { groups: [] }, glossary: [], scope: 'coverage' });
  const response = runSearch(localIndex, 'sponsor dinner venue music');

  const full = find(response, 'full');
  const partial = find(response, 'partial');
  assert.ok(full, 'full-coverage document should be in results');
  assert.ok(partial, 'partial-coverage document should still clear the cutoff');
  assert.equal(full.coverage, 1);
  assert.ok(partial.coverage < 1, 'partial document should have partial coverage');
  assert.ok(full.score > partial.score, 'full coverage must outrank partial coverage');
});

test('orders same-coverage documents by proximity, closer words first', () => {
  const response = runSearch(index, 'sponsor dinner');
  const close = find(response, 'fx/dinner-close');
  const far = find(response, 'fx/dinner-far');

  assert.ok(close && far, 'both proximity samples should match');
  assert.equal(close.coverage, 1);
  assert.equal(far.coverage, 1);
  assert.ok(close.proximity > far.proximity, 'adjacent words must yield higher proximity');
  assert.ok(close.score > far.score, 'the closer document should rank first');
});

test('gives no double credit when two members of one concept both appear in a document', () => {
  // "boat" repeated twice (one member, tf from n=2) must outscore "boat" once plus its "same"
  // equivalent "vessel" once (two members, each n=1): the engine credits a document with its
  // single best-matching member per concept, never the sum of every member that matched.
  const response = runSearch(index, 'boat');
  const repeat = find(response, 'fx/boat-repeat');
  const mixed = find(response, 'fx/boat-vessel-mixed');

  assert.ok(repeat && mixed);
  assert.ok(repeat.score > mixed.score, 'two occurrences of one member must outscore one occurrence of two members');
});

test('applies the phrasebook one-way direction: "doctor" reaches "physician", not back', () => {
  const doctorQuery = runSearch(index, 'doctor');
  assert.ok(find(doctorQuery, 'fx/doctor-only'), 'the literal word must match');
  assert.ok(find(doctorQuery, 'fx/physician-only'), 'the phrasebook target must also match');

  const physicianQuery = runSearch(index, 'physician');
  assert.ok(find(physicianQuery, 'fx/physician-only'));
  assert.equal(find(physicianQuery, 'fx/doctor-only'), undefined, 'physician must not expand back to doctor-only content');
});

test('resolves a "same" phrasebook group two-way', () => {
  const boatQuery = runSearch(index, 'boat');
  assert.ok(find(boatQuery, 'fx/vessel-only'), '"boat" must reach a vessel-only document');

  const vesselQuery = runSearch(index, 'vessel');
  assert.ok(find(vesselQuery, 'fx/boat-only'), '"vessel" must reach a boat-only document');
});

test('puts your own word first: a literal match outranks a one-way expansion match', () => {
  const response = runSearch(index, 'doctor');
  const literal = find(response, 'fx/doctor-only');
  const expanded = find(response, 'fx/physician-only');

  assert.ok(literal && expanded);
  assert.equal(literal.matched[0].source, 'query');
  assert.equal(expanded.matched[0].source, 'phrasebook');
  assert.ok(literal.score > expanded.score, 'the document using the typed word should rank above the expansion-only document');
});

test('corrects an unknown word within its spelling budget', () => {
  const response = runSearch(index, 'sponser');
  const hit = find(response, 'fx/sponsor-directory');
  assert.ok(hit, 'the misspelling should still find the sponsor document');
  assert.equal(response.concepts[0].members[0].source, 'spelling');
  assert.equal(response.corrections.length, 1);
  assert.equal(response.corrections[0].from, 'sponser');
  assert.equal(response.corrections[0].to, 'sponsor');
});

test('does not correct a correctly spelled, known word', () => {
  const response = runSearch(index, 'sponsor');
  assert.equal(response.concepts[0].members[0].source, 'query');
  assert.equal(response.corrections.length, 0);
});

test('does not attempt spelling correction on a short (<=4 letter) unknown word', () => {
  // "dinr" is 4 letters (spellingBudget = 0) and is not close enough to be completed either
  // (it does not end the query while being typed further), so it must simply match nothing.
  const response = runSearch(index, 'dinr');
  assert.equal(response.concepts[0].members[0].source, 'query');
  assert.equal(response.concepts[0].members[0].text, 'dinr');
  assert.equal(response.results.length, 0);
});

test('detects an abbreviation and expands it both ways', () => {
  // Short form -> a document that only ever spells out the long form.
  const shortQuery = runSearch(index, 'LSP');
  const longFormOnly = find(shortQuery, 'fx/lantern-long-form-only');
  assert.ok(longFormOnly, '"LSP" must reach a document that never says "LSP"');
  assert.equal(longFormOnly.matched[0].source, 'abbreviation');

  // The long form, reached here through an unrelated phrasebook bridge (so it becomes a
  // concept member the same way it would from a Code phrasebook synonym), must in turn chain to
  // a document that only ever says "LSP".
  const bridgedQuery = runSearch(index, 'streetlamp fund');
  const shortFormOnly = find(bridgedQuery, 'fx/lsp-only');
  assert.ok(shortFormOnly, 'the phrasebook target must chain on to the abbreviation and reach "LSP"-only content');
  assert.equal(shortFormOnly.matched[0].source, 'abbreviation');

  // Typing the long form itself groups its words into one concept, which reaches "LSP"-only
  // content directly.
  const longQuery = runSearch(index, 'lantern society program');
  assert.deepEqual(longQuery.concepts.map((concept) => concept.label), ['lantern society program']);
  const typedLongForm = find(longQuery, 'fx/lsp-only');
  assert.ok(typedLongForm, 'the typed long form must reach a document that only says "LSP"');
  assert.equal(typedLongForm.matched[0].source, 'abbreviation');
});

test('a spelling correction anywhere in a phrase lowers the whole phrase\'s weight', () => {
  const response = runSearch(index, 'lantern society progrm ');
  assert.equal(response.concepts.length, 1);
  const [literal] = response.concepts[0].members;
  assert.equal(literal.source, 'spelling');
  assert.equal(literal.weight, SEARCH_RANKING.weights.spelling1);
  assert.equal(literal.text, 'Lantern Society Program');
});

test('links a rare word that appears in exactly one Glossary definition', () => {
  const response = runSearch(index, 'regatta');
  assert.deepEqual(idsOf(response), ['fx/definition-vessel-grant']);
  assert.equal(response.results[0].matched[0].source, 'glossary');
});

test('does not link a word that only appears in a negated clause', () => {
  const response = runSearch(index, 'kiosk');
  assert.equal(response.results.length, 0, '"kiosk" only appears in a "does not cover" clause and must not link to Harbor Fee');
});

test('does not link a word that appears in two different definitions', () => {
  const response = runSearch(index, 'deposit');
  assert.equal(response.results.length, 0, '"deposit" appears in both definitions and must not link to either');
});

test('the defined-term rule promotes an exact Glossary term to the top', () => {
  for (const query of ['Vessel Grant', 'vessel grants']) {
    const response = runSearch(index, query);
    assert.equal(response.results[0].id, 'fx/definition-vessel-grant', `query "${query}" should promote the definition first`);
    assert.equal(response.results[0].coverage, 1);
  }
});

test('the Q&A-number shortcut returns the matching Q&A by its position, not by ranking', () => {
  for (const query of ['Q&A 7', 'q&a7', 'QA 7', 'Q & A 7']) {
    const response = runSearch(index, query);
    assert.equal(response.shortcut, 'qa-number', `query "${query}"`);
    assert.deepEqual(idsOf(response), ['fx/qa-seven']);
    assert.equal(response.results[0].score, Infinity);
  }
});

test('falls back to a normal search when the Q&A number does not exist', () => {
  const response = runSearch(index, 'Q&A 999');
  assert.equal(response.shortcut, null);
  assert.equal(response.results.length, 0);
});

test('a quoted phrase requires the words to be consecutive and disables spelling correction', () => {
  const adjacent = runSearch(index, '"sponsor dinner"');
  assert.equal(adjacent.exact, true);
  assert.deepEqual(idsOf(adjacent), ['fx/dinner-close']);
  assert.equal(adjacent.results[0].coverage, 1);

  const notAdjacent = runSearch(index, '"sponsor dinner"');
  assert.equal(find(notAdjacent, 'fx/dinner-far'), undefined, 'the far-apart document must not match an exact phrase');

  const misspelledQuoted = runSearch(index, '"sponser dinner"');
  assert.equal(misspelledQuoted.results.length, 0, 'quotes must disable spelling correction');
});

test('completes the last unknown word while it is still being typed', () => {
  const typing = runSearch(index, 'spon');
  assert.ok(find(typing, 'fx/sponsor-directory'), 'an in-progress prefix should complete to a real word');
  assert.equal(typing.concepts[0].members[0].source, 'completion');

  const finishedWithSpace = runSearch(index, 'spon ');
  assert.equal(finishedWithSpace.results.length, 0, 'a trailing space means the word is finished, so completion must not apply');
});

test('multiword source components still complete alone, while full phrases and typos expand', () => {
  const documents = [
    makeDoc({ id: 'clinic', title: 'Clinic', fields: { title: 'Clinic', body: 'A clinic provides care.' } }),
    makeDoc({ id: 'centrepiece', title: 'Centrepiece', fields: { title: 'Centrepiece', body: 'A centrepiece is displayed.' } }),
  ];
  const localIndex = createSearchIndex(documents, {
    phrasebook: { groups: [{ from: ['medical centre'], to: ['clinic'] }] },
    glossary: [], scope: 'fixture',
  });

  const partial = runSearch(localIndex, 'centre');
  assert.equal(partial.concepts[0].members[0].source, 'completion');
  assert.ok(partial.results.some((hit) => hit.id === 'centrepiece'));

  const full = runSearch(localIndex, 'medical centre');
  assert.deepEqual(full.concepts.map((concept) => concept.label), ['medical centre']);
  assert.ok(full.results.some((hit) => hit.id === 'clinic'));

  const typo = runSearch(localIndex, 'medical centree ');
  assert.deepEqual(typo.concepts.map((concept) => concept.label), ['medical centree']);
  assert.equal(typo.concepts[0].members[0].source, 'spelling');
  assert.ok(typo.results.some((hit) => hit.id === 'clinic'));
});

test('a complete multiword source keeps its phrase suggestion and full-phrase highlighting', () => {
  const documents = [
    makeDoc({ id: 'free', title: 'Free', fields: { title: 'Free', body: 'Access is free.' } }),
    makeDoc({ id: 'literal', title: 'Literal', fields: { title: 'Literal', body: 'Access is at no cost.' } }),
    makeDoc({ id: 'costume', title: 'Costume', fields: { title: 'Costume', body: 'A costume is available.' } }),
  ];
  const localIndex = createSearchIndex(documents, {
    phrasebook: { groups: [{ from: ['at no cost'], to: ['free'] }] },
    glossary: [], scope: 'fixture',
  });
  const response = runSearch(localIndex, 'at no cost');
  assert.deepEqual(response.concepts.map((concept) => concept.label), ['at no cost']);
  assert.equal(response.phraseSuggestion, '"at no cost"');
  assert.ok(response.results.some((hit) => hit.id === 'free'));
  assert.ok(response.results.some((hit) => hit.id === 'literal'));
  assert.ok(response.highlight.test('at no cost'));
});

test('a target reached by multiple rules keeps its strongest weight regardless of group order', () => {
  const documents = [makeDoc({
    id: 'bus', title: 'Bus', fields: { title: 'Bus', body: 'A bus carries passengers.' },
  })];
  const groups = [
    { from: ['coach'], to: ['bus'] },
    { same: ['coach', 'bus'] },
  ];
  for (const orderedGroups of [groups, [...groups].reverse()]) {
    const localIndex = createSearchIndex(documents, {
      phrasebook: { groups: orderedGroups }, glossary: [], scope: 'fixture',
    });
    const response = runSearch(localIndex, 'coach ');
    const bus = response.concepts[0].members.find((member) => member.text === 'bus');
    assert.equal(bus.weight, SEARCH_RANKING.weights.same);
    assert.ok(response.results.some((hit) => hit.id === 'bus'));
  }
});

test('reports scope-specific phrasebook stem collisions with stable display text', () => {
  const documents = [
    makeDoc({ id: 'cars', title: 'Cars', fields: { title: 'Cars', body: 'Cars and car travel.' } }),
    makeDoc({ id: 'vehicle', title: 'Vehicle', fields: { title: 'Vehicle', body: 'A vehicle moves.' } }),
  ];
  const groups = [
    { from: ['cars'], to: ['vehicle'] },
    { from: ['car'], to: ['vehicles'] },
  ];
  for (const orderedGroups of [groups, [...groups].reverse()]) {
    const localIndex = createSearchIndex(documents, {
      phrasebook: { groups: orderedGroups }, glossary: [], scope: 'fixture',
    });
    assert.deepEqual(localIndex.phrasebookStemCollisions, [
      { key: 'car', phrases: ['car', 'cars'] },
      { key: 'vehicle', phrases: ['vehicle', 'vehicles'] },
    ]);
    const response = runSearch(localIndex, 'car ');
    assert.equal(response.concepts[0].members.find((member) => member.source === 'phrasebook').text, 'vehicle');
  }
});

test('splits results into an authoritative list and a smaller, separately cut-off app-content list', () => {
  const response = runSearch(index, 'doctor');
  assert.ok(response.results.every((hit) => hit.type !== 'summary'));
  assert.ok(response.appResults.length > 0, 'the non-authoritative summary should appear as an app result');
  assert.ok(response.appResults.every((hit) => hit.type === 'summary'));
  assert.ok(response.appResults.length <= SEARCH_RANKING.maxAppResults);
  assert.ok(response.results.length <= SEARCH_RANKING.maxResults);
});

test('the cutoff hides a weak, coverage-poor match relative to the top authoritative result', () => {
  const documents = [
    makeDoc({
      id: 'full',
      title: 'Volunteer Dinner Policy',
      fields: { title: 'Volunteer Dinner Policy', context: 'Events Chapter', body: 'Sponsors may fund a dinner for volunteers each quarter to celebrate milestones.' },
    }),
    makeDoc({
      id: 'weak',
      title: 'Sponsor Directory',
      fields: { title: 'Sponsor Directory', context: 'Events Chapter', body: 'Sponsor list: sponsor Acme, sponsor Globex, sponsor Initech.' },
    }),
  ];
  const localIndex = createSearchIndex(documents, { phrasebook: { groups: [] }, glossary: [], scope: 'cutoff' });
  const response = runSearch(localIndex, 'sponsor dinner');

  assert.equal(find(response, 'full')?.id, 'full');
  assert.equal(find(response, 'weak'), undefined, 'a partial match far below the top score must be cut off');
});

test('a snippet highlights the actual matched words, at real character offsets', () => {
  const response = runSearch(index, 'sponsor dinner');
  const hit = find(response, 'fx/dinner-close');
  assert.ok(hit.snippet);
  const { text, highlights } = hit.snippet;
  assert.ok(highlights.length >= 2);
  for (const [start, end] of highlights) {
    const matchedText = text.slice(start, end).toLowerCase();
    assert.ok(['sponsor', 'dinner'].includes(matchedText), `unexpected snippet highlight text "${matchedText}"`);
  }
});

test('snippet highlight offsets stay aligned when the snippet starts with an ellipsis', () => {
  const body = `${FILLER} ${FILLER} ${FILLER} The regatta deposit is refundable. ${FILLER}`;
  const localIndex = createSearchIndex(
    [makeDoc({ id: 'long-body', title: 'Long Body', fields: { title: 'Long Body', context: 'C', body } })],
    { phrasebook: { groups: [] }, glossary: [], scope: 'snippet' },
  );
  const { text, highlights } = runSearch(localIndex, 'regatta deposit').results[0].snippet;

  assert.ok(text.startsWith('…'), 'a match deep in the body must produce a truncated snippet');
  assert.equal(highlights.length, 2);
  assert.deepEqual(
    highlights.map(([start, end]) => text.slice(start, end)),
    ['regatta', 'deposit'],
  );
});

test('the highlight RegExp covers expansion surface forms actually present in the scope', () => {
  const response = runSearch(index, 'doctor');
  assert.ok(response.highlight instanceof RegExp);
  assert.ok('A physician at the clinic'.match(response.highlight), 'the phrasebook expansion word must be covered');
  assert.ok('A doctor visits'.match(response.highlight), 'the literal query word must be covered');
  assert.equal('unrelated text here'.match(response.highlight), null);
});

test('ignores malformed phrasebook entries without throwing, and still applies the valid ones', () => {
  const documents = [
    makeDoc({ id: 'alpha-doc', title: 'Alpha Doc', fields: { title: 'Alpha Doc', context: 'C', body: 'This entry mentions beta only.' } }),
    makeDoc({ id: 'beta-doc', title: 'Beta Doc', fields: { title: 'Beta Doc', context: 'C', body: 'This entry mentions alpha content for testing.' } }),
    makeDoc({ id: 'gamma-doc', title: 'Gamma Doc', fields: { title: 'Gamma Doc', context: 'C', body: 'This entry mentions delta content for testing.' } }),
  ];
  const malformedPhrasebook = {
    groups: [
      { same: ['alpha', 'beta'] }, // valid
      { same: ['onlyone'] }, // too few members
      { from: ['x'], to: [] }, // empty "to"
      { from: [], to: ['y'] }, // empty "from"
      { foo: 'bar' }, // wrong shape
      null,
      'just a string',
      42,
      [1, 2, 3],
      { from: ['gamma'], to: ['delta'], note: 'ignore me' }, // valid, with an extra key
    ],
  };

  assert.doesNotThrow(() => {
    const localIndex = createSearchIndex(documents, { phrasebook: malformedPhrasebook, glossary: [], scope: 'malformed' });
    const alpha = runSearch(localIndex, 'alpha');
    assert.ok(find(alpha, 'beta-doc'), 'the valid "same" group must still work');
    const gamma = runSearch(localIndex, 'gamma');
    assert.ok(find(gamma, 'gamma-doc'), 'a valid rule with an unknown extra key must still work');
  });
});

test('handles empty and whitespace-only queries with no concepts and no results', () => {
  for (const query of ['', '   ', '\t\n']) {
    const response = runSearch(index, query);
    assert.deepEqual(response.concepts, []);
    assert.deepEqual(response.results, []);
    assert.deepEqual(response.appResults, []);
    assert.equal(response.allTermsMatched, false);
    assert.equal(response.highlight, null);
  }
});

test('handles a query made only of stopwords', () => {
  const response = runSearch(index, 'the of and');
  assert.deepEqual(response.concepts, []);
  assert.deepEqual(response.results, []);
});

// ---------------------------------------------------------------------------------------------
// Phrases with small words ("in kind", "at no cost") are matched word for word, small words
// included. A separate corpus, so the shared fixture's rankings above never move.
// ---------------------------------------------------------------------------------------------
const PHRASE_DOCUMENTS = [
  makeDoc({
    id: 'px/in-kind',
    title: 'Support Rules',
    fields: { title: 'Support Rules', context: 'Support Chapter', body: 'Support may be provided in kind at the congress, subject to approval.' },
  }),
  makeDoc({
    id: 'px/hyphenated',
    type: 'qa',
    title: 'What is an In-Kind grant?',
    fields: { title: 'What is an In-Kind grant?', context: 'Support Chapter', body: 'It is a grant given as goods or services rather than money.' },
  }),
  makeDoc({
    id: 'px/kinds',
    title: 'Record Keeping',
    fields: { title: 'Record Keeping', context: 'Records Chapter', body: 'All kinds of support need written records kept for five years.' },
  }),
  makeDoc({
    id: 'px/travel-cost',
    title: 'Travel Expenses',
    fields: { title: 'Travel Expenses', context: 'Travel Chapter', body: 'The travel cost must be reasonable and documented.' },
  }),
  makeDoc({
    id: 'px/complimentary',
    title: 'Complimentary Items',
    fields: { title: 'Complimentary Items', context: 'Gifts Chapter', body: 'Complimentary items must be modest in value.' },
  }),
  // The defined term lives only in `terms`, so a promotion can be told apart from a natural match.
  makeDoc({
    id: 'px/definition',
    type: 'definition',
    label: 'Definition',
    title: 'Goods and Services Support',
    location: 'Glossary',
    terms: ['In Kind'],
    fields: { title: 'Goods and Services Support', context: 'Glossary', body: 'Support given as goods or services.' },
  }),
];

const phraseIndex = createSearchIndex(PHRASE_DOCUMENTS.map((doc) => ({ ...doc, fields: { ...doc.fields } })), {
  phrasebook: {
    groups: [
      { from: ['at no cost'], to: ['complimentary'] },
      { from: ['gratis'], to: ['in kind'] },
    ],
  },
  glossary: [],
  scope: 'fixture',
});

test('a quoted phrase keeps its small words: "in kind" does not match "kinds of"', () => {
  const quoted = runSearch(phraseIndex, '"in kind"');
  assert.equal(quoted.exact, true);
  assert.ok(find(quoted, 'px/in-kind'), 'matches "in kind"');
  assert.ok(find(quoted, 'px/hyphenated'), 'matches "In-Kind"');
  assert.equal(find(quoted, 'px/kinds'), undefined, 'must not match "kinds of"');

  const unquoted = runSearch(phraseIndex, 'in kind');
  assert.ok(find(unquoted, 'px/kinds'), 'without quotes, small words are ignored');
});

test('a quoted phrase is reported, snippeted and highlighted as the whole phrase', () => {
  const response = runSearch(phraseIndex, '"in kind"');
  assert.equal(response.concepts[0].label, 'in kind');
  assert.equal(response.concepts[0].members[0].text, 'in kind');

  const hit = find(response, 'px/in-kind');
  assert.deepEqual(hit.matched.map((m) => m.text), ['in kind']);
  const [start, end] = hit.snippet.highlights[0];
  assert.equal(hit.snippet.text.slice(start, end), 'in kind');

  const highlight = new RegExp(response.highlight.source, 'i');
  assert.ok(highlight.test('an In-Kind grant'));
  assert.ok(highlight.test('provided in kind'));
  assert.ok(!highlight.test('all kinds of support'));
});

test('a phrasebook phrase with small words applies only when the whole phrase is typed', () => {
  const plainWord = runSearch(phraseIndex, 'travel cost');
  assert.deepEqual(plainWord.concepts.map((concept) => concept.label), ['travel', 'cost']);
  assert.ok(plainWord.concepts.every((concept) => concept.members.every((m) => m.source !== 'phrasebook')));

  const phrase = runSearch(phraseIndex, 'at no cost');
  assert.deepEqual(phrase.concepts.map((concept) => concept.label), ['at no cost']);
  const [literal, ...expansions] = phrase.concepts[0].members;
  assert.equal(literal.matched, false, '"at no cost" is not in the fixture');
  const complimentary = expansions.find((m) => m.text === 'complimentary');
  assert.equal(complimentary.source, 'phrasebook');
  assert.equal(complimentary.weight, SEARCH_RANKING.weights.oneWay, 'an absent phrase gets the full one-way weight');
});

test('a phrasebook target with small words matches only the phrase', () => {
  const response = runSearch(phraseIndex, 'gratis');
  assert.ok(find(response, 'px/in-kind'));
  assert.equal(find(response, 'px/kinds'), undefined);
});

test('the defined-term rule compares every word: "in kind" promotes the term, "kind" does not', () => {
  assert.equal(runSearch(phraseIndex, 'in kind').results[0].id, 'px/definition');
  assert.equal(find(runSearch(phraseIndex, 'kind'), 'px/definition'), undefined);
});

test('suggests the quoted phrase only for an unquoted phrase with small words that occurs as typed', () => {
  assert.equal(runSearch(phraseIndex, 'in kind').phraseSuggestion, '"in kind"');
  assert.equal(runSearch(phraseIndex, '  In   kind ').phraseSuggestion, '"In kind"');
  assert.equal(runSearch(phraseIndex, '"in kind"').phraseSuggestion, null, 'already quoted');
  assert.equal(runSearch(phraseIndex, 'kind').phraseSuggestion, null, 'no small word');
  assert.equal(runSearch(phraseIndex, 'in support').phraseSuggestion, null, 'the phrase does not occur');
  assert.equal(runSearch(phraseIndex, 'support of').phraseSuggestion, null, 'ends in a small word');
  assert.equal(runSearch(phraseIndex, 'in kindd ').phraseSuggestion, null, 'a word was corrected');
});

test('SEARCH_RANKING is deeply frozen', () => {
  assert.ok(Object.isFrozen(SEARCH_RANKING));
  assert.ok(Object.isFrozen(SEARCH_RANKING.fields));
  assert.ok(Object.isFrozen(SEARCH_RANKING.fields.title));
  assert.ok(Object.isFrozen(SEARCH_RANKING.weights));
  assert.ok(Object.isFrozen(SEARCH_RANKING.completion));
  assert.equal(SEARCH_RANKING.completion.minLength, 3);
  assert.equal(SEARCH_RANKING.completion.maxWords, 8);
  assert.equal(SEARCH_RANKING.completion.weight, 0.6);
  assert.equal(SEARCH_RANKING.maxResults, 30);
  assert.equal(SEARCH_RANKING.maxAppResults, 3);
});
