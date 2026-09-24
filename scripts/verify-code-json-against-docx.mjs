#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import mammoth from 'mammoth';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCX_PATH = path.join(PROJECT_ROOT, 'src/data/code-september-2024.docx');
const DOCX_SHA256 = 'BBA9A2F3E200FA0499960C35697BFCDA5AEE8C11464240D46426E700597600C9';
const CHAPTER_IDS = [
  'scope', 'admin', 'intro', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6',
  'ch7', 'ch8', 'ch9', 'ch10', 'part2', 'glossary', 'annex1', 'annex2',
  'annex3', 'annex4', 'annex5', 'annex6', 'annex7',
];
const ATOMIC_HTML_BLOCK = /<(?:p|li|td|th|h[1-6])\b[^>]*>([\s\S]*?)<\/(?:p|li|td|th|h[1-6])>/gi;
const TOKEN_PATTERN = /[\p{L}\p{N}_]+(?:[’'][\p{L}\p{N}_]+)*|[^\s\p{L}\p{N}_]/gu;
const EDITORIAL_RECORD_HEADING = 'Editorial correction record (not part of the Code)';

function parseArguments(argv) {
  if (argv.includes('--help')) return { help: true, reportPath: null };
  const reportIndex = argv.indexOf('--report');
  if (reportIndex < 0) return { help: false, reportPath: null };
  if (!argv[reportIndex + 1] || argv[reportIndex + 1].startsWith('--')) {
    throw new Error('--report requires a file path.');
  }
  return { help: false, reportPath: path.resolve(argv[reportIndex + 1]) };
}

function printHelp() {
  console.log(`Usage: npm run verify:code-docx -- [options]

Compare the app's source-backed Code text with the pinned revised Word copy.

Options:
  --report <path>  Write a numbered Markdown review report
  --help           Show this help

The check exits non-zero while review candidates remain. To adjudicate a
candidate, quote its number or JSON path and say "keep app" or "keep Word".`);
}

function decodeVisibleText(html) {
  return html
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&apos;|&#39;|&#x27;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return (decodeVisibleText(value).match(TOKEN_PATTERN) ?? [])
    .filter((token) => token !== '•' && token !== '■');
}

function atomicBlocks(html) {
  const blocks = [...html.matchAll(ATOMIC_HTML_BLOCK)]
    .map((match) => match[1])
    .filter((block) => tokens(block).length > 0);
  return blocks.length > 0 ? blocks : [html];
}

function findSequence(haystack, needle) {
  outer: for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) continue outer;
    }
    return start;
  }
  return -1;
}

function firstLikelyDifference(documentTokens, expectedTokens) {
  const anchorLength = Math.min(8, expectedTokens.length);
  const anchor = expectedTokens.slice(0, anchorLength);
  const start = findSequence(documentTokens, anchor);
  if (start < 0) return 'opening text was not found in the Word document';

  let offset = anchorLength;
  while (
    offset < expectedTokens.length
    && start + offset < documentTokens.length
    && expectedTokens[offset] === documentTokens[start + offset]
  ) offset += 1;

  const from = Math.max(0, offset - 8);
  const to = offset + 12;
  return [
    `app:  ${expectedTokens.slice(from, to).join(' ')}`,
    `word: ${documentTokens.slice(start + from, start + to).join(' ')}`,
  ].join('\n             ');
}

async function sourceFields() {
  const fields = [];
  for (const chapterId of CHAPTER_IDS) {
    const file = path.join(PROJECT_ROOT, `src/data/code/${chapterId}.json`);
    const chapter = JSON.parse(await readFile(file, 'utf8'));
    chapter.sections.forEach((section, sectionIndex) => {
      atomicBlocks(section.legalText ?? '').forEach((text, blockIndex) => {
        fields.push({
          path: `${chapterId}.sections[${sectionIndex}].legalText#${blockIndex + 1}`,
          text,
        });
      });
      section.qas.forEach((qa, qaIndex) => {
        // Word uses separate Qn/An margin labels; the app uses "Q&A n:" in the
        // question string. The labels are presentation, so compare the wording.
        fields.push({
          path: `${chapterId}.sections[${sectionIndex}].qas[${qaIndex}].q`,
          text: qa.q.replace(/^Q&A\s+\d+:\s*/iu, ''),
        });
        fields.push({
          path: `${chapterId}.sections[${sectionIndex}].qas[${qaIndex}].a`,
          text: qa.a,
        });
      });
    });
  }
  return fields.filter(({ text }) => tokens(text).length > 0);
}

function markdownReport(fields, mismatches) {
  const lines = [
    '# Code JSON / revised Word review',
    '',
    `Checked ${fields.length} source-backed text fragments across ${CHAPTER_IDS.length} JSON files.`,
    `${fields.length - mismatches.length} match verbatim; ${mismatches.length} require review.`,
    '',
    'For each candidate, record **keep app**, **keep Word**, or **structural difference**.',
    '',
  ];
  mismatches.forEach(({ path: fieldPath, tokenCount, difference }, index) => {
    lines.push(`## ${index + 1}. \`${fieldPath}\``, '', `${tokenCount} tokens.`, '', '```text', difference, '```', '');
  });
  return `${lines.join('\n')}\n`;
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  if (arguments_.help) {
    printHelp();
    return;
  }
  const docx = await readFile(DOCX_PATH);
  const digest = createHash('sha256').update(docx).digest('hex').toUpperCase();
  if (digest !== DOCX_SHA256) {
    throw new Error(`Unexpected Code DOCX SHA-256: ${digest}; expected ${DOCX_SHA256}`);
  }

  const { value: docxHtml } = await mammoth.convertToHtml({ buffer: docx });
  const editorialStart = docxHtml.lastIndexOf(EDITORIAL_RECORD_HEADING);
  if (editorialStart < 0) throw new Error('The DOCX editorial correction record was not found.');
  const documentTokens = tokens(docxHtml.slice(0, editorialStart));
  const fields = await sourceFields();
  const mismatches = [];

  for (const field of fields) {
    const expectedTokens = tokens(field.text);
    if (findSequence(documentTokens, expectedTokens) < 0) {
      mismatches.push({
        ...field,
        tokenCount: expectedTokens.length,
        difference: firstLikelyDifference(documentTokens, expectedTokens),
      });
    }
  }

  console.log(`Checked ${fields.length} Code text fragments from ${CHAPTER_IDS.length} JSON files.`);
  console.log(`${fields.length - mismatches.length} fragments match the revised Word document verbatim.`);
  if (mismatches.length === 0) {
    console.log('PASS: all app Code text matches the revised Word document.');
    return;
  }

  console.error(`FAIL: ${mismatches.length} fragments require reconciliation:`);
  mismatches.forEach(({ path: fieldPath, tokenCount, difference }, index) => {
    console.error(`\n[${index + 1}] ${fieldPath} (${tokenCount} tokens)\n  ${difference}`);
  });
  if (arguments_.reportPath) {
    await writeFile(arguments_.reportPath, markdownReport(fields, mismatches), 'utf8');
    console.error(`\nWrote review report: ${arguments_.reportPath}`);
  } else {
    console.error('\nTip: add -- --report code-docx-review.md to create a shareable checklist.');
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
