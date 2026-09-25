# Phrasebook expansion review

Implemented on `codex/expand-search-phrasebook`, based on `claude/laughing-brown-2p8s59` at **56b5f0ef982f413a10fd85d0c1c76b3070cad84a**. The implementation lives in an isolated managed worktree. The original checkout and its local edits were preserved. No canonical publication text, PDF, Word file, CSV, scoring constant, or search-result interface was changed.

## Outcome

The dictionary grew from **86 groups / 428 distinct phrases** to **208 groups / 697 distinct phrases**. The final dictionary has 5 two-way groups and 203 directional groups, with 518 distinct source phrases. Group growth includes splitting overly broad old groups; 96 new proposal groups were accepted after review. There was no growth quota.

The expansion covers documentation, approvals, diligence, monitoring, procurement, hardship, running costs, valuation, noncash support, research, intellectual property, complaints, confidentiality, practical training, equipment ownership/resale, and Disclosure periods, timing, aggregation, itemisation, affiliates, corrections, consent, currency, tax, and retention. Existing automatic morphology, abbreviation and glossary handling was retained.

| Frozen query measure | Original engine | Fixes only | Expanded phrasebook |
|---|---:|---:|---:|
| Code top-three direct answers | 64/77 | 64/77 | **75/77** |
| Disclosure top-three direct answers | 24/34 | 24/34 | **32/34** |
| Combined | 88/111 | 88/111 | **107/111** |
| Retained baseline queries | 19/21 | 19/21 | **21/21** |
| Authoritative self-retrieval | 174/174 | 174/174 | **174/174** |
| New-phrase acceptance queries | 162/240 | 162/240 | **240/240** |

No query with a baseline top-three answer lost that answer from the first three results in the frozen 111-query set. The new-phrase acceptance set exercises every one of the 215 newly authored source spellings, with 240 scope/query runs against selected direct answer passages. All 518 runtime source phrases were additionally exercised in both scopes: 1,036 trigger runs. The 278 zero-result trigger runs are reported, principally where the other publication has no corresponding topic; they were not silently discarded.

Concrete gains include `background check` finding Third Party Intermediaries first, `paper trail` finding documentation/records without payer/train correction, `financial distress` finding Financial Hardship, `practical workshop` finding Annex VII, `publication deadline` finding Time of Disclosure, and `payment breakdown` finding the itemised-disclosure provision. `bribe` now expands to bribery/corruption/improper advantage rather than broadly expanding to all inducements.

## Top-five relevance and the shorter-list trade-off

A separate reviewer judged actual passages in the union of the three stages' top-five results for all 21 retained queries. Exclusions count as relevant when they answer the query; headings alone do not decide relevance.

| Mean per-query relevance among returned top-five results | Original | Expanded |
|---|---:|---:|
| Code (18 queries) | 84.44% | **87.50%** |
| Disclosure (3 queries) | 85.00% | **85.00%** |

For transparency, conventional fixed-five-slot precision is also preserved in the data: Code **67.78% → 65.56%**, Disclosure **66.67% → 66.67%**. The Code decrease is the two fewer relevant results for `pen`: the refined search returns one directly relevant stationery Q&A instead of assuming that every pen is a promotional item. Its returned-result precision improves from 3/5 to 1/1. No false category relationship or result-count/scoring change was added to fill empty slots. Thus returned-result relevance meets the no-regression aim, but a strict requirement that fixed-five-slot precision also never decrease is **not met**. This trade-off is explicit, not a weakened automated threshold.

Only the retained set has exhaustive top-five relevance judgments. The larger coverage and acceptance sets measure specified answer retrieval, not complete ranking precision.

## Source coverage and two review passes

The September 2024 [Code PDF](<../../src/data/code-september-2024 (1).pdf>) is the authority; its PDF-derived [Word copy](../../src/data/code-september-2024.docx) is a reading aid. The October 2025 [Disclosure Guidelines PDF](../../src/data/mte-code_disclosure_guidelines.pdf) was reviewed separately. The pinned runtime JSON supplies indexed passages; references do not conflate the two editions.

The [coverage register](coverage.json) contains **29 publication units, 83 sections, 54 Q&As, 38 glossary definitions, 38 table rows, 14 footnotes, and 11 CSV fields**: 238 records and 713 concept/query entries. It includes substantive clause concepts within section records, exact JSON pointers, source page evidence, queries, original/current retrieval, proposed bridges, and final dispositions. Code PDF page references are verified unit ranges, not fabricated pinpoint page claims; Disclosure references use the source-page metadata.

All 86 original groups have outcomes in [existing-audit-final.json](existing-audit-final.json): 19 kept, 66 refined, 1 removed. [editorial-decisions.json](editorial-decisions.json) records all 104 new proposals, final groups, acceptance evidence and the integrator's decisions on independent-review objections. The first 100 proposals received a separate semantic review; the final four source-pass additions were reviewed by the integrator. Sol workers handled engineering and source review; Luna handled inventories and passage-level relevance judgments; Astra owned final semantic decisions and integration.

The second full source pass has no pending entries. Its final dispositions are **583 already covered, 100 indexed retrieval gaps, 16 indexing limitations, 9 unsafe associations, and 5 refine/remove**. Direct-answer top-three success on the 698 queries with an indexed target increased from **570 to 594**. Some successful hits remain labelled unsafe/refine because finding a passage does not make an equivalence valid. No remaining miss was assumed to justify a new synonym; see [coverage notes](coverage-notes.md).

[family-review.json](family-review.json) records 96 context/contrast runs across 14 vocabulary families and both scopes. It preserves distinctions including approval/notification, aggregate/itemised, reporting/publication year, faculty/attendee, hybrid/virtual, free/in-kind, demonstration activity/product, loan/evaluation, and remediation/sanction.

## Engine and tooling changes

- Overlapping rules keep the highest expansion weight; stable rule and display ordering removes dependence on group order.
- Validation rejects duplicate sources after corpus-independent token normalization, including hyphen/space forms and duplicates across `same` and `from`. Stopword-only phrases are rejected.
- A word found only inside a multiword entry no longer suppresses standalone completion. Whole-phrase recognition and typo handling remain intact.
- Vocabulary-dependent stem collisions are reported independently for each scope. Final diagnostic: Code `sponsor`/`sponsoring` with compatible targets; Disclosure none.
- `search:report` supports optional `--queries file.json` and `--json`, retaining its default text behavior. Output includes concepts, weights, top results, unmatched terms, collisions, self-retrieval and timings.

BM25F constants, field weights, coverage/proximity calculation, longest-phrase matching, glossary priority, Q&A lookup, cutoff, limits, runtime phrasebook schema and application result interface are unchanged. Lower directional weights still do not guarantee literal-first ranking. See the updated [maintenance guide](../../src/data/search/README.md).

## Resolved regressions and rejected associations

Broad `procurement` expansion introduced a glossary link to Healthcare Professionals and displaced tender passages; the competitive-bidding bridge now uses purchasing arrangements. A broad public-access phrase displaced the intended platform passage and was removed. Redundant hands-on-training phrase recognition displaced independent-word matches, so that source was omitted. Amicable settlement was narrowed to mutual settlement/amicable solution. All frozen top-three regressions were resolved through vocabulary, not scoring changes.

The audit removed/refined hybrid→virtual, demonstration activity→demonstration product, all free supply→in-kind, sponsorship→grant, loaner→evaluation product, corrective action→sanction, and stationery→promotional item assumptions. Rejected candidate proposals include spending breakdown→budget breakdown, study grant→research grant, generic emergency relief→disaster, and extra disclosures→bare disclosure. Exact publication-specific targets proposed for employee time and grant purpose were rejected; the accepted purpose/object bridge is general English.

## Remaining limitations

- The frozen set still misses a top-three direct answer for `waive speaker fee`, `money not used correctly`, `extra disclosures`, and `reporting spreadsheet`.
- One hundred detailed source queries still miss their direct passage in the top three. Many find a related focused passage; they remain explicit gaps, not claims of universal everyday-query coverage.
- CSV field names are absent from the reader index. The 11 fields, the template-fields query and four whole-glossary overview queries account for 16 indexing limitations. Definitions themselves remain searchable.
- Existing glossary inference can connect a word in a punctuation-separated exclusion (notably hybrid/virtual); morphology and typo handling can also add irrelevant matches. Broad terms can shift document frequency and ranking. These are recorded in [the maintenance backlog](../../ranked_changed.md), without publication-specific engine exceptions.
- Fixed-five-slot precision falls for the narrower `pen` result as explained above. Retained top-three and returned top-five relevance improve.
- The pre-existing production offline-bundle issue remains outside this implementation. No deployment was performed.

## Verification and performance

Final **`npm run validate:data`, `npm test`, and `npm run check` pass**, including **198/198 tests**, TypeScript checks, production build, pinned Disclosure source verification, and byte-exact/precache verification of the emitted PDF/CSV. Existing thresholds were not weakened. Synthetic tests cover order independence, normalized collisions, completion, directionality, whole phrases, small words, quotes, abbreviations and glossary chaining. A pre-existing source-inspection test was made CRLF-tolerant without changing its assertions.

Windows initially checked out pinned Disclosure JSON/CSV with CRLF; their exact Git blob bytes were restored in this fresh worktree so source verification could pass. They have no Git content diff. Canonical Code/Disclosure data, PDF, DOCX and CSV content remain unchanged.

[Browser verification](browser-checks.md) confirmed both scopes, explanation text, snippet/reader highlights, keyboard focus/activation, Q&A deep links, and glossary-dialog dismissal. No console errors were captured. No UI markup or print styles changed; a print export was not exercised.

Repeated local measurements rotate stage order, discard three warmup rounds and use nine measured builds and 999 measured queries per stage:

| Timing | Original | Fixes only | Expanded |
|---|---:|---:|---:|
| Both-index build median (ms) | 16.277 | 17.274 | 16.962 |
| Both-index build p95 (ms) | 18.664 | 19.151 | 19.785 |
| Query median (ms) | 0.084 | 0.080 | 0.045 |
| Query p95 (ms) | 0.645 | 0.600 | 0.220 |

These are local comparative observations, not guaranteed production latencies or new CI thresholds. See [timings.json](timings.json).

## Reproducing the review

The review scripts load original modules and canonical sources directly from the pinned Git revision. Keep that revision available locally. The source-specific records are intentionally outside permanent content-independent tests.

```powershell
node docs/search-review/evaluate.mjs
node docs/search-review/acceptance.mjs
node docs/search-review/measure-coverage.mjs
node docs/search-review/finalize-coverage.mjs
node docs/search-review/family-review.mjs
node docs/search-review/benchmark.mjs
```

`queries.json` and `baseline.json` are the frozen 111-query record. `retained-relevance.json` contains independent passage judgments. `evaluation.json`, `acceptance.json`, `trigger-audit.json`, `coverage-retrieval.json`, `family-review.json` and `timings.json` contain measured outputs. Rejudge new top-five result IDs before interpreting relevance after another vocabulary change.

`curated-base.json` and `integrate.mjs` preserve this integration's editorial recipe. Running `integrate.mjs` overwrites the runtime phrasebook and proposal file; it is not the normal maintenance workflow. Edit the runtime phrasebook directly for later maintenance, and update review evidence deliberately. Independent-review files retain their earlier snapshot metadata; `editorial-decisions.json` is the final integrator disposition.

Final runtime SHA-256: `e2f569ae726fd9be91df244b31ea0b65fa9c65ce554b205c808f52b92971c69e`.
