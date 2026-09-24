// Builds SearchDocument objects from the current Code and Transparency content. Everything
// here is derived from the JSON passed in at call time -- no chapter, section, Q&A or term is
// hard-coded -- so search documents stay correct automatically as content changes.
//
// SearchDocument = {
//   id, type, authoritative, label, qaNumber, title, location,
//   fields: { title, context, body }, terms?, target,
// }
import { htmlToPlainText } from './htmlTextUtils.js';
import { generateSectionId, getQaAnchorId, splitGlossaryDefinitions } from './textUtils.js';

const collapseWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const plainText = (html) => collapseWhitespace(htmlToPlainText(html));

const isPurelyNumeric = (value) => /^\d+$/.test(String(value ?? ''));

const chapterLabel = (chapter) => (
  isPurelyNumeric(chapter.icon) ? `Ch ${chapter.icon} \u00b7 ${chapter.title}` : chapter.title
);

const sectionLocation = (label, sectionTitle) => (
  sectionTitle ? `${label} \u203a ${sectionTitle}` : label
);

const CODE_QA_NUMBER_PATTERN = /^Q&A (\d+)/;
const CODE_QA_TITLE_PREFIX = /^Q&A \d+:\s*/;
const TRANSPARENCY_QA_LABEL_PATTERN = /Q&A (\d+)/;
const TRANSPARENCY_QA_TITLE_PREFIX = /^Q:\s*/;
const HEADWORD_PARAGRAPH_PREFIX = /^<p><strong>[^<]*<\/strong>/;

const qaLabel = (qaNumber) => (qaNumber ? `Q&A ${qaNumber}` : 'Q&A');

/**
 * One SearchDocument per Code provision, Q&A, Glossary definition and app summary. The
 * Glossary chapter is excluded from provisions/summaries and instead produces one document
 * per definition (see splitGlossaryDefinitions).
 */
export const buildCodeSearchDocuments = (chapters) => {
  const documents = [];

  for (const chapter of chapters || []) {
    if (chapter.id === 'glossary') {
      const glossaryHtml = (chapter.sections || []).map((section) => section.legalText || '').join('');
      for (const { entry, html } of splitGlossaryDefinitions(glossaryHtml)) {
        const bodyHtml = html.replace(HEADWORD_PARAGRAPH_PREFIX, '');
        documents.push({
          id: `code/definition/${entry.id}`,
          type: 'definition',
          authoritative: true,
          label: 'Definition',
          qaNumber: null,
          title: entry.term,
          location: 'Glossary',
          fields: { title: entry.term, context: 'Glossary', body: plainText(bodyHtml) },
          terms: [entry.term, ...entry.forms.map((form) => form.text)],
          target: { kind: 'definition', termId: entry.id },
        });
      }
      continue;
    }

    const label = chapterLabel(chapter);

    if (chapter.summary) {
      documents.push({
        id: `code/summary/${chapter.id}`,
        type: 'summary',
        authoritative: false,
        label: 'App summary',
        qaNumber: null,
        title: chapter.title,
        location: label,
        fields: { title: chapter.title, context: '', body: plainText(chapter.summary) },
        target: { kind: 'chapter', chapterId: chapter.id },
      });
    }

    const isAppInfo = chapter.part === 'website';

    (chapter.sections || []).forEach((section, sectionIndex) => {
      const sectionId = generateSectionId(chapter.id, section.title, sectionIndex);
      const sectionTitle = section.title || chapter.title;
      const location = sectionLocation(label, section.title);

      documents.push({
        id: `code/${sectionId}`,
        type: isAppInfo ? 'app-info' : 'provision',
        authoritative: !isAppInfo,
        label: isAppInfo ? 'Version history' : 'Provision',
        qaNumber: null,
        title: sectionTitle,
        location,
        fields: { title: sectionTitle, context: chapter.title, body: plainText(section.legalText) },
        target: { kind: 'code-section', chapterId: chapter.id, anchor: sectionId },
      });

      (section.qas || []).forEach((qa, qaIndex) => {
        const anchor = getQaAnchorId(sectionId, qaIndex);
        const question = plainText(qa.q);
        const qaNumber = (CODE_QA_NUMBER_PATTERN.exec(question) || [])[1] || null;
        const title = question.replace(CODE_QA_TITLE_PREFIX, '');

        documents.push({
          id: `code/${anchor}`,
          type: 'qa',
          authoritative: true,
          label: qaLabel(qaNumber),
          qaNumber,
          title,
          location,
          fields: {
            title,
            context: `${chapter.title} ${section.title}`,
            body: plainText(qa.a),
          },
          target: { kind: 'code-section', chapterId: chapter.id, anchor },
        });
      });
    });
  }

  return documents;
};

/**
 * One SearchDocument per Transparency provision and Q&A, plus one publication-overview
 * document per document (matching what today's search already surfaces for a publication).
 */
export const buildTransparencySearchDocuments = (documents) => {
  const searchDocuments = [];

  for (const document of documents || []) {
    for (const unit of document.units || []) {
      (unit.sections || []).forEach((section, sectionIndex) => {
        const sectionId = generateSectionId(unit.id, section.title, sectionIndex);
        const sectionTitle = section.title || unit.title;
        const location = sectionLocation(unit.title, section.title);

        searchDocuments.push({
          id: `transparency/${document.id}/${sectionId}`,
          type: 'provision',
          authoritative: true,
          label: 'Provision',
          qaNumber: null,
          title: sectionTitle,
          location,
          fields: {
            title: sectionTitle,
            context: `${document.title} ${unit.title}`,
            body: plainText(section.legalText),
          },
          target: {
            kind: 'transparency-section', documentId: document.id, unitId: unit.id, anchor: sectionId,
          },
        });

        (section.qas || []).forEach((qa, qaIndex) => {
          const anchor = getQaAnchorId(sectionId, qaIndex);
          const qaNumber = (TRANSPARENCY_QA_LABEL_PATTERN.exec(qa.label || '') || [])[1] || null;
          const title = plainText(qa.q).replace(TRANSPARENCY_QA_TITLE_PREFIX, '');

          searchDocuments.push({
            id: `transparency/${document.id}/${anchor}`,
            type: 'qa',
            authoritative: true,
            label: qaLabel(qaNumber),
            qaNumber,
            title,
            location,
            fields: {
              title,
              context: `${document.title} ${unit.title} ${section.title}`,
              body: plainText(qa.a),
            },
            target: {
              kind: 'transparency-section', documentId: document.id, unitId: unit.id, anchor,
            },
          });
        });
      });
    }

    searchDocuments.push({
      id: `transparency/${document.id}`,
      type: 'publication',
      authoritative: false,
      label: 'Publication',
      qaNumber: null,
      title: document.title,
      location: document.eyebrow || '',
      fields: {
        title: document.title,
        context: document.eyebrow || '',
        body: [document.description, document.publicationDate].filter(Boolean).join(' '),
      },
      target: { kind: 'transparency-document', documentId: document.id },
    });
  }

  return searchDocuments;
};

/**
 * One entry per Glossary definition, from the chapter with id "glossary". Returns [] if there
 * is no glossary chapter (defensive: search must not crash if the Code is ever restructured).
 */
export const buildGlossaryTerms = (chapters) => {
  const glossaryChapter = (chapters || []).find((chapter) => chapter.id === 'glossary');
  if (!glossaryChapter) return [];

  const glossaryHtml = (glossaryChapter.sections || []).map((section) => section.legalText || '').join('');

  return splitGlossaryDefinitions(glossaryHtml).map(({ headword, entry, html }) => ({
    id: entry.id,
    term: entry.term,
    headword,
    forms: entry.forms.map((form) => form.text),
    text: plainText(html.replace(HEADWORD_PARAGRAPH_PREFIX, '')),
  }));
};
