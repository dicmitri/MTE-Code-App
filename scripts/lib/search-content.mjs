import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildCodeSearchDocuments, buildGlossaryTerms, buildTransparencySearchDocuments } from '../../src/utils/searchDocuments.js';
import { createSearchIndex } from '../../src/utils/searchEngine.js';
import { loadSplitCodeData } from './code-content.mjs';
import { loadTransparencyData } from './transparency-content.mjs';

const EMPTY_PHRASEBOOK = { groups: [] };

// The phrasebook is authored separately (src/data/search/phrasebook.json) and may not exist
// yet, or may be missing entirely in an environment that never needs it -- an absent or
// unreadable phrasebook must never break search, it just means no general-English expansions.
export function loadSearchPhrasebook(projectRoot) {
  const phrasebookPath = resolve(projectRoot, 'src/data/search/phrasebook.json');
  if (!existsSync(phrasebookPath)) return EMPTY_PHRASEBOOK;

  try {
    const parsed = JSON.parse(readFileSync(phrasebookPath, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : EMPTY_PHRASEBOOK;
  } catch {
    return EMPTY_PHRASEBOOK;
  }
}

// Builds both search indexes (Code and Transparency) from the current content on disk. Both
// scopes receive the same Code Glossary, so general Code terms (and their abbreviations) stay
// searchable from within the Disclosure Guidelines too.
export function loadSearchIndexes(projectRoot) {
  const { chapters } = loadSplitCodeData(projectRoot);
  const transparencyDocuments = loadTransparencyData(projectRoot);
  const phrasebook = loadSearchPhrasebook(projectRoot);
  const glossary = buildGlossaryTerms(chapters);

  const code = createSearchIndex(buildCodeSearchDocuments(chapters), {
    phrasebook, glossary, scope: 'code',
  });
  const transparency = createSearchIndex(buildTransparencySearchDocuments(transparencyDocuments), {
    phrasebook, glossary, scope: 'transparency',
  });

  return { code, transparency };
}
