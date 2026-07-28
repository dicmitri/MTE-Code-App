import React from 'react';
import declarationTemplateRaw from '../data/declaration-csv-template.csv?raw';
import declarationTemplateUrl from '../data/declaration-csv-template.csv?url&no-inline';
import disclosureGuidelinesPdfUrl from '../data/mte-code_disclosure_guidelines.pdf?url';
import {
  DISCLOSURE_GUIDELINES_DOCUMENT,
  TRANSPARENCY_DOCUMENTS,
} from '../data/transparency/transparencyData';
import { buildTransparencySectionPath } from '../utils/routeUtils';
import { CsvTemplatePreview } from './CsvTemplatePreview';
import { DocumentReader } from './DocumentReader';
import {
  TransparencyDocumentLandingPage,
  TransparencyLandingPage,
} from './TransparencyLandingPage';

const DECLARATION_TEMPLATE_ID = 'declaration-csv-template';
const EMPTY_RESOURCE_LINKS = Object.freeze({});
const DISCLOSURE_RESOURCE_LINKS = Object.freeze({
  [DECLARATION_TEMPLATE_ID]: Object.freeze({
    url: declarationTemplateUrl,
    filename: 'declaration-csv-template.csv',
  }),
});

export const TransparencyContent = ({
  activeId,
  activeDocumentId,
  activeContent,
  onNavigateTransparencyHome,
  onNavigateDocument,
  onNavigateUnit,
  showFullText,
  showQA,
  debouncedSearch,
  scrollRef,
  showIosPrompt,
  setShowIosPrompt,
  bookmarksControls,
  searchFilters,
}) => {
  if (!activeDocumentId) {
    return (
      <TransparencyLandingPage
        documents={TRANSPARENCY_DOCUMENTS}
        onOpenDocument={onNavigateDocument}
      />
    );
  }

  const activeDocument = TRANSPARENCY_DOCUMENTS.find(
    (document) => document.id === activeDocumentId,
  );

  if (!activeDocument) {
    return (
      <TransparencyLandingPage
        documents={TRANSPARENCY_DOCUMENTS}
        onOpenDocument={onNavigateDocument}
      />
    );
  }

  const isDisclosureGuidelines = activeDocument.id === DISCLOSURE_GUIDELINES_DOCUMENT.id;
  const sourceDocumentUrl = isDisclosureGuidelines
    ? disclosureGuidelinesPdfUrl
    : activeDocument.sourceDocumentUrl || null;
  const resourceLinks = isDisclosureGuidelines
    ? DISCLOSURE_RESOURCE_LINKS
    : activeDocument.resourceLinks || EMPTY_RESOURCE_LINKS;

  const renderSectionSupplement = (section) => {
    const hasDeclarationTemplate = isDisclosureGuidelines
      && (section.resourceId === DECLARATION_TEMPLATE_ID
        || section.resources?.some((resource) => resource.id === DECLARATION_TEMPLATE_ID));

    if (!hasDeclarationTemplate) return null;

    return (
      <CsvTemplatePreview
        csvText={declarationTemplateRaw}
        downloadUrl={declarationTemplateUrl}
        filename="declaration-csv-template.csv"
      />
    );
  };

  const buildSectionPath = (unitId, sectionId) => (
    buildTransparencySectionPath(activeDocumentId, unitId, sectionId)
  );

  return (
    <DocumentReader
      activeId={activeId}
      activeContent={activeContent}
      items={activeDocument.units || []}
      renderLanding={() => (
        <TransparencyDocumentLandingPage
          document={activeDocument}
          units={activeDocument.units || []}
          onSelectUnit={(unitId) => onNavigateUnit(activeDocumentId, unitId)}
          sourcePdfUrl={sourceDocumentUrl}
          onBack={onNavigateTransparencyHome}
        />
      )}
      onItemChange={(unitId) => onNavigateUnit(activeDocumentId, unitId)}
      onNavigateHome={() => onNavigateDocument(activeDocumentId)}
      homeLabel={activeDocument.title}
      showSummary={false}
      showFullText={showFullText}
      showQA={showQA}
      debouncedSearch={debouncedSearch}
      glossaryMap={null}
      scrollRef={scrollRef}
      showIosPrompt={showIosPrompt}
      setShowIosPrompt={setShowIosPrompt}
      bookmarksControls={bookmarksControls}
      bookmarkSection="transparency"
      bookmarkDocumentId={activeDocumentId}
      searchFilters={searchFilters}
      formatContentTitle={(content) => content?.displayTitle || content?.title}
      formatSectionPrefix={(content) => content?.citationPrefix || ''}
      buildSectionPath={buildSectionPath}
      citationSourceTitle={
        activeDocument.citationSourceTitle
        || `${activeDocument.title}${activeDocument.publicationDate ? ` (${activeDocument.publicationDate})` : ''}`
      }
      citationMarkdownLabel={activeDocument.citationMarkdownLabel || activeDocument.title}
      resourceLinks={resourceLinks}
      renderSectionSupplement={renderSectionSupplement}
      printAllQA
      sourceDocumentUrl={sourceDocumentUrl}
      readerClassName="transparency-reader"
    />
  );
};
