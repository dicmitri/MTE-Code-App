import test from 'node:test';
import assert from 'node:assert/strict';

import { getSidePanelMinWidth } from '../src/hooks/useSidePanelFits.js';

test('the side panel needs 1440px at the default text size', () => {
  assert.equal(getSidePanelMinWidth('1rem', '40'), 1440);
  assert.equal(getSidePanelMinWidth('0.95rem', '40'), 1440);
});

test('larger text or wide lines need a wider window before the panel appears', () => {
  // Sidebar, reader padding, gap and panel (776px) plus the text column.
  assert.equal(getSidePanelMinWidth('1.25rem', '40'), 776 + 800);
  assert.equal(getSidePanelMinWidth('1rem', '52'), 776 + 832);
});
