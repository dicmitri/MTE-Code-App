import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

import { generateSectionId } from '../src/utils/textUtils.js';
import { validateEventSupportData } from '../src/utils/eventSupportRules.js';
import { loadSplitCodeData } from './lib/code-content.mjs';
import { loadTransparencyData } from './lib/transparency-content.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');

const ALLOWED_PARTS = new Set(['intro', 'part1', 'part2', 'part3', 'website']);
const ALLOWED_OUTCOMES = new Set([
  'compliant',
  'non-compliant',
  'conditional',
  'consult-legal',
  'not-required',
  'out-of-scope',
  'not-applicable',
  'prior-review',
  'in-scope',
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates];
}

function asArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function extractRegisteredIconNames(iconSource) {
  const names = new Set();

  for (const mapName of ['customIconMap', 'lucideIconMap']) {
    const mapMatch = iconSource.match(new RegExp(`const ${mapName} = \\{([\\s\\S]*?)\\};`));
    if (!mapMatch) continue;

    for (const identifier of mapMatch[1].match(/[A-Za-z][A-Za-z0-9]*/g) || []) {
      names.add(identifier);
    }
  }

  return names;
}

export function validateProjectData({
  codeData,
  treeData,
  quizData,
  transparencyData = [],
  iconSource = '',
}) {
  const errors = [];
  const chapters = Array.isArray(codeData?.chapters) ? codeData.chapters : [];
  const trees = Array.isArray(treeData?.trees) ? treeData.trees : [];
  const questions = Array.isArray(quizData) ? quizData : [];
  const transparencyDocuments = Array.isArray(transparencyData) ? transparencyData : [];
  const registeredIconNames = extractRegisteredIconNames(iconSource);

  if (!Array.isArray(codeData?.chapters)) {
    errors.push('Code data: expected a chapters array.');
  }
  if (!Array.isArray(treeData?.trees)) {
    errors.push('treeData.json: expected a top-level "trees" array.');
  }
  if (!Array.isArray(quizData)) {
    errors.push('quizData.json: expected a top-level array.');
  }
  if (!Array.isArray(transparencyData)) {
    errors.push('Transparency data: expected a documents array.');
  }

  const chapterIds = chapters.map((chapter) => chapter?.id).filter(isNonEmptyString);
  for (const duplicate of findDuplicates(chapterIds)) {
    errors.push(`Code data: duplicate chapter ID "${duplicate}".`);
  }

  const chapterIdSet = new Set(chapterIds);
  const sectionIdSet = new Set();
  const generatedSectionIds = [];
  let sectionCount = 0;
  let qaCount = 0;

  chapters.forEach((chapter, chapterIndex) => {
    const chapterPath = `Code data chapters[${chapterIndex}]`;

    if (!isNonEmptyString(chapter?.id)) errors.push(`${chapterPath}: missing chapter ID.`);
    if (!isNonEmptyString(chapter?.title)) errors.push(`${chapterPath}: missing title.`);
    if (!ALLOWED_PARTS.has(chapter?.part)) {
      errors.push(`${chapterPath}: invalid part "${chapter?.part ?? ''}".`);
    }
    if (!isNonEmptyString(chapter?.icon)) {
      errors.push(`${chapterPath}: missing icon.`);
    } else if (!/^\d+$/.test(chapter.icon) && !registeredIconNames.has(chapter.icon)) {
      errors.push(`${chapterPath}: icon "${chapter.icon}" is not registered in AppIcons.jsx.`);
    }

    if (!Array.isArray(chapter?.sections)) {
      errors.push(`${chapterPath}: expected a sections array.`);
      return;
    }

    chapter.sections.forEach((section, sectionIndex) => {
      sectionCount += 1;
      const sectionPath = `${chapterPath} sections[${sectionIndex}]`;
      const sectionId = generateSectionId(chapter.id, section?.title, sectionIndex);
      generatedSectionIds.push(sectionId);
      sectionIdSet.add(sectionId);

      if (!isNonEmptyString(section?.legalText)) errors.push(`${sectionPath}: missing legalText.`);
      if (!Array.isArray(section?.qas)) {
        errors.push(`${sectionPath}: expected a qas array.`);
        return;
      }

      section.qas.forEach((qa, qaIndex) => {
        qaCount += 1;
        const qaPath = `${sectionPath} qas[${qaIndex}]`;
        if (!isNonEmptyString(qa?.q)) errors.push(`${qaPath}: missing question text (q).`);
        if (!isNonEmptyString(qa?.a)) errors.push(`${qaPath}: missing answer text (a).`);
      });
    });
  });

  for (const duplicate of findDuplicates(generatedSectionIds)) {
    errors.push(`Code data: duplicate generated section ID "${duplicate}".`);
  }

  const treeIds = trees.map((tree) => tree?.id).filter(isNonEmptyString);
  for (const duplicate of findDuplicates(treeIds)) {
    errors.push(`treeData.json: duplicate tree ID "${duplicate}".`);
  }

  let treeNodeCount = 0;
  trees.forEach((tree, treeIndex) => {
    const treePath = `treeData.json trees[${treeIndex}]`;
    if (!isNonEmptyString(tree?.id)) {
      errors.push(`${treePath}: missing tree ID.`);
    } else if (!tree.id.startsWith('dt-')) {
      errors.push(`${treePath}: tree ID "${tree.id}" must start with "dt-".`);
    }
    if (!isNonEmptyString(tree?.title)) errors.push(`${treePath}: missing title.`);
    if (!Array.isArray(tree?.nodes) || tree.nodes.length === 0) {
      errors.push(`${treePath}: expected a non-empty nodes array.`);
      return;
    }

    treeNodeCount += tree.nodes.length;
    const nodeIds = tree.nodes.map((node) => node?.id).filter(isNonEmptyString);
    const nodeIdSet = new Set(nodeIds);

    for (const duplicate of findDuplicates(nodeIds)) {
      errors.push(`${treePath}: duplicate node ID "${duplicate}".`);
    }
    if (!nodeIdSet.has('start')) errors.push(`${treePath}: missing required "start" node.`);

    tree.nodes.forEach((node, nodeIndex) => {
      const nodePath = `${treePath} nodes[${nodeIndex}]`;
      if (!isNonEmptyString(node?.id)) errors.push(`${nodePath}: missing node ID.`);
      if (!isNonEmptyString(node?.text)) errors.push(`${nodePath}: missing text.`);

      if (node?.type === 'question') {
        if (!Array.isArray(node.options) || node.options.length === 0) {
          errors.push(`${nodePath}: question node must have options.`);
          return;
        }

        node.options.forEach((option, optionIndex) => {
          const optionPath = `${nodePath} options[${optionIndex}]`;
          if (!isNonEmptyString(option?.label)) errors.push(`${optionPath}: missing label.`);
          if (!isNonEmptyString(option?.next)) {
            errors.push(`${optionPath}: missing next node ID.`);
          } else if (!nodeIdSet.has(option.next)) {
            errors.push(`${optionPath}: target node "${option.next}" does not exist in tree "${tree.id}".`);
          }
        });
      } else if (node?.type === 'result') {
        if (!ALLOWED_OUTCOMES.has(node.outcome)) {
          errors.push(`${nodePath}: unsupported outcome "${node?.outcome ?? ''}".`);
        }
      } else {
        errors.push(`${nodePath}: unsupported node type "${node?.type ?? ''}".`);
      }
    });

    for (const relatedChapter of asArray(tree.relatedChapter)) {
      if (!chapterIdSet.has(relatedChapter)) {
        errors.push(`${treePath}: relatedChapter "${relatedChapter}" does not exist.`);
      }
    }
    for (const relatedSection of asArray(tree.relatedSection)) {
      if (!sectionIdSet.has(relatedSection)) {
        errors.push(`${treePath}: relatedSection "${relatedSection}" does not exist.`);
      }
    }
  });

  const quizIds = questions.map((question) => question?.id).filter(isNonEmptyString);
  for (const duplicate of findDuplicates(quizIds)) {
    errors.push(`quizData.json: duplicate question ID "${duplicate}".`);
  }

  questions.forEach((question, questionIndex) => {
    const questionPath = `quizData.json questions[${questionIndex}]`;
    if (!isNonEmptyString(question?.id)) errors.push(`${questionPath}: missing question ID.`);
    if (!isNonEmptyString(question?.question)) errors.push(`${questionPath}: missing question text.`);
    if (!chapterIdSet.has(question?.chapterId)) {
      errors.push(`${questionPath}: chapterId "${question?.chapterId ?? ''}" does not exist.`);
    }
    if (!Array.isArray(question?.options) || question.options.length < 2) {
      errors.push(`${questionPath}: expected at least two options.`);
      return;
    }

    const optionIds = question.options.map((option) => option?.id).filter(isNonEmptyString);
    for (const duplicate of findDuplicates(optionIds)) {
      errors.push(`${questionPath}: duplicate option ID "${duplicate}".`);
    }

    question.options.forEach((option, optionIndex) => {
      const optionPath = `${questionPath} options[${optionIndex}]`;
      if (!isNonEmptyString(option?.id)) errors.push(`${optionPath}: missing option ID.`);
      if (!isNonEmptyString(option?.text)) errors.push(`${optionPath}: missing option text.`);
      if (typeof option?.isCorrect !== 'boolean') errors.push(`${optionPath}: isCorrect must be true or false.`);
    });

    const correctCount = question.options.filter((option) => option?.isCorrect === true).length;
    if (correctCount !== 1) {
      errors.push(`${questionPath}: expected exactly one correct option, found ${correctCount}.`);
    }
  });

  const transparencyDocumentIds = transparencyDocuments
    .map((document) => document?.id)
    .filter(isNonEmptyString);
  for (const duplicate of findDuplicates(transparencyDocumentIds)) {
    errors.push(`Transparency data: duplicate document ID "${duplicate}".`);
  }

  let transparencyUnitCount = 0;
  let transparencySectionCount = 0;
  let transparencyQaCount = 0;

  transparencyDocuments.forEach((document, documentIndex) => {
    const documentPath = `Transparency data documents[${documentIndex}]`;
    if (!isNonEmptyString(document?.id)) errors.push(`${documentPath}: missing document ID.`);
    if (!isNonEmptyString(document?.title)) errors.push(`${documentPath}: missing title.`);
    if (!isNonEmptyString(document?.icon)) {
      errors.push(`${documentPath}: missing icon.`);
    } else if (!registeredIconNames.has(document.icon)) {
      errors.push(`${documentPath}: icon "${document.icon}" is not registered in AppIcons.jsx.`);
    }
    if (!Array.isArray(document?.units) || document.units.length === 0) {
      errors.push(`${documentPath}: expected a non-empty units array.`);
      return;
    }

    const resourceIds = (Array.isArray(document.resources) ? document.resources : [])
      .map((resource) => resource?.id)
      .filter(isNonEmptyString);
    for (const duplicate of findDuplicates(resourceIds)) {
      errors.push(`${documentPath}: duplicate resource ID "${duplicate}".`);
    }
    const resourceIdSet = new Set(resourceIds);

    const unitIds = document.units.map((unit) => unit?.id).filter(isNonEmptyString);
    for (const duplicate of findDuplicates(unitIds)) {
      errors.push(`${documentPath}: duplicate unit ID "${duplicate}".`);
    }
    if (Array.isArray(document.unitIds)) {
      if (
        document.unitIds.length !== unitIds.length
        || document.unitIds.some((unitId, index) => unitId !== unitIds[index])
      ) {
        errors.push(`${documentPath}: unitIds must exactly match the loaded unit order.`);
      }
    }

    const generatedSectionIds = [];
    let declarationTemplateLinks = 0;

    document.units.forEach((unit, unitIndex) => {
      transparencyUnitCount += 1;
      const unitPath = `${documentPath} units[${unitIndex}]`;

      if (!isNonEmptyString(unit?.id)) {
        errors.push(`${unitPath}: missing unit ID.`);
      } else {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(unit.id)) {
          errors.push(`${unitPath}: unit ID "${unit.id}" is not route-safe.`);
        }
        if (document.id === 'disclosure-guidelines' && !unit.id.startsWith('dg-')) {
          errors.push(`${unitPath}: Disclosure Guidelines unit ID "${unit.id}" must start with "dg-".`);
        }
      }
      if (unit?.documentId !== document.id) {
        errors.push(`${unitPath}: documentId must be "${document.id}".`);
      }
      if (!isNonEmptyString(unit?.title)) errors.push(`${unitPath}: missing title.`);
      if (!isNonEmptyString(unit?.icon)) {
        errors.push(`${unitPath}: missing icon.`);
      } else if (!/^\d+$/.test(unit.icon) && !registeredIconNames.has(unit.icon)) {
        errors.push(`${unitPath}: icon "${unit.icon}" is not registered in AppIcons.jsx.`);
      }
      if (
        !Array.isArray(unit?.sourcePages)
        || unit.sourcePages.length === 0
        || unit.sourcePages.some((page) => !Number.isInteger(page) || page < 1)
      ) {
        errors.push(`${unitPath}: sourcePages must contain positive page numbers.`);
      }
      if (!Array.isArray(unit?.sections) || unit.sections.length === 0) {
        errors.push(`${unitPath}: expected a non-empty sections array.`);
        return;
      }

      unit.sections.forEach((section, sectionIndex) => {
        transparencySectionCount += 1;
        const sectionPath = `${unitPath} sections[${sectionIndex}]`;
        generatedSectionIds.push(generateSectionId(unit.id, section?.title, sectionIndex));

        if (typeof section?.title !== 'string') {
          errors.push(`${sectionPath}: title must be a string (empty is allowed).`);
        }
        if (!isNonEmptyString(section?.legalText)) errors.push(`${sectionPath}: missing legalText.`);
        if (
          !Array.isArray(section?.sourcePages)
          || section.sourcePages.length === 0
          || section.sourcePages.some((page) => !Number.isInteger(page) || page < 1)
        ) {
          errors.push(`${sectionPath}: sourcePages must contain positive page numbers.`);
        }
        if (!Array.isArray(section?.qas)) {
          errors.push(`${sectionPath}: expected a qas array.`);
          return;
        }

        const resourceMatches = String(section.legalText || '')
          .matchAll(/href=(["'])resource:([a-z0-9-]+)\1/gi);
        for (const match of resourceMatches) {
          const resourceId = match[2];
          if (!resourceIdSet.has(resourceId)) {
            errors.push(`${sectionPath}: resource "${resourceId}" is not declared by the document.`);
          }
          if (resourceId === 'declaration-csv-template') declarationTemplateLinks += 1;
        }

        section.qas.forEach((qa, qaIndex) => {
          transparencyQaCount += 1;
          const qaPath = `${sectionPath} qas[${qaIndex}]`;
          if (!isNonEmptyString(qa?.q)) errors.push(`${qaPath}: missing question text (q).`);
          if (!isNonEmptyString(qa?.a)) errors.push(`${qaPath}: missing answer text (a).`);
          if (
            !Array.isArray(qa?.sourcePages)
            || qa.sourcePages.length === 0
            || qa.sourcePages.some((page) => !Number.isInteger(page) || page < 1)
          ) {
            errors.push(`${qaPath}: sourcePages must contain positive page numbers.`);
          }
          if (document.id === 'disclosure-guidelines') {
            if (!/^Q&A \d+$/.test(qa?.label || '')) {
              errors.push(`${qaPath}: label must use the exact "Q&A N" format.`);
            }
            if (!/^Q:/.test(qa?.q || '')) {
              errors.push(`${qaPath}: question text must retain its leading "Q:".`);
            }
            if (/^A:/.test(qa?.a || '')) {
              errors.push(`${qaPath}: answer text must omit "A:" because the renderer supplies it.`);
            }
          }
        });
      });
    });

    for (const duplicate of findDuplicates(generatedSectionIds)) {
      errors.push(`${documentPath}: duplicate generated section ID "${duplicate}".`);
    }

    if (document.id === 'disclosure-guidelines') {
      if (!resourceIdSet.has('declaration-csv-template')) {
        errors.push(`${documentPath}: missing declaration-csv-template resource.`);
      }
      if (declarationTemplateLinks !== 1) {
        errors.push(
          `${documentPath}: expected exactly one local declaration-csv-template link, found ${declarationTemplateLinks}.`,
        );
      }
      const serialized = JSON.stringify(document.units);
      if (/ethicalmedtech\.eu\/wp-content\/uploads/i.test(serialized)) {
        errors.push(`${documentPath}: Annex I must not retain the external template URL.`);
      }
    }
  });

  return {
    errors,
    stats: {
      chapters: chapters.length,
      sections: sectionCount,
      qas: qaCount,
      trees: trees.length,
      treeNodes: treeNodeCount,
      quizQuestions: questions.length,
      transparencyDocuments: transparencyDocuments.length,
      transparencyUnits: transparencyUnitCount,
      transparencySections: transparencySectionCount,
      transparencyQas: transparencyQaCount,
    },
  };
}

function readJson(relativePath) {
  const absolutePath = resolve(PROJECT_ROOT, relativePath);
  return JSON.parse(readFileSync(absolutePath, 'utf8'));
}

export function validateCurrentProject() {
  const codeData = loadSplitCodeData(PROJECT_ROOT);
  const result = validateProjectData({
    codeData,
    treeData: readJson('src/data/treeData.json'),
    quizData: readJson('src/data/quizData.json'),
    transparencyData: loadTransparencyData(PROJECT_ROOT),
    iconSource: readFileSync(resolve(PROJECT_ROOT, 'src/components/AppIcons.jsx'), 'utf8'),
  });
  result.errors.push(...validateEventSupportData(readJson('src/data/eventSupportRules.json'), codeData.chapters));
  return result;
}

function printReport({ errors, stats }) {
  if (errors.length > 0) {
    console.error(`Data validation failed with ${errors.length} error${errors.length === 1 ? '' : 's'}:`);
    errors.forEach((error) => console.error(`- ${error}`));
    return;
  }

  console.log('Data validation passed.');
  console.log(`${stats.chapters} chapters, ${stats.sections} sections, ${stats.qas} Q&As`);
  console.log(`${stats.trees} decision trees, ${stats.treeNodes} nodes`);
  console.log(`${stats.quizQuestions} quiz questions`);
  console.log(
    `${stats.transparencyDocuments} Transparency document, `
    + `${stats.transparencyUnits} reader units, `
    + `${stats.transparencySections} sections, `
    + `${stats.transparencyQas} Q&As`,
  );
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  try {
    const result = validateCurrentProject();
    printReport(result);
    if (result.errors.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error(`Data validation could not run: ${error.message}`);
    process.exitCode = 1;
  }
}
