// Manual editorial review at a pinned publication revision; intentionally outside CI.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import * as currentEngine from '../../src/utils/searchEngine.js';

export const BASE = '56b5f0ef982f413a10fd85d0c1c76b3070cad84a';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cache = new Map();
export const readBase = p => execFileSync('git', ['show', `${BASE}:${p}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
function moduleUrl(p) {
  if (cache.has(p)) return cache.get(p);
  const source = readBase(p).replace(/(from\s+|import\s*)(['"])(\.[^'"]+)\2/g, (_m, lead, quote, relative) =>
    lead + quote + moduleUrl(path.posix.normalize(path.posix.join(path.posix.dirname(p), relative))) + quote);
  const url = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  cache.set(p, url);
  return url;
}
export const originalEngine = await import(moduleUrl('src/utils/searchEngine.js'));
const builders = await import(moduleUrl('src/utils/searchDocuments.js'));
const { CODE_CHAPTER_IDS } = await import(moduleUrl('src/data/codeOrder.js'));
const chapters = CODE_CHAPTER_IDS.map(id => JSON.parse(readBase(`src/data/code/${id}.json`)));
const pubdir = 'src/data/transparency/disclosure-guidelines/';
const publication = JSON.parse(readBase(pubdir + 'document.json'));
publication.units = ['preamble','ch1','ch2','ch3','annex1','annex2','annex3'].map(p => JSON.parse(readBase(pubdir + p + '.json')));
export const baselinePhrasebook = JSON.parse(readBase('src/data/search/phrasebook.json'));
export const currentPhrasebook = () => JSON.parse(readFileSync(path.join(ROOT, 'src/data/search/phrasebook.json'), 'utf8'));
export function makeStage(name = 'expanded', phrasebook = null) {
  const engine = name === 'original' ? originalEngine : currentEngine;
  const book = phrasebook || (name === 'expanded' ? currentPhrasebook() : baselinePhrasebook);
  const glossary = builders.buildGlossaryTerms(chapters);
  const start = performance.now();
  const indexes = {
    code: engine.createSearchIndex(builders.buildCodeSearchDocuments(chapters), { phrasebook: book, glossary, scope: 'code' }),
    transparency: engine.createSearchIndex(builders.buildTransparencySearchDocuments([publication]), { phrasebook: book, glossary, scope: 'transparency' }),
  };
  return { name, engine, indexes, buildMs: performance.now() - start };
}
export function query(stage, scope, text) { return stage.engine.runSearch(stage.indexes[scope], text); }
export function selfRetrieval(stage) {
  return Object.fromEntries(Object.entries(stage.indexes).map(([scope,index]) => {
    const docs = index.docs.filter(d => d.authoritative);
    const misses = [];
    for (const d of docs) {
      const q = d.type === 'qa' ? d.fields.title : d.type === 'definition' ? d.fields.title.replace(/\s*\([^)]*\)$/, '') : `${d.fields.context.split(/\s+/).slice(0,6).join(' ')} ${d.fields.title}`;
      if (!query(stage,scope,q).results.slice(0,3).some(h => h.id === d.id)) misses.push(d.id);
    }
    return [scope,{total:docs.length,found:docs.length-misses.length,misses}];
  }));
}
export function compactResult(response) {
  return { concepts: response.concepts, corrections: response.corrections, allTermsMatched: response.allTermsMatched,
    results: response.results.slice(0,5).map(h => ({id:h.id,score:h.score,title:h.title})), appResults: response.appResults.map(h => h.id) };
}
