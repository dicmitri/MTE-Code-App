# Search phrasebook

`phrasebook.json` bridges ordinary English to more formal or broader wording in the Code and Disclosure Guidelines. Both scopes share the dictionary but compile it against their own text. Publication text and glossary relationships remain the authority.

## The general-English contract

Keep relationships correct independently of the publications. Do not encode chapter targets, source citations, dates, permissions, thresholds, geography, or publication-specific category rules. Keep editorial evidence outside the runtime file. A loan is not necessarily an evaluation; free supply is not necessarily a grant; notification is not approval; a hybrid event is not a wholly virtual event.

Use `same` only for interchangeable meanings, such as a spelling pair:

```json
{ "same": ["program", "programme"] }
```

Use `from` → `to` for directional bridges:

```json
{ "from": ["background check"], "to": ["due diligence"] }
```

This does not make all due diligence a background check. Prefer a specific phrase when a bare word has another common meaning. Do not duplicate inflections, abbreviations, or glossary links already handled by the engine. An expansion can reach an exclusion that directly answers the query; judge the actual passage, not just its heading.

## Ranking and phrase recognition

| Mechanism | Value or behavior |
|---|---|
| `same` | Two-way, weight 0.8 |
| `from` → `to` | One-way, weight 0.7 |
| Typed wording already indexed | Directional weight 0.3 when a word is in more than two documents, or a phrase appears anywhere |
| Glossary link | Incoming weight multiplied by 0.5 |
| Fields | Title 3, body 1, context 0.6 |
| Score | BM25F; best expansion per concept; coverage squared; proximity |
| Selection | 15% relative cutoff; up to 30 authoritative results and 3 app results |

Exact glossary terms receive priority and Q&A numbers have direct lookup. Phrasebook rules do not chain into other phrasebook rules; glossary and abbreviation links can follow an expansion. Overlapping paths retain their highest weight, independent of group order.

**Lower expansion weights do not guarantee literal-first ordering.** Expansion changes document frequency and scoring. The longest source phrase consumes its words as one concept, so a broad multiword rule can suppress useful independent-word matches. Small words count inside whole phrases (`at no cost`, `in kind`). Quotes request exact wording. A word that occurs only inside a multiword source does not suppress standalone completion.

## Format and validation

Keep the existing schema: exactly `{ "groups": [...] }`, with each group either `{ "same": [...] }` (at least two phrases) or `{ "from": [...], "to": [...] }` (both nonempty). No additional keys belong in runtime data.

Phrases use lowercase ASCII letters, spaces, hyphens, and apostrophes; contain 1–4 search tokens and at least one content word; and have no leading/trailing spaces. Source phrases are unique across both group types after corpus-independent token normalization: hyphen/space/apostrophe equivalents are duplicates. Do not repeat a phrase within a group. Keep groups focused.

Run `npm run validate:data`. The validator rejects duplicate sources and stopword-only phrases. Vocabulary-dependent stemming collisions are a separate per-scope diagnostic; inspect whether colliding rules express compatible meanings. Current `sponsor`/`sponsoring` sources deliberately share a compatible target.

The runtime parser is defensive against malformed data; that does not replace validation. Absent targets add no matches, but a new source can still change phrase recognition, spelling, or completion. Never assume an unmatched target is harmless.

## Reviewing an addition

1. Read the relevant source and decide whether the bridge is a reusable English relationship.
2. Check existing sources and automatic morphology, abbreviation, and glossary handling.
3. Exercise every new source, a natural contextual query, and ambiguity contrasts in both scopes. Check the explanation and the actual top passages.
4. Compare original engine, engine fixes only, and the expanded phrasebook. Preserve self-retrieval and retained-query quality without weakening thresholds.
5. Keep accepted/rejected decisions, source evidence, and source-specific answer judgments outside permanent content-independent tests.

`npm run search:explain -- "your query"` shows interpretation and ranking. `npm run search:report` retains the built-in examples. To use another list, provide a JSON array of objects containing only `scope` (`code` or `transparency`) and nonempty `query`:

```powershell
npm run search:report -- --queries ./my-queries.json --json
```

JSON output includes concepts, expansion weights, top results, unmatched terms, per-scope stem collisions, self-retrieval, and timings. Without `--json`, the report remains text.

The revision-pinned [editorial review](../../../docs/search-review/README.md) records this expansion, source coverage, acceptance queries, rejected relationships, and known limitations. It is reproducible review evidence, not a content-specific CI gate or a requirement to change the phrasebook whenever the publications change.
