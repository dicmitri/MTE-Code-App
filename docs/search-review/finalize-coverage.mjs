// Apply measured, conservative editorial dispositions after measure-coverage.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { BASE } from './review-tools.mjs';

const coverageUrl = new URL('./coverage.json', import.meta.url);
const evidenceUrl = new URL('./coverage-retrieval.json', import.meta.url);
const coverage = JSON.parse(readFileSync(coverageUrl, 'utf8'));
const evidence = JSON.parse(readFileSync(evidenceUrl, 'utf8'));
if (coverage.sourceRef !== BASE || evidence.sourceRef !== BASE)
  throw new Error('Coverage and retrieval must use the same pinned source.');
const lookup = new Map(evidence.rows.map(row => [`${row.recordId}#${row.conceptIndex}`, row]));
let count = 0;
for (const record of coverage.records) for (const [index, concept] of record.concepts.entries()) {
  const row = lookup.get(`${record.id}#${index}`);
  if (!row || row.query !== concept.query) throw new Error(`Missing or stale retrieval: ${record.id}#${index}`);
  count++;
  const originalDisposition = concept.disposition;
  const rank = row.current.directAnswerRank;
  const passage = row.current.directAnswerId;
  let disposition;
  let finalReason;
  if (record.id === 'code:ch6/2' && concept.query === 'loaner') {
    disposition = 'unsafe association';
    finalReason = 'A product on loan does not by itself mean an Evaluation Product supplied for a defined post-market evaluation. The broad loaner expansion was removed; no result now appears.';
  } else if (originalDisposition === 'unsafe association' || originalDisposition === 'refine/remove') {
    disposition = originalDisposition;
    finalReason = `Source distinction retained after retrieval review; direct source rank ${rank ?? 'absent'}.`;
  } else if (originalDisposition === 'indexing limitation' || !row.target) {
    disposition = 'indexing limitation';
    finalReason = record.kind === 'csv-field'
      ? 'The CSV header is absent from the searchable reader text; phrasebook terms cannot index it.'
      : record.unitId === 'glossary'
        ? 'Individual glossary definitions are indexed, but the whole glossary section has no single search document.'
        : 'Relevant source detail is absent from the indexed reader passage.';
  } else if (rank !== null && rank <= 3) {
    disposition = 'already covered';
    finalReason = passage === row.target
      ? `The exact indexed source passage ranks ${rank} for this query.`
      : `An attached source Q&A directly addressing this section concept ranks ${rank}; the enclosing passage ranks ${row.current.rank ?? 'outside results'}.`;
  } else {
    disposition = 'retrieval gap';
    finalReason = `The direct indexed source passage ranks ${rank ?? 'outside results'}; the top result is ${row.current.top[0]?.id ?? 'none'}. A general-English equivalence has not been accepted solely from this miss.`;
  }
  concept.disposition = disposition;
  concept.finalReason = finalReason;
  concept.retrievalValidation = `original direct rank ${row.original.directAnswerRank ?? 'outside results'}; current direct rank ${rank ?? 'outside results'}`;
  concept.retrievalEvidence = {targetId: row.target, originalRank: row.original.directAnswerRank,
    currentRank: rank, currentAnswerId: passage};
}
if (count !== evidence.rows.length) throw new Error(`Concept counts differ: ${count} versus ${evidence.rows.length}`);
coverage.stage = 'Second source pass complete; all source concepts have measured original/current retrieval and an editorial disposition.';
coverage.dispositionDefinitions['already covered'] = 'The exact indexed source passage or an attached direct-answer Q&A is among the first three results for the reviewed query.';
coverage.dispositionDefinitions['retrieval gap'] = 'The source is indexed but its direct passage is below the first three results or absent; no safe general-English bridge is accepted solely on that evidence.';
coverage.dispositionDefinitions['expand'] = 'A source-grounded general-English bridge remains useful after retrieval review; it must be curated and measured before being considered covered.';
coverage.dispositionDefinitions['pending'] = 'Reserved for unreviewed concepts; zero remain in this completed register.';
coverage.counts.dispositions = Object.fromEntries([...new Set(coverage.records.flatMap(record => record.concepts.map(concept => concept.disposition)))].sort().map(key =>
  [key, coverage.records.flatMap(record => record.concepts).filter(concept => concept.disposition === key).length]));
writeFileSync(coverageUrl, JSON.stringify(coverage, null, 2) + '\n');
console.log(JSON.stringify(coverage.counts.dispositions, null, 2));
