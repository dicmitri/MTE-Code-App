import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { generateSectionId } from '../src/utils/textUtils.js';
import { CODE_CHAPTER_IDS } from '../src/data/codeOrder.js';
import { collectStringEntries, sha256, stringEntriesSha256 } from './lib/code-content.mjs';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const CODE_DIRECTORY = resolve(PROJECT_ROOT, 'src/data/code');
const MANIFEST_PATH = resolve(PROJECT_ROOT, 'src/data/code-manifest.json');

function removeGeneratedTerminalLineEnding(rawFile, fileName) {
  if (rawFile.endsWith('\r\n')) return rawFile.slice(0, -2);
  if (rawFile.endsWith('\n')) return rawFile.slice(0, -1);
  throw new Error(`${fileName}: expected one generated terminal line ending.`);
}

export function verifyCodeMigration({
  codeDirectory = CODE_DIRECTORY,
  manifestPath = MANIFEST_PATH,
} = {}) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.manifestVersion, 1, 'Unsupported code migration manifest version.');
  assert.deepEqual(CODE_CHAPTER_IDS, manifest.chapterOrder, 'codeOrder.js differs from the frozen manifest.');

  const expectedFiles = manifest.chapters.map((chapter) => chapter.file).sort();
  const actualFiles = readdirSync(codeDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort();
  assert.deepEqual(actualFiles, expectedFiles, 'Chapter file set differs from the frozen manifest.');

  const rawObjects = [];
  const parsedChapters = [];
  let sectionCount = 0;
  let qaCount = 0;
  let stringCount = 0;

  manifest.chapters.forEach((expected, index) => {
    const rawFile = readFileSync(resolve(codeDirectory, expected.file), 'utf8');
    const rawObject = removeGeneratedTerminalLineEnding(rawFile, expected.file);
    const parsed = JSON.parse(rawObject);
    const strings = collectStringEntries(parsed);
    const sections = Array.isArray(parsed.sections) ? parsed.sections : [];
    const sectionIds = sections.map((section, sectionIndex) => (
      generateSectionId(parsed.id, section.title, sectionIndex)
    ));
    const qas = sections.reduce((count, section) => count + (section.qas?.length ?? 0), 0);

    assert.equal(parsed.id, expected.id, `${expected.file}: chapter ID changed.`);
    assert.equal(manifest.chapterOrder[index], parsed.id, `${expected.file}: chapter order changed.`);
    assert.equal(Buffer.byteLength(rawObject, 'utf8'), expected.rawBytes, `${expected.file}: raw byte count changed.`);
    assert.equal(sha256(rawObject), expected.rawSha256, `${expected.file}: raw source slice changed.`);
    assert.equal(strings.length, expected.stringCount, `${expected.file}: string count changed.`);
    assert.equal(stringEntriesSha256(parsed), expected.stringSha256, `${expected.file}: string content changed.`);
    assert.equal(sections.length, expected.sections, `${expected.file}: section count changed.`);
    assert.equal(qas, expected.qas, `${expected.file}: Q&A count changed.`);
    assert.deepEqual(sectionIds, expected.sectionIds, `${expected.file}: generated section routes changed.`);

    rawObjects.push(rawObject);
    parsedChapters.push(parsed);
    sectionCount += sections.length;
    qaCount += qas;
    stringCount += strings.length;
  });

  const reconstructedSource = manifest.sourceReconstruction.prefix
    + rawObjects.map((rawObject, index) => (
      index === 0 ? rawObject : `${manifest.sourceReconstruction.separators[index - 1]}${rawObject}`
    )).join('')
    + manifest.sourceReconstruction.suffix;

  assert.equal(Buffer.byteLength(reconstructedSource, 'utf8'), manifest.source.bytes, 'Reconstructed monolith byte count changed.');
  assert.equal(sha256(reconstructedSource), manifest.source.sha256, 'Reconstructed monolith hash changed.');
  assert.equal(sha256(JSON.stringify({ chapters: parsedChapters })), manifest.semanticSha256, 'Parsed Code data changed.');
  assert.deepEqual({
    chapters: parsedChapters.length,
    sections: sectionCount,
    qas: qaCount,
    strings: stringCount,
  }, manifest.totals, 'Aggregate content counts changed.');

  return {
    sourceSha256: manifest.source.sha256,
    chapters: parsedChapters.length,
    sections: sectionCount,
    qas: qaCount,
    strings: stringCount,
  };
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  try {
    const result = verifyCodeMigration();
    console.log('Code migration preservation check passed.');
    console.log(`Reconstructed source SHA-256: ${result.sourceSha256}`);
    console.log(`${result.chapters} chapters, ${result.sections} sections, ${result.qas} Q&As, ${result.strings} strings`);
  } catch (error) {
    console.error(`Code migration preservation check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
