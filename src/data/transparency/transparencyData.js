import { generateSectionId } from '../../utils/textUtils.js';
import disclosureGuidelinesDocument from './disclosure-guidelines/document.json' with { type: 'json' };
import preamble from './disclosure-guidelines/preamble.json' with { type: 'json' };
import chapter1 from './disclosure-guidelines/ch1.json' with { type: 'json' };
import chapter2 from './disclosure-guidelines/ch2.json' with { type: 'json' };
import chapter3 from './disclosure-guidelines/ch3.json' with { type: 'json' };
import annex1 from './disclosure-guidelines/annex1.json' with { type: 'json' };
import annex2 from './disclosure-guidelines/annex2.json' with { type: 'json' };
import annex3 from './disclosure-guidelines/annex3.json' with { type: 'json' };

const prepareUnit = (unit) => ({
  ...unit,
  sections: unit.sections.map((section, sectionIndex) => ({
    ...section,
    computedId: generateSectionId(unit.id, section.title, sectionIndex),
  })),
});

const disclosureUnitsById = new Map(
  [preamble, chapter1, chapter2, chapter3, annex1, annex2, annex3]
    .map(prepareUnit)
    .map((unit) => [unit.id, unit]),
);

export const DISCLOSURE_GUIDELINES_DATA = Object.freeze(
  disclosureGuidelinesDocument.unitIds.map((unitId) => {
    const unit = disclosureUnitsById.get(unitId);
    if (!unit) throw new Error(`Missing Disclosure Guidelines unit "${unitId}".`);
    return unit;
  }),
);

export const DISCLOSURE_GUIDELINES_DOCUMENT = Object.freeze({
  ...disclosureGuidelinesDocument,
  units: DISCLOSURE_GUIDELINES_DATA,
});

export const TRANSPARENCY_DOCUMENTS = Object.freeze([
  DISCLOSURE_GUIDELINES_DOCUMENT,
]);

export function getTransparencyDocument(documentId) {
  return TRANSPARENCY_DOCUMENTS.find((document) => document.id === documentId);
}

export function getTransparencyUnit(documentId, unitId) {
  return getTransparencyDocument(documentId)?.units
    .find((unit) => unit.id === unitId);
}
