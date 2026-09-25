// Editorial source coverage measurement. Run after each phrasebook revision.
import { readFileSync, writeFileSync } from 'node:fs';
import { makeStage, query, BASE } from './review-tools.mjs';

const url = new URL('./coverage.json', import.meta.url);
const coverage = JSON.parse(readFileSync(url, 'utf8'));
if (coverage.sourceRef !== BASE) throw new Error('Coverage source revision differs from review tools.');
const original = makeStage('original');
const current = makeStage('expanded');

function parentId(record, index) {
  if (record.kind === 'csv-field' || (record.unitId === 'glossary' && record.kind === 'section')) return null;
  if (record.kind === 'definition') {
    const headword = record.source.headword.toLowerCase();
    return index.docs.find(d => d.type === 'definition' && d.fields.title.toLowerCase() === headword)?.id;
  }
  const prefix = record.scope === 'code' ? `code/${record.unitId}-` : `transparency/disclosure-guidelines/${record.unitId}-`;
  const sectionIndex = Number(record.source.jsonPointer.match(/\/sections\/(\d+)/)?.[1]);
  const provisions = index.docs.filter(d => d.type === 'provision' && d.id.startsWith(prefix));
  const provision = provisions[sectionIndex];
  if (!provision) return null;
  if (record.kind === 'qa') {
    const qaIndex = Number(record.source.jsonPointer.match(/\/qas\/(\d+)/)?.[1]);
    return `${provision.id}-qa-${qaIndex + 1}`;
  }
  return provision.id;
}

const rows = [];
for (const record of coverage.records) {
  const target = parentId(record, original.indexes[record.scope]);
  if (target && !original.indexes[record.scope].docs.some(d => d.id === target))
    throw new Error(`Could not map ${record.id} to an indexed source passage (${target}).`);
  for (const [conceptIndex, concept] of record.concepts.entries()) {
    const measure = stage => {
      const response = query(stage, record.scope, concept.query);
      const rank = response.results.findIndex(result => result.id === target);
      const answer = record.kind === 'section' || record.kind === 'footnote'
        ? response.results.findIndex(result => result.id === target || result.id.startsWith(`${target}-qa-`))
        : rank;
      return {
        rank: rank < 0 ? null : rank + 1,
        directAnswerRank: target && answer >= 0 ? answer + 1 : null,
        directAnswerId: target && answer >= 0 ? response.results[answer].id : null,
        top: response.results.slice(0, 5).map(result => ({ id: result.id, score: Number(result.score.toFixed(5)) })),
        unmatched: response.concepts.filter(term => !term.matched).map(term => term.label),
      };
    };
    rows.push({
      recordId: record.id, conceptIndex, scope: record.scope, kind: record.kind,
      source: record.source, label: concept.label, query: concept.query,
      target, original: measure(original), current: measure(current),
    });
  }
}
const summary = {};
for (const scope of ['code', 'transparency']) {
  const subset = rows.filter(row => row.scope === scope && row.target);
  summary[scope] = {
    concepts: subset.length,
    originalAt3: subset.filter(row => row.original.rank && row.original.rank <= 3).length,
    currentAt3: subset.filter(row => row.current.rank && row.current.rank <= 3).length,
    originalDirectAt3: subset.filter(row => row.original.directAnswerRank && row.original.directAnswerRank <= 3).length,
    currentDirectAt3: subset.filter(row => row.current.directAnswerRank && row.current.directAnswerRank <= 3).length,
    currentMissing: subset.filter(row => row.current.rank === null).length,
  };
}
const output = {
  sourceRef: BASE,
  note: 'A passage rank measures retrieval of the exact source record (or enclosing searchable section for table rows and footnotes). It does not by itself validate semantic relevance or justify an English equivalence. CSV fields are not indexed.',
  summary, rows,
};
writeFileSync(new URL('./coverage-retrieval.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
