import test from 'node:test';
import assert from 'node:assert/strict';

import { filterDecisionTrees } from '../src/utils/treeSearchUtils.js';

const trees = [
  { id: 'grants', title: 'Grants', description: 'Funding requirements' },
  { id: 'events', title: 'Event locations', description: 'Hospitality rules' },
];

test('filters decision trees by title or description', () => {
  assert.deepEqual(
    filterDecisionTrees(trees, ' grants '),
    [trees[0]],
  );
  assert.deepEqual(
    filterDecisionTrees(trees, 'HOSPITALITY'),
    [trees[1]],
  );
  assert.deepEqual(filterDecisionTrees(trees, 'missing'), []);
});

test('returns the original list for an empty query and handles invalid input', () => {
  assert.equal(filterDecisionTrees(trees, '  '), trees);
  assert.deepEqual(filterDecisionTrees(null, 'events'), []);
});
