import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadTransparencyData } from '../scripts/lib/transparency-content.mjs';
import { TRANSPARENCY_DOCUMENTS } from '../src/data/transparency/transparencyData.js';
import { generateSectionId } from '../src/utils/textUtils.js';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDirectory, '..');

function removeRuntimeFields(documents) {
  return documents.map((document) => ({
    ...document,
    units: document.units.map((unit) => ({
      ...unit,
      sections: unit.sections.map(({ computedId, ...section }, sectionIndex) => {
        assert.equal(
          computedId,
          generateSectionId(unit.id, section.title, sectionIndex),
          `Runtime section ID changed for ${unit.id} section ${sectionIndex}.`,
        );
        return section;
      }),
    })),
  }));
}

test('runtime Transparency registry exactly matches the validation and fidelity loader', () => {
  assert.deepEqual(
    removeRuntimeFields(TRANSPARENCY_DOCUMENTS),
    loadTransparencyData(projectRoot),
  );
});
