import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateScrollProgress } from '../src/utils/scrollProgressUtils.js';

test('calculates and clamps scroll progress', () => {
  assert.equal(calculateScrollProgress({
    scrollTop: 250,
    scrollHeight: 1500,
    clientHeight: 1000,
  }), 50);

  assert.equal(calculateScrollProgress({
    scrollTop: -10,
    scrollHeight: 1500,
    clientHeight: 1000,
  }), 0);

  assert.equal(calculateScrollProgress({
    scrollTop: 700,
    scrollHeight: 1500,
    clientHeight: 1000,
  }), 100);
});

test('returns zero when there is no scrollable distance', () => {
  assert.equal(calculateScrollProgress({
    scrollTop: 0,
    scrollHeight: 1000,
    clientHeight: 1000,
  }), 0);
});
