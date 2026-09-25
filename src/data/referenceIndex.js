import { CODE_CHAPTERS } from './codeData';
import { TRANSPARENCY_DOCUMENTS } from './transparency/transparencyData';
import { createReferenceIndex } from '../utils/crossReferences';

// Lookup tables for links between chapters, sections and Q&As of the Code and the
// Transparency publications (see utils/crossReferences.js). Website pages are not targets.
export const REFERENCE_INDEX = createReferenceIndex({
  codeChapters: CODE_CHAPTERS,
  transparencyDocuments: TRANSPARENCY_DOCUMENTS,
});
