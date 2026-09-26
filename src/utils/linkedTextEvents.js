import { isPlainLinkClick } from './crossReferences.js';

/**
 * Click and key handlers for text with glossary terms (role="button" spans with data-term) and
 * cross-reference links (a.cross-reference with data-reference). Attach them to the element that
 * contains the text. Shared by the Code and Transparency readers and the event support checker.
 */
export function createLinkedTextHandlers({ onTermClick, onOpenReference }) {
  const openGlossaryTerm = (target) => {
    const termNode = target.closest?.('.glossary-term');
    if (!termNode) return false;
    onTermClick?.(termNode.getAttribute('data-term'), termNode);
    return true;
  };

  // A plain click on a reference opens it in the app (a preview on wide screens); modified
  // clicks keep the browser's behaviour, such as opening a new tab.
  const openCrossReference = (event) => {
    const link = event.target.closest?.('a.cross-reference');
    if (!link || !onOpenReference || !isPlainLinkClick(event)) return false;
    event.preventDefault();
    onOpenReference(link.getAttribute('data-reference'), link);
    return true;
  };

  return {
    handleClick(event) {
      if (openGlossaryTerm(event.target) || openCrossReference(event)) event.stopPropagation();
    },
    // Glossary terms are role="button" spans so they wrap with the text; give them a native
    // button's keys: Enter on key down, Space on key up (without scrolling the page).
    handleKeyDown(event) {
      if (event.key === 'Enter' && openGlossaryTerm(event.target)) event.preventDefault();
      if (event.key === ' ' && event.target.closest?.('.glossary-term')) event.preventDefault();
    },
    handleKeyUp(event) {
      if (event.key === ' ') openGlossaryTerm(event.target);
    },
  };
}
