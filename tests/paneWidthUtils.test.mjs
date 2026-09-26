import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizePaneWidths, pxToRem } from '../src/utils/paneWidthUtils.js';

test('keeps saved pane widths, rounded to hundredths of a rem', () => {
  assert.deepEqual(normalizePaneWidths({ sidebar: 22.123, sidePane: 30 }), { sidebar: 22.12, sidePane: 30 });
});

test('a pane that was never resized, or has an unusable saved width, follows its default', () => {
  const defaults = { sidebar: null, sidePane: null };
  assert.deepEqual(normalizePaneWidths(null), defaults);
  assert.deepEqual(normalizePaneWidths('wide'), defaults);
  assert.deepEqual(normalizePaneWidths({ sidebar: '20rem', sidePane: Number.NaN }), defaults);
  assert.deepEqual(normalizePaneWidths({ sidebar: 2, sidePane: 500 }), defaults);
  assert.deepEqual(normalizePaneWidths({ sidebar: 20, other: 30 }), { sidebar: 20, sidePane: null });
});

test('converts dragged pixel widths to rem at the current interface size', () => {
  assert.equal(pxToRem(360, 16), 22.5);
  assert.equal(pxToRem(360, 18), 20);
  assert.equal(pxToRem(320, 0), 20);
});
