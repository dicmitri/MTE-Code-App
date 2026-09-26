import { processReaderHtml } from './textUtils.js';
import { linkCrossReferences } from './crossReferences.js';

// The checker's wording is plain text in src/data/eventSupportRules.json.
const escapeHtml = (text) => String(text ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// The checker is not a page of the Code, so every reference it makes can link.
const CHECKER_CONTEXT = { publication: 'code', unitId: null };

export function formatMessage(data, id, params = null) {
  const text = data.messages[id] ?? '';
  return params ? text.replace(/\{(\w+)\}/g, (match, key) => params[key] ?? match) : text;
}

/**
 * Turns plain checker texts into HTML in which glossary terms and references such as
 * "Chapter 4, Section 3", "Annex I" or "Q&A 20" are linked. A term is linked where it first
 * appears among the texts passed together, as in a section of the Code.
 */
export function linkCheckerTexts(texts, { glossaryMap = null, referenceIndex = null } = {}) {
  const linkedTerms = new Set();
  const linkReferences = referenceIndex
    ? (html) => linkCrossReferences(html, { index: referenceIndex, context: CHECKER_CONTEXT })
    : null;
  return texts.map((text) => processReaderHtml(escapeHtml(text), { glossaryMap, linkedTerms, linkReferences }));
}
