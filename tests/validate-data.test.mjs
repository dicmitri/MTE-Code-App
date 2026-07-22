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
    iconSource: 'const lucideIconMap = { Info };',
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
