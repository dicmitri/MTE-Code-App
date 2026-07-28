import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

import { htmlToPlainText } from '../src/utils/htmlTextUtils.js';
import { parseSemicolonCsv } from '../src/utils/csvUtils.js';
import { loadTransparencyData } from './lib/transparency-content.mjs';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, '..');
const PUBLICATION_DIRECTORY = resolve(
  PROJECT_ROOT,
  'src/data/transparency/disclosure-guidelines',
);
const PDF_PATH = resolve(PROJECT_ROOT, 'src/data/mte-code_disclosure_guidelines.pdf');
const CSV_PATH = resolve(PROJECT_ROOT, 'src/data/declaration-csv-template.csv');
const MANIFEST_PATH = resolve(PUBLICATION_DIRECTORY, 'source-manifest.json');

const EXPECTED_PDF_EXTRACTION_CORRECTIONS = Object.freeze([
  {
    id: 'annex-ii-member-company-staff-cell-order',
    comparison: 'normalized-visible-and-lexical-body',
    sourcePages: [13],
    pdfExtraction: 'ServicesprovidedCompanyStaffbyMember',
    renderedText: 'ServicesprovidedbyMemberCompanyStaff',
    pdfExtractionTokens: ['Services', 'provided', 'Company', 'Staff', 'by', 'Member'],
    renderedTokens: ['Services', 'provided', 'by', 'Member', 'Company', 'Staff'],
    reason: 'The PDF content stream stores the wrapped cell fragments out of their rendered left-to-right order.',
  },
  {
    id: 'annex-ii-company-produced-hyphen-position',
    comparison: 'normalized-visible-and-lexical-body',
    sourcePages: [13],
    pdfExtraction: 'Goods(whetherTPorcompanyproduced)-',
    renderedText: 'Goods(whetherTPorcompany-produced)',
    pdfExtractionTokens: ['Goods', '(', 'whether', 'TP', 'or', 'company', 'produced', ')', '-'],
    renderedTokens: ['Goods', '(', 'whether', 'TP', 'or', 'company', '-', 'produced', ')'],
    reason: "The PDF content stream stores the wrapped hyphen after the cell's final text fragment.",
  },
  {
    id: 'chapter-3-qa-11-split-word',
    comparison: 'lexical-body',
    sourcePages: [9],
    pdfExtractionTokens: ['Companies', 'c', 'ould'],
    renderedTokens: ['Companies', 'could'],
    reason: 'A PDF text-item boundary splits the visually continuous word "could".',
  },
]);

const EXPECTED_REPRESENTATIONAL_CHANGES = Object.freeze([
  {
    sourcePage: 1,
    type: 'live-navigation',
    description: 'The printed table of contents is represented by the document overview, Sidebar, and on-page navigation instead of duplicated as body text.',
  },
  {
    sourcePage: 11,
    type: 'local-link-target',
    description: 'The published visible Annex I sentence and linked words are unchanged; the external link target is replaced with resource:declaration-csv-template, resolved to the bundled CSV.',
  },
  {
    sourcePages: Array.from({ length: 14 }, (value, index) => index + 2),
    type: 'semantic-html',
    description: 'HTML supplies paragraph, emphasis, list, footnote, and table structure only; whitespace-normalized visible characters plus lexical word boundaries and punctuation must match the PDF extraction.',
  },
  {
    sourcePage: 2,
    type: 'section-end-footnote',
    description: 'Footnote 1 retains its in-text marker and verbatim text but is rendered at the end of Chapter 1 section 1 for continuous reading; the verifier restores its source-page position solely for fidelity comparison.',
  },
  {
    sourcePage: 11,
    type: 'non-normative-csv-preview',
    description: 'The app renders a convenience preview generated directly from the bundled CSV. It is explicitly labelled non-normative and omitted from print.',
  },
]);

const EXPECTED = Object.freeze({
  schemaVersion: 1,
  documentId: 'disclosure-guidelines',
  pdfBytes: 335157,
  pdfPages: 15,
  pdfSha256: '2CA989BC707975CAD24E2FF1032B1AC90F76C90993B792929E36AC65A6F762F3',
  csvBytes: 553,
  csvSha256: '087FFA3CDC13C6F7FD57264B2EC0A7945091108B7CFCD39AF15F3EFD48BAF44F',
  normalizedBodySha256: 'BC01BF71770CCAB3FF932CDD958274CD0C83C8A41604C9A371BDD7C81F329E62',
  visibleBodySha256: 'B8A4929053619244F65BC3D223B422472AF792FD43E0743360F5EAD14527C70C',
  lexicalBodySha256: 'F9C970823B2B666A46D8050C995D84625FA5D289876EAB16A63EA5535DE338AB',
  normalizedCharacters: 19033,
  lexicalTokens: 3933,
  document: {
    file: 'document.json',
    bytes: 901,
    sha256: '7D2C9A693CB94E9F3A014B68925960CAD5E2549744B9711A9420EB4A0ADA0124',
  },
  unitIds: [
    'dg-preamble',
    'dg-chapter-1',
    'dg-chapter-2',
    'dg-chapter-3',
    'dg-annex-1',
    'dg-annex-2',
    'dg-annex-3',
  ],
  units: [
    {
      id: 'dg-preamble',
      file: 'preamble.json',
      sourcePages: [2],
      bytes: 1790,
      sha256: '66C0CE9590FED61A7E28B796C28E148BE63D11163C41D4CCDB4A68571625DA3B',
      sections: 1,
      qas: 0,
    },
    {
      id: 'dg-chapter-1',
      file: 'ch1.json',
      sourcePages: [2, 3, 4, 5],
      bytes: 7328,
      sha256: '52DE93D8BF63C127294F5F758BF39228A5B0691A69F4AC493B4B2CF0EFD1B7E4',
      sections: 2,
      qas: 5,
    },
    {
      id: 'dg-chapter-2',
      file: 'ch2.json',
      sourcePages: [5, 6, 7],
      bytes: 5024,
      sha256: 'EBFBC817E816D93A8C621468BB9FD80CEA9E478ACA454A466903ABBC35D409B7',
      sections: 4,
      qas: 2,
    },
    {
      id: 'dg-chapter-3',
      file: 'ch3.json',
      sourcePages: [7, 8, 9, 10],
      bytes: 7415,
      sha256: '0CA088AAFC8457FA39BE512A0F9562B1659AC4E11EFA4626B5AB2E842510D64C',
      sections: 7,
      qas: 4,
    },
    {
      id: 'dg-annex-1',
      file: 'annex1.json',
      sourcePages: [11],
      bytes: 487,
      sha256: '3259EC207F3731EE15B47137EEBB22792A501C755DFB8A0FA2C778AE1A95669A',
      sections: 1,
      qas: 0,
    },
    {
      id: 'dg-annex-2',
      file: 'annex2.json',
      sourcePages: [12, 13, 14],
      bytes: 5540,
      sha256: 'B382B5E679E16179988CD5079982C33672AD0BBB348DB2AD011BC0AF339254FD',
      sections: 3,
      qas: 0,
    },
    {
      id: 'dg-annex-3',
      file: 'annex3.json',
      sourcePages: [15],
      bytes: 1823,
      sha256: 'F20DA5B3CE7DB2DDBACF03AE90DE11801472BD9CEDC6A82592C9BF7427BA7BFA',
      sections: 1,
      qas: 0,
    },
  ],
  counts: {
    units: 7,
    sections: 19,
    qas: 11,
  },
  sourceBodyPages: Array.from({ length: 14 }, (value, index) => index + 2),
  qaLabels: Array.from({ length: 11 }, (value, index) => `Q&A ${index + 1}`),
  pdfExtractionCorrections: EXPECTED_PDF_EXTRACTION_CORRECTIONS,
  approvedRepresentationalChanges: EXPECTED_REPRESENTATIONAL_CHANGES,
});

function sha256(value) {
  return createHash('sha256').update(value).digest('hex').toUpperCase();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function stableJsonValue(value) {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableJsonValue(value[key])]),
  );
}

function stableStringify(value) {
  return JSON.stringify(stableJsonValue(value));
}

function occurrenceCount(value, pattern) {
  return (String(value || '').match(pattern) || []).length;
}

function exactOccurrenceCount(value, needle) {
  if (!needle) return 0;
  return String(value || '').split(needle).length - 1;
}

export function normalizeVerbatimText(value) {
  return String(value || '').normalize('NFC').replace(/\s+/gu, '');
}

const TOKEN_SEPARATOR = '\u001F';

export function tokenizeVisibleText(value) {
  return String(value || '')
    .normalize('NFC')
    .match(/[\p{L}\p{M}]+|\p{N}+|[^\s\p{L}\p{M}\p{N}]/gu) || [];
}

export function correctKnownPdfExtractionArtifacts(value) {
  return EXPECTED.pdfExtractionCorrections
    .filter((correction) => correction.pdfExtraction && correction.renderedText)
    .reduce(
      (corrected, correction) => corrected.replace(
        correction.pdfExtraction,
        correction.renderedText,
      ),
      String(value),
    );
}

export function correctKnownPdfLexicalArtifacts(value) {
  const joinTokens = (...tokens) => tokens.join(TOKEN_SEPARATOR);

  const lexicalCorrections = EXPECTED.pdfExtractionCorrections
    .filter((correction) => (
      correction.pdfExtractionTokens && correction.renderedTokens
    ));

  return lexicalCorrections.reduce(
    (corrected, correction) => corrected.replace(
      joinTokens(...correction.pdfExtractionTokens),
      joinTokens(...correction.renderedTokens),
    ),
    String(value),
  );
}

export function htmlToSourceVisibleText(html) {
  const tokens = String(html || '').match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g) || [];
  const listMarkers = [];
  let output = '';

  tokens.forEach((token) => {
    if (!token.startsWith('<')) {
      output += htmlToPlainText(token);
      return;
    }

    if (/^<ul\b/i.test(token)) {
      let marker = '•';
      if (/list-style-type\s*:\s*circle/i.test(token)) marker = 'o';
      if (/list-style-type\s*:\s*square/i.test(token)) marker = '▪';
      if (/list-style-type\s*:\s*['"]?-\s*/i.test(token)) marker = '-';
      listMarkers.push(marker);
      return;
    }
    if (/^<\/ul\b/i.test(token)) {
      listMarkers.pop();
      return;
    }
    if (/^<li\b/i.test(token)) {
      output += listMarkers.at(-1) || '•';
    }
  });

  return output;
}

export function htmlToLexicalVisibleText(html) {
  const tokens = String(html || '').match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g) || [];
  const listMarkers = [];
  let output = '';

  tokens.forEach((token) => {
    if (!token.startsWith('<')) {
      output += htmlToPlainText(token);
      return;
    }

    if (/^<ul\b/i.test(token)) {
      let marker = '•';
      if (/list-style-type\s*:\s*circle/i.test(token)) marker = 'o';
      if (/list-style-type\s*:\s*square/i.test(token)) marker = '▪';
      if (/list-style-type\s*:\s*['"]?-\s*/i.test(token)) marker = '-';
      listMarkers.push(marker);
      output += ' ';
      return;
    }
    if (/^<\/ul\b/i.test(token)) {
      listMarkers.pop();
      output += ' ';
      return;
    }
    if (/^<li\b/i.test(token)) {
      output += ` ${listMarkers.at(-1) || '•'} `;
      return;
    }
    if (/^<\/?(?:p|div|br|table|thead|tbody|tr|td|th|caption|li|h[1-6])\b/i.test(token)) {
      output += ' ';
    }
  });

  return output;
}

const CHAPTER_ONE_SCOPE_FOOTNOTE_PATTERN = (
  /<p><small><sup>1<\/sup>[\s\S]*?<\/small><\/p>/
);

export function restoreApprovedSourceOrder(unitId, sectionTitle, legalText) {
  const html = String(legalText || '');
  if (unitId !== 'dg-chapter-1' || sectionTitle !== '1. Scope') return html;

  const footnote = html.match(CHAPTER_ONE_SCOPE_FOOTNOTE_PATTERN)?.[0];
  if (!footnote) return html;

  const withoutFootnote = html.replace(footnote, '');
  const firstParagraphEnd = withoutFootnote.indexOf('</p>') + 4;
  if (firstParagraphEnd < 4) return html;

  return (
    withoutFootnote.slice(0, firstParagraphEnd)
    + footnote
    + withoutFootnote.slice(firstParagraphEnd)
  );
}

export function buildPublicationVisibleText(document) {
  let output = '';

  document.units.forEach((unit) => {
    output += unit.title;
    unit.sections.forEach((section) => {
      output += section.title || '';
      output += htmlToSourceVisibleText(
        restoreApprovedSourceOrder(unit.id, section.title, section.legalText),
      );
      section.qas.forEach((qa) => {
        output += qa.label;
        output += htmlToSourceVisibleText(qa.q);
        output += `A:${htmlToSourceVisibleText(qa.a)}`;
      });
    });
  });

  return output;
}

export function buildPublicationLexicalText(document) {
  const segments = [];

  document.units.forEach((unit) => {
    segments.push(unit.title);
    unit.sections.forEach((section) => {
      if (section.title) segments.push(section.title);
      segments.push(htmlToLexicalVisibleText(
        restoreApprovedSourceOrder(unit.id, section.title, section.legalText),
      ));
      section.qas.forEach((qa) => {
        segments.push(qa.label);
        segments.push(htmlToLexicalVisibleText(qa.q));
        segments.push(`A: ${htmlToLexicalVisibleText(qa.a)}`);
      });
    });
  });

  return segments.join(' ');
}

async function extractPdfBody(pdfBytes) {
  const pdf = await getDocument({
    data: new Uint8Array(pdfBytes),
    disableWorker: true,
  }).promise;
  let body = '';
  let lexicalBody = '';

  for (let pageNumber = 2; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageItems = textContent.items
      .filter((item) => Number(item.transform?.[5] || 0) > 50)
      .map((item) => item.str);
    body += pageItems.join('');
    lexicalBody += ` ${pageItems.join(' ')}`;
  }

  return { body, lexicalBody, pageCount: pdf.numPages };
}

function firstDifference(expected, actual) {
  const limit = Math.min(expected.length, actual.length);
  let index = 0;
  while (index < limit && expected[index] === actual[index]) index += 1;
  if (index === limit && expected.length === actual.length) return null;

  const start = Math.max(0, index - 45);
  const end = index + 90;
  return {
    index,
    pdf: expected.slice(start, end),
    data: actual.slice(start, end),
  };
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

export async function verifyDisclosureGuidelines(projectRoot = PROJECT_ROOT) {
  const errors = [];
  const pdfPath = resolve(projectRoot, 'src/data/mte-code_disclosure_guidelines.pdf');
  const csvPath = resolve(projectRoot, 'src/data/declaration-csv-template.csv');
  const publicationDirectory = resolve(
    projectRoot,
    'src/data/transparency/disclosure-guidelines',
  );
  const manifestPath = resolve(publicationDirectory, 'source-manifest.json');
  const pdfBytes = readFileSync(pdfPath);
  const csvBytes = readFileSync(csvPath);
  const manifest = readJson(manifestPath);
  const [document] = loadTransparencyData(projectRoot);
  const {
    body: pdfBody,
    lexicalBody: pdfLexicalBody,
    pageCount,
  } = await extractPdfBody(pdfBytes);
  const dataBody = buildPublicationVisibleText(document);
  const dataLexicalBody = buildPublicationLexicalText(document);
  const normalizedPdfBody = normalizeVerbatimText(pdfBody);
  const tokenizedPdfLexicalBody = tokenizeVisibleText(pdfLexicalBody).join(TOKEN_SEPARATOR);
  const comparablePdfBody = correctKnownPdfExtractionArtifacts(normalizedPdfBody);
  const normalizedDataBody = normalizeVerbatimText(dataBody);
  const comparablePdfLexicalBody = correctKnownPdfLexicalArtifacts(
    tokenizedPdfLexicalBody,
  );
  const comparableDataLexicalBody = tokenizeVisibleText(dataLexicalBody).join(TOKEN_SEPARATOR);
  const dataBodyHash = sha256(normalizedDataBody);
  const dataLexicalBodyHash = sha256(comparableDataLexicalBody);

  assert(pdfBytes.length === EXPECTED.pdfBytes, 'Source PDF byte length changed.', errors);
  assert(sha256(pdfBytes) === EXPECTED.pdfSha256, 'Source PDF SHA-256 changed.', errors);
  assert(pageCount === EXPECTED.pdfPages, 'Source PDF page count changed.', errors);
  assert(csvBytes.length === EXPECTED.csvBytes, 'Annex I CSV byte length changed.', errors);
  assert(sha256(csvBytes) === EXPECTED.csvSha256, 'Annex I CSV SHA-256 changed.', errors);
  assert(
    sha256(normalizedPdfBody) === EXPECTED.normalizedBodySha256,
    'The normalized PDF body baseline changed.',
    errors,
  );
  assert(
    JSON.stringify(document.unitIds) === JSON.stringify(EXPECTED.unitIds),
    'Disclosure Guidelines unit order changed.',
    errors,
  );
  assert(
    JSON.stringify(document.units.map((unit) => unit.id)) === JSON.stringify(EXPECTED.unitIds),
    'Loaded Disclosure Guidelines units do not match the canonical order.',
    errors,
  );
  EXPECTED.pdfExtractionCorrections.forEach((correction) => {
    if (correction.pdfExtraction) {
      assert(
        exactOccurrenceCount(normalizedPdfBody, correction.pdfExtraction) === 1,
        `PDF extraction correction "${correction.id}" must match the normalized source exactly once.`,
        errors,
      );
    }
    if (correction.pdfExtractionTokens) {
      const extractedTokens = correction.pdfExtractionTokens.join(TOKEN_SEPARATOR);
      assert(
        exactOccurrenceCount(tokenizedPdfLexicalBody, extractedTokens) === 1,
        `PDF lexical correction "${correction.id}" must match the source token stream exactly once.`,
        errors,
      );
    }
  });

  const qaLabels = document.units.flatMap((unit) => (
    unit.sections.flatMap((section) => section.qas.map((qa) => qa.label))
  ));
  assert(
    JSON.stringify(qaLabels) === JSON.stringify(EXPECTED.qaLabels),
    'Disclosure Guidelines must contain Q&A 1 through Q&A 11 exactly once and in order.',
    errors,
  );

  const chapterOneScopeHtml = document.units
    .find((unit) => unit.id === 'dg-chapter-1')
    ?.sections.find((section) => section.title === '1. Scope')
    ?.legalText || '';
  const chapterOneScopeFootnote = chapterOneScopeHtml
    .match(CHAPTER_ONE_SCOPE_FOOTNOTE_PATTERN)?.[0] || '';
  assert(
    Boolean(chapterOneScopeFootnote)
      && exactOccurrenceCount(chapterOneScopeHtml, '<sup>1</sup>') === 2
      && chapterOneScopeHtml.endsWith(chapterOneScopeFootnote),
    'Chapter 1 Scope must keep footnote 1 verbatim at the end of the section.',
    errors,
  );

  const parsedCsv = parseSemicolonCsv(csvBytes.toString('utf8'));
  assert(parsedCsv.headers.length === 11, 'Annex I CSV must contain 11 columns.', errors);
  assert(parsedCsv.rows.length === 3, 'Annex I CSV must contain its 3 example rows.', errors);

  const serializedUnits = JSON.stringify(document.units);
  const localResourceCount = (
    serializedUnits.match(/resource:declaration-csv-template/g) || []
  ).length;
  assert(localResourceCount === 1, 'Annex I must contain exactly one local CSV resource link.', errors);
  assert(
    !/ethicalmedtech\.eu\/wp-content\/uploads/i.test(serializedUnits),
    'Annex I still contains the external CSV URL.',
    errors,
  );
  const annexOne = document.units.find((unit) => unit.id === 'dg-annex-1');
  const annexOneHtml = annexOne?.sections?.[0]?.legalText || '';
  const annexOneAnchors = [
    ...annexOneHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi),
  ];
  assert(
    annexOneAnchors.length === 1
      && /\bhref=(['"])resource:declaration-csv-template\1/i.test(
        annexOneAnchors[0]?.[1] || '',
      )
      && htmlToPlainText(annexOneAnchors[0]?.[2] || '') === 'at this link',
    'Annex I must link exactly the words "at this link" to the bundled CSV resource.',
    errors,
  );

  const annexTwo = document.units.find((unit) => unit.id === 'dg-annex-2');
  const annexTwoTableHtml = annexTwo?.sections?.find(
    (section) => section.title === 'Value of in-kind Contributions',
  )?.legalText || '';
  assert(
    occurrenceCount(annexTwoTableHtml, /<table\b/gi) === 1
      && occurrenceCount(annexTwoTableHtml, /<tr\b/gi) === 9
      && occurrenceCount(annexTwoTableHtml, /<th\b/gi) === 2
      && occurrenceCount(annexTwoTableHtml, /<td\b/gi) === 16
      && occurrenceCount(
        annexTwoTableHtml,
        /<tr><td><\/td><td><\/td><\/tr>/gi,
      ) === 1,
    'Annex II must preserve its two-column, nine-row table and deliberate blank row.',
    errors,
  );
  assert(
    annexTwoTableHtml.includes('<th>IN-KIND CATEGORY</th>')
      && annexTwoTableHtml.includes(
        '<th>EXAMPLES OF VALUES THAT CAN BE CONSIDERED, VAT EXCLUSIVE WHEN RELEVANT</th>',
      ),
    'Annex II table headings changed.',
    errors,
  );

  const annexThree = document.units.find((unit) => unit.id === 'dg-annex-3');
  const annexThreeHtml = annexThree?.sections?.[0]?.legalText || '';
  assert(
    /^<ul style="list-style-type:\s*'-\s*';">/i.test(annexThreeHtml)
      && occurrenceCount(annexThreeHtml, /<ul\b/gi) === 4
      && occurrenceCount(annexThreeHtml, /<li\b/gi) === 18
      && occurrenceCount(annexThreeHtml, /list-style-type:\s*circle/gi) === 2
      && occurrenceCount(annexThreeHtml, /list-style-type:\s*square/gi) === 1,
    'Annex III list hierarchy or marker styles changed.',
    errors,
  );

  const expectedManifest = {
    schemaVersion: EXPECTED.schemaVersion,
    documentId: EXPECTED.documentId,
    document: EXPECTED.document,
    pdf: {
      file: '../../mte-code_disclosure_guidelines.pdf',
      bytes: EXPECTED.pdfBytes,
      pages: EXPECTED.pdfPages,
      sha256: EXPECTED.pdfSha256,
    },
    csv: {
      file: '../../declaration-csv-template.csv',
      bytes: EXPECTED.csvBytes,
      columns: 11,
      exampleRows: 3,
      sha256: EXPECTED.csvSha256,
    },
    normalizedBody: {
      sourcePages: EXPECTED.sourceBodyPages,
      characters: EXPECTED.normalizedCharacters,
      sha256: EXPECTED.normalizedBodySha256,
    },
    visibleBody: {
      characters: EXPECTED.normalizedCharacters,
      sha256: EXPECTED.visibleBodySha256,
    },
    lexicalBody: {
      tokens: EXPECTED.lexicalTokens,
      sha256: EXPECTED.lexicalBodySha256,
    },
    counts: EXPECTED.counts,
    units: EXPECTED.units,
    pdfExtractionCorrections: EXPECTED.pdfExtractionCorrections,
    approvedRepresentationalChanges: EXPECTED.approvedRepresentationalChanges,
  };
  assert(
    stableStringify(manifest) === stableStringify(expectedManifest),
    'The source manifest contains missing, changed, or unverified metadata.',
    errors,
  );
  assert(
    manifest.pdf?.sha256 === EXPECTED.pdfSha256
      && manifest.pdf?.bytes === EXPECTED.pdfBytes
      && manifest.pdf?.pages === EXPECTED.pdfPages,
    'The source manifest PDF evidence does not match the pinned baseline.',
    errors,
  );
  assert(
    manifest.csv?.sha256 === EXPECTED.csvSha256
      && manifest.csv?.bytes === EXPECTED.csvBytes,
    'The source manifest CSV evidence does not match the pinned baseline.',
    errors,
  );
  assert(
    manifest.normalizedBody?.sha256 === EXPECTED.normalizedBodySha256
      && manifest.normalizedBody?.characters === EXPECTED.normalizedCharacters
      && JSON.stringify(manifest.normalizedBody?.sourcePages)
        === JSON.stringify(EXPECTED.sourceBodyPages),
    'The source manifest normalized-body evidence does not match the pinned baseline.',
    errors,
  );
  assert(
    manifest.visibleBody?.sha256 === EXPECTED.visibleBodySha256
      && manifest.visibleBody?.characters === EXPECTED.normalizedCharacters,
    'The source manifest comparable visible-body evidence does not match the pinned baseline.',
    errors,
  );
  assert(
    manifest.lexicalBody?.sha256 === EXPECTED.lexicalBodySha256
      && manifest.lexicalBody?.tokens === EXPECTED.lexicalTokens,
    'The source manifest lexical evidence does not match the pinned baseline.',
    errors,
  );
  assert(
    JSON.stringify(manifest.document) === JSON.stringify(EXPECTED.document),
    'The source manifest document evidence does not match the pinned baseline.',
    errors,
  );
  const documentBytes = readFileSync(resolve(publicationDirectory, EXPECTED.document.file));
  assert(
    documentBytes.length === EXPECTED.document.bytes
      && sha256(documentBytes) === EXPECTED.document.sha256,
    'Raw Disclosure Guidelines document metadata changed.',
    errors,
  );
  assert(
    JSON.stringify(manifest.counts) === JSON.stringify(EXPECTED.counts),
    'The source manifest publication counts do not match the pinned baseline.',
    errors,
  );
  assert(
    JSON.stringify(manifest.units) === JSON.stringify(EXPECTED.units),
    'The source manifest unit evidence or order does not match the pinned baseline.',
    errors,
  );
  assert(
    stableStringify(manifest.pdfExtractionCorrections)
      === stableStringify(EXPECTED.pdfExtractionCorrections),
    'The source manifest PDF-extraction correction record changed.',
    errors,
  );
  assert(
    stableStringify(manifest.approvedRepresentationalChanges)
      === stableStringify(EXPECTED.approvedRepresentationalChanges),
    'The source manifest representational-change record changed.',
    errors,
  );

  EXPECTED.units.forEach((evidence) => {
    const fileBytes = readFileSync(resolve(publicationDirectory, evidence.file));
    const loadedUnit = document.units.find((unit) => unit.id === evidence.id);
    assert(
      fileBytes.length === evidence.bytes && sha256(fileBytes) === evidence.sha256,
      `Raw JSON evidence changed for unit "${evidence.id}".`,
      errors,
    );
    assert(
      Boolean(loadedUnit)
        && JSON.stringify(loadedUnit.sourcePages) === JSON.stringify(evidence.sourcePages)
        && loadedUnit.sections.length === evidence.sections
        && loadedUnit.sections.reduce((sum, section) => sum + section.qas.length, 0)
          === evidence.qas,
      `Loaded unit evidence changed for "${evidence.id}".`,
      errors,
    );
  });

  assert(
    dataBodyHash === EXPECTED.visibleBodySha256,
    'The comparable visible-body hash changed.',
    errors,
  );
  assert(
    dataLexicalBodyHash === EXPECTED.lexicalBodySha256,
    'The lexical visible-body hash changed.',
    errors,
  );
  assert(
    normalizedDataBody === comparablePdfBody,
    'The integrated visible text does not exactly match PDF pages 2–15.',
    errors,
  );
  assert(
    comparableDataLexicalBody === comparablePdfLexicalBody,
    'The integrated word boundaries or punctuation do not match PDF pages 2–15.',
    errors,
  );

  const difference = firstDifference(comparablePdfBody, normalizedDataBody);
  if (difference) {
    errors.push(
      `First normalized text difference at character ${difference.index}.\n`
      + `  PDF:  ${difference.pdf}\n`
      + `  Data: ${difference.data}`,
    );
  }
  const lexicalDifference = firstDifference(
    comparablePdfLexicalBody,
    comparableDataLexicalBody,
  );
  if (lexicalDifference) {
    errors.push(
      `First lexical difference at character ${lexicalDifference.index}.\n`
      + `  PDF:  ${lexicalDifference.pdf.replaceAll(TOKEN_SEPARATOR, ' ')}\n`
      + `  Data: ${lexicalDifference.data.replaceAll(TOKEN_SEPARATOR, ' ')}`,
    );
  }

  return {
    errors,
    stats: {
      pdfPages: pageCount,
      units: document.units.length,
      sections: document.units.reduce((sum, unit) => sum + unit.sections.length, 0),
      qas: qaLabels.length,
      csvColumns: parsedCsv.headers.length,
      csvRows: parsedCsv.rows.length,
      normalizedCharacters: comparablePdfBody.length,
      normalizedBodySha256: dataBodyHash,
      lexicalTokens: tokenizeVisibleText(dataLexicalBody).length,
      lexicalBodySha256: sha256(comparableDataLexicalBody),
    },
  };
}

function printReport(result) {
  if (result.errors.length > 0) {
    console.error(
      `Disclosure Guidelines verification failed with ${result.errors.length} `
      + `error${result.errors.length === 1 ? '' : 's'}:`,
    );
    result.errors.forEach((error) => console.error(`- ${error}`));
    return;
  }

  console.log('Disclosure Guidelines verification passed.');
  console.log(
    `${result.stats.pdfPages} PDF pages; ${result.stats.units} reader units; `
    + `${result.stats.sections} sections; ${result.stats.qas} Q&As`,
  );
  console.log(
    `${result.stats.csvColumns} CSV columns; ${result.stats.csvRows} example rows`,
  );
  console.log(
    `${result.stats.normalizedCharacters} normalized visible characters match exactly `
    + `(${result.stats.normalizedBodySha256}).`,
  );
  console.log(
    `${result.stats.lexicalTokens} lexical tokens preserve word boundaries and punctuation `
    + `(${result.stats.lexicalBodySha256}).`,
  );
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  try {
    const result = await verifyDisclosureGuidelines();
    printReport(result);
    if (result.errors.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error(`Disclosure Guidelines verification could not run: ${error.message}`);
    process.exitCode = 1;
  }
}
