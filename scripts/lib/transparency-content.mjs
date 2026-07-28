import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadTransparencyData(projectRoot) {
  const publicationDirectory = resolve(
    projectRoot,
    'src/data/transparency/disclosure-guidelines',
  );
  const document = readJson(resolve(publicationDirectory, 'document.json'));
  const unitFiles = {
    'dg-preamble': 'preamble.json',
    'dg-chapter-1': 'ch1.json',
    'dg-chapter-2': 'ch2.json',
    'dg-chapter-3': 'ch3.json',
    'dg-annex-1': 'annex1.json',
    'dg-annex-2': 'annex2.json',
    'dg-annex-3': 'annex3.json',
  };

  const units = document.unitIds.map((unitId) => {
    const filename = unitFiles[unitId];
    if (!filename) {
      throw new Error(`No data file is registered for Transparency unit "${unitId}".`);
    }

    const unit = readJson(resolve(publicationDirectory, filename));
    if (unit.id !== unitId) {
      throw new Error(
        `Transparency unit "${unitId}" has mismatched file ID "${unit.id || ''}".`,
      );
    }
    return unit;
  });

  return [{
    ...document,
    units,
  }];
}
