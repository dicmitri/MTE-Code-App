import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { CODE_CHAPTER_IDS } from '../../src/data/codeOrder.js';

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex').toUpperCase();
}

export function collectStringEntries(value, path = '') {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectStringEntries(entry, `${path}/${index}`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) => (
      collectStringEntries(entry, `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`)
    ));
  }
  return [];
}

export function stringEntriesSha256(value) {
  return sha256(JSON.stringify(collectStringEntries(value)));
}

export function loadSplitCodeData(projectRoot) {
  const codeDirectory = resolve(projectRoot, 'src/data/code');
  const expectedFiles = CODE_CHAPTER_IDS.map((id) => `${id}.json`);
  const actualFiles = readdirSync(codeDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort();

  const unexpectedFiles = actualFiles.filter((fileName) => !expectedFiles.includes(fileName));
  const missingFiles = expectedFiles.filter((fileName) => !actualFiles.includes(fileName));
  if (unexpectedFiles.length || missingFiles.length) {
    const details = [
      missingFiles.length ? `missing: ${missingFiles.join(', ')}` : null,
      unexpectedFiles.length ? `unexpected: ${unexpectedFiles.join(', ')}` : null,
    ].filter(Boolean).join('; ');
    throw new Error(`Split Code chapter files do not match codeOrder.js (${details}).`);
  }

  const chapters = CODE_CHAPTER_IDS.map((expectedId) => {
    const fileName = `${expectedId}.json`;
    const chapter = JSON.parse(readFileSync(resolve(codeDirectory, fileName), 'utf8'));
    if (!chapter || Array.isArray(chapter) || typeof chapter !== 'object') {
      throw new Error(`${fileName}: expected one chapter object.`);
    }
    if (chapter.id !== expectedId) {
      throw new Error(`${fileName}: chapter ID must be "${expectedId}", found "${chapter.id ?? ''}".`);
    }
    return chapter;
  });

  return { chapters };
}
