import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateSectionId } from '../src/utils/textUtils.js';
import { loadSplitCodeData } from '../scripts/lib/code-content.mjs';
import {
  buildChapterPath,
  buildCodeSectionPath,
  buildQuizPath,
  buildTreePath,
  createRouteUtils,
} from '../src/utils/routeUtils.js';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDirectory, '..');
const codeData = loadSplitCodeData(projectRoot);
const treeData = JSON.parse(readFileSync(resolve(projectRoot, 'src/data/treeData.json'), 'utf8'));
const FULL_CODE_DATA = codeData.chapters;
const TREE_DATA = treeData.trees;
const { parseAppLocation } = createRouteUtils(FULL_CODE_DATA, TREE_DATA);

test('parses the canonical top-level routes', () => {
  assert.deepEqual(parseAppLocation('/', ''), {
    activeSection: null,
    activeId: 'home',
    anchor: null,
    canonicalUrl: '/',
  });
  assert.equal(parseAppLocation('/code', '').activeId, 'home');
  assert.equal(parseAppLocation('/trees', '').activeId, 'trees-home');
  assert.equal(parseAppLocation('/quiz', '').activeSection, 'quiz');
  assert.equal(parseAppLocation('/tppt', '').activeSection, 'tppt');
});

test('round-trips every live chapter route', () => {
  for (const chapter of FULL_CODE_DATA) {
    const path = buildChapterPath(chapter.id);
    const parsed = parseAppLocation(path, '');
    assert.equal(parsed.activeSection, 'code');
    assert.equal(parsed.activeId, chapter.id);
    assert.equal(parsed.canonicalUrl, path);
  }
});

test('round-trips every live section link without changing its anchor ID', () => {
  const urls = new Set();

  for (const chapter of FULL_CODE_DATA) {
    chapter.sections.forEach((section, index) => {
      const sectionId = generateSectionId(chapter.id, section.title, index);
      const url = buildCodeSectionPath(chapter.id, sectionId);
      const parsed = parseAppLocation(buildChapterPath(chapter.id), `#${sectionId}`);

      assert.equal(parsed.activeId, chapter.id);
      assert.equal(parsed.anchor, sectionId);
      assert.equal(parsed.canonicalUrl, url);
      assert.equal(urls.has(url), false, `Duplicate section URL: ${url}`);
      urls.add(url);
    });
  }
});

test('accepts and canonicalizes legacy chapter and section hashes', () => {
  assert.equal(parseAppLocation('/', '#ch1').canonicalUrl, '/code/ch1');
  assert.equal(
    parseAppLocation('/', '#ch1-2-event-location-and-venue').canonicalUrl,
    '/code/ch1#ch1-2-event-location-and-venue',
  );
});

test('accepts and canonicalizes legacy top-level tool hashes', () => {
  assert.equal(parseAppLocation('/', '#quiz').canonicalUrl, '/quiz');
  assert.equal(parseAppLocation('/', '#tppt').canonicalUrl, '/tppt');
});

test('round-trips every live decision-tree route and its legacy hash', () => {
  for (const tree of TREE_DATA) {
    const path = buildTreePath(tree.id);
    assert.equal(parseAppLocation(path, '').activeId, tree.id);
    assert.equal(parseAppLocation('/', `#${tree.id}`).canonicalUrl, path);
  }
});

test('keeps existing shared Quiz hashes on the Quiz path', () => {
  const hash = '#quiz?q=q1,q2,q3';
  assert.equal(buildQuizPath(hash), `/quiz${hash}`);
  assert.equal(parseAppLocation('/', hash).canonicalUrl, `/quiz${hash}`);
  assert.equal(parseAppLocation('/quiz', hash).canonicalUrl, `/quiz${hash}`);
});

test('falls back safely for unknown paths and malformed URL encoding', () => {
  assert.equal(parseAppLocation('/not-a-route', '').canonicalUrl, '/');
  assert.equal(parseAppLocation('/code/%E0%A4%A', '').canonicalUrl, '/');
});
