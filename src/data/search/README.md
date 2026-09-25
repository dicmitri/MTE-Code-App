# Search phrasebook

## What this is

`phrasebook.json` is a small dictionary of everyday English words and phrases, used to help the in-app search understand what people mean.

People searching the app often type ordinary words the Code itself never uses — "doctor" instead of "healthcare professional", "wife" instead of "spouse", "airfare" instead of "travel". The search engine already handles plurals, spelling mistakes, abbreviations, and it automatically follows the Code's own Glossary definitions (for example, it already knows "spouses" is covered by the defined term "Guests"). What it cannot do on its own is know that "wife" and "spouse" mean roughly the same thing in everyday English, or that "wife" is a kind of "guest". That is the one job of this file: bridge everyday language to more formal or broader language. Everything after that — matching the formal word against the current Code text and its Glossary — is handled automatically by the engine.

Example chain: a user types "wife" → the phrasebook says that's close to "spouse" → the engine's own Glossary logic already knows "spouse" is covered by the defined term "Guests" → the search finds the relevant Code text.

## The zero-upkeep rule

**This file describes the English language, not the Code.** It must stay correct no matter what the Code says, and it must never need to be edited just because the Code was revised, restructured, or renumbered.

That means:
- It never contains chapter numbers, section numbers, Q&A numbers, annex numbers, or any other numbering or anchor.
- It never contains Code-specific proper names or defined terms unique to this Code, such as the exact name of a specific event type, a named vetting system, an abbreviation coined by the Code, or the organisation's own name.
- It only ever contains ordinary English words and phrases — the kind you'd find in a general dictionary or a business-English glossary. Some of those ordinary words happen to also be words the Code uses (for example "healthcare professional", "grant", "disclosure") — that's fine, because the word itself is still ordinary English, not a Code-specific label.

If a future edit to the Code adds, removes, or renames a section, Q&A, or defined term, **this file does not need to change.** Only `src/data/code/*.json`, `src/data/transparency/`, and the Glossary chapter need updating for that.

## The two kinds of entries

Every entry in `phrasebook.json` is a "group" of related phrases, and every group is one of two kinds:

### `same` — true synonyms (two-way, weight 0.8)

Use this when two or more words are genuinely interchangeable in most business-English writing — you could swap one for the other in a sentence and nobody would blink. For example: "agreement", "contract", and "arrangement", or the US/UK spelling pair "program"/"programme".

Because these are true synonyms, the connection works in both directions: searching for either word also searches for the others.

```json
{ "same": ["agreement", "contract", "arrangement"] }
```

### `from` → `to` — everyday word to formal/broader word (one-way, weight 0.7, or 0.3 if the typed word is already in the Code)

Use this when a word is a lay, casual, or narrower way of describing something the Code discusses in more formal or more general terms. The connection only runs one way, from the everyday word to the formal one — never the other way round. For example, "doctor" should point to "healthcare professional", but "healthcare professional" should not point back to "doctor", because not every healthcare professional is a doctor.

```json
{ "from": ["doctor", "surgeon", "gp"], "to": ["physician", "healthcare professional", "clinician"] }
```

**"Your word first":** if the word someone typed already appears in more than two places in the text being searched (for a typed phrase: anywhere in the text), the phrasebook's suggestions for that word count for less (0.3 instead of 0.7). Results containing the person's own word therefore stay on top, and the phrasebook only adds extra reach. You don't do anything to make this happen; the engine checks it automatically at search time.

## Format rules

`npm run validate:data` reports any entry that breaks these rules. The app itself skips such an entry instead of failing:

- The file is exactly `{ "groups": [ ... ] }` — nothing else at the top level.
- Each group is either:
  - `{ "same": [...] }` with **at least 2** phrases, or
  - `{ "from": [...], "to": [...] }` with **both** arrays non-empty.
  - No group may mix `same` with `from`/`to`, and no group may have any other keys (no notes, no comments, nothing else).
- Every phrase must be:
  - all lowercase
  - only letters, spaces, hyphens, and apostrophes (no digits, no punctuation like commas or periods)
  - 1 to 4 words long
  - written with no leading or trailing spaces
  - not repeated within its own group
- A phrase can only be a `from` phrase in **one** group across the whole file, and a phrase can only belong to **one** `same` group across the whole file (it would be confusing for the engine to be told two different things about the same word).
- Avoid `from` words that have a common, unrelated everyday meaning, since they create noisy, irrelevant matches — words like "event", "party", "board", "member", "chair", "company", "class", "charge", "stand", "meeting", "report", "present", "fair", "cover", "bill", "match", and "third" should not be used as bare `from` words (a phrase built around one of them, like "business class" or "advisory board", is fine, because it's specific rather than ambiguous).
- Keep each group focused: roughly 10 phrases or fewer. The file doesn't need to cover every possible word, only common everyday ones.
- Keep genuinely different things in separate groups, even when they are related. For example, a free sample, a demonstration unit and loaned evaluation equipment each have their own group.
- Small words count inside a phrase. A `from` phrase such as "at no cost" is only used when someone types that whole phrase: typing "cost" on its own does not trigger it. Likewise, a `to` phrase such as "in kind" only matches the phrase "in kind" in the text, never the word "kind" on its own.

## How to add an entry

1. Think of the everyday word or phrase someone might type, and the more formal or broader Code-style word(s) it should lead to.
2. Decide which kind of group it is: true two-way synonyms (`same`), or everyday-to-formal one-way (`from`/`to`).
3. Check the word isn't already used as a `from` phrase (or a `same` phrase, for a `same` group) anywhere else in the file.
4. Add a new group in `phrasebook.json`, following the format rules above. You don't need to add it near related entries — the file isn't organised by section — though grouping similar topics together does make it easier for the next person to scan.
5. Run the validator (see below) to confirm the format is correct.

You do not need to check whether your new formal word actually appears in the Code. See the next section.

## What if the word isn't in the Code?

Nothing bad happens. If a `to` word (or a `same` word) never appears anywhere in the Code text or Glossary, that entry simply never matches anything — it quietly does nothing. It is not an error, and it does not need to be removed. This is normal and expected: the phrasebook describes English in general, and not every everyday word will have a match in this particular Code.

## Testing your changes

- `npm run validate:data` checks that this file (and the app's other data files) follow the required structure. Run it after any edit to `phrasebook.json`.
- `npm run search:explain -- "your query"` shows how a specific search phrase is actually interpreted — which phrasebook entries fired, what they expanded the query to, and what matched in the Code. Use it to sanity-check a new entry against real search results.
