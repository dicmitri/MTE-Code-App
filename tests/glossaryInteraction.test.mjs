import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  processReaderHtml,
  processTextWithTerms,
} from '../src/utils/textUtils.js';

const appSource = await readFile(
  new URL('../src/App.jsx', import.meta.url),
  'utf8',
);
const transparencyContentSource = await readFile(
  new URL('../src/components/TransparencyContent.jsx', import.meta.url),
  'utf8',
).then((source) => source.replace(/\r\n/g, '\n'));
const fullTextSectionSource = await readFile(
  new URL('../src/components/FullTextSection.jsx', import.meta.url),
  'utf8',
);

test('glossary instrumentation preserves publication visible text verbatim', () => {
  const originalHtml = '<p>Educational Grants support Healthcare Organisations.</p>';
  const glossaryMap = {
    'educational grants': '<p>Educational Grants definition.</p>',
    'healthcare organisations': '<p>Healthcare Organisations definition.</p>',
  };

  const processedHtml = processTextWithTerms(originalHtml, glossaryMap);
  const restoredHtml = processedHtml.replace(
    /<span class="glossary-term[^"]*" data-term="[^"]+">([^<]*)<\/span>/g,
    '$1',
  );

  assert.equal(restoredHtml, originalHtml);
  assert.match(
    processedHtml,
    /class="glossary-term[^"]*" data-term="educational grants">Educational Grants<\/span>/,
  );
  assert.match(
    processedHtml,
    /class="glossary-term[^"]*" data-term="healthcare organisations">Healthcare Organisations<\/span>/,
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

test('preserves nested Q&A markup and gives search highlighting precedence', () => {
  const originalHtml = [
    '<p>Healthcare Organisations may consult ',
    '<a href="https://www.clinicaltrials.gov" target="_blank">the register</a>.</p>',
    '<ul><li>Educational Grants remain documented.</li></ul>',
  ].join('');
  const glossaryMap = {
    'educational grants': '<p>Educational Grants definition.</p>',
    'healthcare organisations': '<p>Healthcare Organisations definition.</p>',
  };

  const processedHtml = processReaderHtml(originalHtml, { glossaryMap });
  const restoredHtml = processedHtml.replace(
    /<span class="glossary-term[^"]*" data-term="[^"]+">([^<]*)<\/span>/g,
    '$1',
  );

  assert.equal(restoredHtml, originalHtml);
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

test('instruments and sanitizes official Q&A questions and answers', () => {
  assert.match(fullTextSectionSource, /processReaderHtml\(qa\.q, processingOptions\)/);
  assert.match(
    fullTextSectionSource,
    /processReaderHtml\(`A: \$\{qa\.a\}`, processingOptions\)/,
  );
  assert.match(fullTextSectionSource, /questionHtml: DOMPurify\.sanitize\(questionHtml\)/);
  assert.match(fullTextSectionSource, /answerHtml: DOMPurify\.sanitize\(answerHtml\)/);
  assert.match(fullTextSectionSource, /<div id=\{id\}[^>]*onClick=\{handleClick\}>/);
});
