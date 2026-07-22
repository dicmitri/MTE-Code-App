import test from 'node:test';
import assert from 'node:assert/strict';

import { generateSectionId } from '../src/utils/textUtils.js';

test('keeps known section IDs stable', () => {
  assert.equal(
    generateSectionId('ch1', '2. Event Location and Venue', 1),
    'ch1-2-event-location-and-venue',
  );
  assert.equal(generateSectionId('scope', '', 2), 'scope-section-2');
});
