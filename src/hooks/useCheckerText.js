import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { REFERENCE_INDEX } from '../data/referenceIndex';
import { linkCheckerTexts } from '../utils/eventSupportText';

/**
 * The event support checker's texts as sanitized markup, with glossary terms and Code references
 * linked. Texts passed together share one set of linked terms, so a term is linked once.
 * The { __html } objects are memoized: a new object would make React rewrite the markup,
 * losing the focus of a glossary term.
 */
export function useCheckerText(texts, glossaryMap) {
  const key = texts.join('\u0000');
  return useMemo(
    () => linkCheckerTexts(texts, { glossaryMap, referenceIndex: REFERENCE_INDEX })
      .map((html) => ({ __html: DOMPurify.sanitize(html) })),
    // `key` stands for the texts' content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, glossaryMap],
  );
}
