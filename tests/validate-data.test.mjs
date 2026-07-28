import test from 'node:test';
import assert from 'node:assert/strict';

import { validateProjectData } from '../scripts/validate-data.mjs';

function makeValidFixture() {
  return {
    codeData: {
      chapters: [{
        id: 'intro',
        part: 'intro',
        title: 'Introduction',
        icon: 'Info',
        sections: [{
          title: 'Purpose',
          legalText: 'Reference text',
          qas: [{ q: 'A question?', a: 'An answer.' }],
        }],
      }],
    },
    treeData: {
      trees: [{
        id: 'dt-example',
        title: 'Example tree',
        relatedChapter: 'intro',
        relatedSection: 'intro-purpose',
        nodes: [
          { id: 'start', type: 'question', text: 'Continue?', options: [{ label: 'Yes', next: 'result' }] },
          { id: 'result', type: 'result', text: 'Done', outcome: 'compliant' },
        ],
      }],
    },
    quizData: [{
      id: 'q1',
      chapterId: 'intro',
      question: 'Which option is correct?',
      options: [
        { id: 'a', text: 'Correct', isCorrect: true },
        { id: 'b', text: 'Incorrect', isCorrect: false },
      ],
    }],
    transparencyData: [{
      id: 'disclosure-guidelines',
      title: 'Disclosure Guidelines',
      icon: 'Eye',
      unitIds: ['dg-preamble'],
      resources: [{
        id: 'declaration-csv-template',
        filename: 'declaration-csv-template.csv',
      }],
      units: [{
        id: 'dg-preamble',
        documentId: 'disclosure-guidelines',
        type: 'preamble',
        title: 'Preamble',
        icon: 'FileText',
        sourcePages: [2],
        sections: [{
          title: '',
          legalText: '<p>Download <a href="resource:declaration-csv-template">this link</a>.</p>',
          sourcePages: [2],
          qas: [{
            label: 'Q&A 1',
            q: 'Q: A disclosure question?',
            a: 'A disclosure answer.',
            sourcePages: [2],
          }],
        }],
      }],
    }],
    iconSource: 'const lucideIconMap = { Eye, FileText, Info };',
  };
}

test('accepts a structurally valid project fixture', () => {
  const result = validateProjectData(makeValidFixture());
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.stats, {
    chapters: 1,
    sections: 1,
    qas: 1,
    trees: 1,
    treeNodes: 2,
    quizQuestions: 1,
    transparencyDocuments: 1,
    transparencyUnits: 1,
    transparencySections: 1,
    transparencyQas: 1,
  });
});

test('reports a broken tree target with its location', () => {
  const fixture = makeValidFixture();
  fixture.treeData.trees[0].nodes[0].options[0].next = 'missing-node';

  const result = validateProjectData(fixture);
  assert.ok(result.errors.some((error) => error.includes('target node "missing-node" does not exist')));
});

test('reports quiz questions without exactly one correct option', () => {
  const fixture = makeValidFixture();
  fixture.quizData[0].options[1].isCorrect = true;

  const result = validateProjectData(fixture);
  assert.ok(result.errors.some((error) => error.includes('expected exactly one correct option, found 2')));
});

test('reports chapter icons that are not in the AppIcon registry maps', () => {
  const fixture = makeValidFixture();
  fixture.codeData.chapters[0].icon = 'UnknownIcon';

  const result = validateProjectData(fixture);
  assert.ok(result.errors.some((error) => error.includes('icon "UnknownIcon" is not registered')));
});

test('allows an untitled single-body Transparency section without duplicating its unit heading', () => {
  const fixture = makeValidFixture();
  fixture.transparencyData[0].units[0].sections[0].title = '';

  assert.deepEqual(validateProjectData(fixture).errors, []);
});

test('reports invalid Disclosure namespaces, source pages, and Q&A prefixes', () => {
  const fixture = makeValidFixture();
  const unit = fixture.transparencyData[0].units[0];
  unit.id = 'preamble';
  fixture.transparencyData[0].unitIds = ['preamble'];
  unit.sourcePages = [0, 2.5];
  unit.sections[0].qas[0].q = 'A disclosure question?';
  unit.sections[0].qas[0].a = 'A: A disclosure answer.';

  const errors = validateProjectData(fixture).errors;
  assert.ok(errors.some((error) => error.includes('must start with "dg-"')));
  assert.ok(errors.some((error) => error.includes('sourcePages must contain positive page numbers')));
  assert.ok(errors.some((error) => error.includes('retain its leading "Q:"')));
  assert.ok(errors.some((error) => error.includes('must omit "A:"')));
});

test('reports duplicate section routes and unresolved local resources', () => {
  const fixture = makeValidFixture();
  const sections = fixture.transparencyData[0].units[0].sections;
  sections[0].title = 'Repeated';
  sections.push({
    title: 'Repeated',
    legalText: '<a href="resource:not-declared">download</a>',
    sourcePages: [2],
    qas: [],
  });

  const errors = validateProjectData(fixture).errors;
  assert.ok(errors.some((error) => error.includes('duplicate generated section ID')));
  assert.ok(errors.some((error) => error.includes('resource "not-declared" is not declared')));
});
