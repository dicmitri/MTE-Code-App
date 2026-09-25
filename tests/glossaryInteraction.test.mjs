import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { register } from 'tsx/esm/api';

import { loadSplitCodeData } from '../scripts/lib/code-content.mjs';
import { TRANSPARENCY_DOCUMENTS } from '../src/data/transparency/transparencyData.js';
import {
  createGlossaryEntry,
  processReaderHtml,
  processTextWithTerms,
} from '../src/utils/textUtils.js';

// DOMPurify needs a browser DOM, which Node lacks, so the dialog is rendered here with the
// definition passed through unchanged. The browser build sanitizes it.
const popupModules = register({ namespace: 'definition-popup-test' });
const { default: DOMPurify } = await popupModules.import('dompurify', import.meta.url);
DOMPurify.sanitize = (html) => html;
const { DefinitionPopup } = await popupModules.import(
  '../src/components/DefinitionPopup.jsx',
  import.meta.url,
);

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Source assertions use LF regardless of the platform's Git checkout line endings.
const readSource = async (path) => (await readFile(new URL(path, import.meta.url), 'utf8'))
  .replace(/\r\n?/g, '\n');
const appSource = await readSource('../src/App.jsx');
const transparencyContentSource = await readSource('../src/components/TransparencyContent.jsx');
const fullTextSectionSource = await readSource('../src/components/FullTextSection.jsx');

const GLOSSARY_TERM = /<span class="glossary-term[^"]*"[^>]*data-term="([^"]+)">([^<]*)<\/span>/g;
const unlinkTerms = (html) => html.replace(GLOSSARY_TERM, '$2');
const linkedTerms = (html) => [...html.matchAll(GLOSSARY_TERM)].map(([, id, text]) => ({ id, text }));

const glossaryMapFor = (...headwords) => Object.fromEntries(headwords.map((headword) => {
  const entry = createGlossaryEntry(`${headword}:`, `<p><strong>${headword}:</strong> means …</p>`);
  return [entry.id, entry];
}));

const glossaryMap = glossaryMapFor(
  'Educational Grants',
  'Event',
  'Code',
  'Healthcare Organisation (HCO)',
  'Healthcare Professional (HCP)',
);

test('glossary instrumentation preserves publication visible text verbatim', () => {
  const originalHtml = '<p>Educational Grants support Healthcare Organisations.</p>';

  const processedHtml = processTextWithTerms(originalHtml, glossaryMap);

  assert.equal(unlinkTerms(processedHtml), originalHtml);
  assert.deepEqual(linkedTerms(processedHtml), [
    { id: 'educational-grants', text: 'Educational Grants' },
    { id: 'healthcare-organisation-hco', text: 'Healthcare Organisations' },
  ]);
});

test('makes glossary terms keyboard-operable buttons that open a dialog', () => {
  const processedHtml = processTextWithTerms('<p>An Event.</p>', glossaryMap);

  assert.match(processedHtml, /<span class="glossary-term[^"]*" role="button" tabindex="0" aria-haspopup="dialog" data-term="event">Event<\/span>/);
  assert.match(fullTextSectionSource, /onKeyDown=\{handleKeyDown\}/);
  assert.match(fullTextSectionSource, /onKeyUp=\{handleKeyUp\}/);
});

test('reads headwords the way the Code uses them', () => {
  const healthcareProfessional = createGlossaryEntry('Healthcare Professional (HCP):');
  assert.equal(healthcareProfessional.id, 'healthcare-professional-hcp');
  assert.equal(healthcareProfessional.term, 'Healthcare Professional (HCP)');
  assert.deepEqual(
    healthcareProfessional.forms.map((form) => form.text),
    ['Healthcare Professional', 'Healthcare Professionals', 'HCP', 'HCPs'],
  );

  assert.deepEqual(
    createGlossaryEntry('Medical Technology or Medical Technologies:').forms.map((form) => form.text),
    ['Medical Technology', 'Medical Technologies', 'Medical Technologies', 'Medical Technology'],
  );
  assert.deepEqual(
    createGlossaryEntry('Third Party Intermediary:').forms.map((form) => form.text),
    ['Third Party Intermediary', 'Third Party Intermediaries'],
  );
  assert.deepEqual(
    createGlossaryEntry(
      'Members:',
      '<p><strong>Members:</strong> means all corporate members (“Member Companies”) and national association members (“Member Associations”) as defined.</p>',
    ).forms.map((form) => form.text),
    ['Members', 'Member', 'Member Companies', 'Member Company', 'Member Associations', 'Member Association'],
  );

  assert.equal(createGlossaryEntry('Event:').forms.every((form) => !form.caseless), true);
  assert.equal(createGlossaryEntry('In kind:').forms.every((form) => form.caseless), true);
});

test('links capitalised defined terms but not the same words used generically', () => {
  const html = '<p>In the event that the Event is organised under compliant national codes and the Code.</p>';

  assert.deepEqual(
    linkedTerms(processTextWithTerms(html, glossaryMap)).map(({ text }) => text),
    ['Event', 'Code'],
  );

  const inKindMap = glossaryMapFor('In kind', 'Third Party Organised Educational Events');
  assert.deepEqual(
    linkedTerms(processTextWithTerms('<p>An In-Kind grant.</p>', inKindMap)),
    [{ id: 'in-kind', text: 'In-Kind' }],
  );
  assert.deepEqual(
    linkedTerms(processTextWithTerms('<p>Support in kind.</p>', inKindMap)),
    [{ id: 'in-kind', text: 'in kind' }],
  );
  assert.deepEqual(
    linkedTerms(processTextWithTerms('<p>A Third-Party Organised Educational Event.</p>', inKindMap)),
    [{ id: 'third-party-organised-educational-events', text: 'Third-Party Organised Educational Event' }],
  );
});

test('links each term only at its first occurrence in a section', () => {
  const sectionTerms = new Set();
  const legalText = processReaderHtml(
    '<p>A Healthcare Professional attends the Event. Each HCP and each Event is recorded.</p>',
    { glossaryMap, linkedTerms: sectionTerms },
  );
  const answer = processReaderHtml(
    'A: Events for Healthcare Professionals may be supported by Educational Grants.',
    { glossaryMap, linkedTerms: sectionTerms },
  );

  assert.deepEqual(linkedTerms(legalText).map(({ text }) => text), ['Healthcare Professional', 'Event']);
  assert.deepEqual(linkedTerms(answer).map(({ text }) => text), ['Educational Grants']);

  const nextSection = processReaderHtml('<p>The Event.</p>', { glossaryMap, linkedTerms: new Set() });
  assert.deepEqual(linkedTerms(nextSection).map(({ text }) => text), ['Event']);
});

test('does not link terms inside links or headings', () => {
  const html = '<h4>Event rules</h4><p>See <a href="https://example.org">the Code site</a> for the Code.</p>';
  const processedHtml = processTextWithTerms(html, glossaryMap);

  assert.equal(unlinkTerms(processedHtml), html);
  assert.match(processedHtml, /<h4>Event rules<\/h4>/);
  assert.match(processedHtml, /<a href="https:\/\/example\.org">the Code site<\/a>/);
  assert.deepEqual(linkedTerms(processedHtml).map(({ text }) => text), ['Code']);
});

test('preserves nested Q&A markup and gives search highlighting precedence', () => {
  const originalHtml = [
    '<p>Healthcare Organisations may consult ',
    '<a href="https://www.clinicaltrials.gov" target="_blank">the register</a>.</p>',
    '<ul><li>Educational Grants remain documented.</li></ul>',
  ].join('');

  const processedHtml = processReaderHtml(originalHtml, { glossaryMap });

  assert.equal(unlinkTerms(processedHtml), originalHtml);
  assert.match(
    processedHtml,
    /<a href="https:\/\/www\.clinicaltrials\.gov" target="_blank">the register<\/a>/,
  );

  const highlightedHtml = processReaderHtml(originalHtml, {
    query: 'Educational Grants',
    highlight: true,
    glossaryMap,
  });
  assert.match(highlightedHtml, /<mark[^>]*>Educational Grants<\/mark>/);
  assert.doesNotMatch(highlightedHtml, /class="glossary-term/);
});

// The app builds its glossary with DOMParser, which Node lacks. This builds the same entries
// from the real glossary chapter (headword up to the next headword) to test matching on the
// real Code and Disclosure Guidelines text.
test('links every glossary term in the real Code and Transparency text', () => {
  const { chapters } = loadSplitCodeData(projectRoot);
  const glossaryHtml = chapters.find((chapter) => chapter.id === 'glossary').sections
    .map((section) => section.legalText)
    .join('');
  const headwords = [...glossaryHtml.matchAll(/<p><strong>([^<]+)<\/strong>/g)];
  const realGlossaryMap = Object.fromEntries(headwords.map((match, index) => {
    const definition = glossaryHtml.slice(match.index, headwords[index + 1]?.index);
    const entry = createGlossaryEntry(match[1], definition);
    return [entry.id, entry];
  }));
  assert.equal(Object.keys(realGlossaryMap).length, (glossaryHtml.match(/<strong>/g) || []).length);

  const sections = [
    ...chapters.filter((chapter) => chapter.id !== 'glossary').flatMap((chapter) => chapter.sections),
    ...TRANSPARENCY_DOCUMENTS.flatMap((document) => document.units.flatMap((unit) => unit.sections)),
  ];
  const linkCounts = {};
  for (const section of sections) {
    const sectionTerms = new Set();
    const blocks = [section.legalText, ...(section.qas || []).flatMap((qa) => [qa.q, `A: ${qa.a}`])];
    const linkedInSection = [];
    for (const block of blocks.filter(Boolean)) {
      const processedHtml = processReaderHtml(block, { glossaryMap: realGlossaryMap, linkedTerms: sectionTerms });
      assert.equal(unlinkTerms(processedHtml), block);
      for (const { id, text } of linkedTerms(processedHtml)) {
        linkedInSection.push(id);
        linkCounts[id] = (linkCounts[id] || 0) + 1;
        if (id !== 'in-kind') assert.match(text, /^[A-Z]/, `"${text}" is not a capitalised defined term`);
      }
    }
    assert.equal(new Set(linkedInSection).size, linkedInSection.length);
  }

  const neverLinked = Object.keys(realGlossaryMap).filter((id) => !linkCounts[id]);
  assert.deepEqual(neverLinked, []);
  assert.ok(linkCounts['healthcare-professional-hcp'] > 20);
  assert.ok(linkCounts['healthcare-organisation-hco'] > 20);
});

test('renders the definition as an accessible dialog titled as in the glossary', () => {
  const markup = renderToStaticMarkup(
    React.createElement(DefinitionPopup, {
      term: 'Product and Procedure Training and Education Event',
      definition: '<p>means …</p><ul><li>Related disease areas.</li></ul>',
      onClose: () => {},
    }),
  );

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /aria-labelledby="definition-popup-title"/);
  assert.match(markup, /<h3 id="definition-popup-title"[^>]*>Product and Procedure Training and Education Event<\/h3>/);
  assert.doesNotMatch(markup, /capitalize/);
  assert.match(markup, /aria-label="Close definition"/);
  assert.match(markup, /Related disease areas/);

  assert.equal(
    renderToStaticMarkup(React.createElement(DefinitionPopup, { term: null, onClose: () => {} })),
    '',
  );
});

test('passes the shared Code glossary interaction into Transparency', () => {
  const transparencyInvocationStart = appSource.indexOf('<TransparencyContent');
  const transparencyInvocationEnd = appSource.indexOf('/>', transparencyInvocationStart);
  const transparencyInvocation = appSource.slice(
    transparencyInvocationStart,
    transparencyInvocationEnd + 2,
  );

  assert.notEqual(transparencyInvocationStart, -1);
  assert.notEqual(transparencyInvocationEnd, -1);
  assert.match(transparencyInvocation, /glossaryMap=\{glossaryMap\}/);
  assert.match(transparencyInvocation, /handleTermClick=\{handleTermClick\}/);

  assert.match(transparencyContentSource, /\n  glossaryMap,\n  handleTermClick,/);
  assert.match(transparencyContentSource, /glossaryMap=\{glossaryMap\}/);
  assert.match(transparencyContentSource, /handleTermClick=\{handleTermClick\}/);
  assert.doesNotMatch(transparencyContentSource, /glossaryMap=\{null\}/);
});

test('instruments and sanitizes official Q&A questions and answers', () => {
  assert.match(fullTextSectionSource, /processReaderHtml\(qa\.q, processingOptions\)/);
  assert.match(
    fullTextSectionSource,
    /processReaderHtml\(`A: \$\{qa\.a\}`, processingOptions\)/,
  );
  assert.match(fullTextSectionSource, /questionMarkup: \{ __html: DOMPurify\.sanitize\(questionHtml\) \}/);
  assert.match(fullTextSectionSource, /answerMarkup: \{ __html: DOMPurify\.sanitize\(answerHtml\) \}/);
  assert.match(fullTextSectionSource, /<div id=\{id\}[^>]*onClick=\{handleClick\}>/);
});
