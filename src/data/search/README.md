# Search phrasebook

## What this is

`phrasebook.json` is a small dictionary of everyday English words and phrases, used to help the in-app search understand what people mean. The Code search and the Disclosure Guidelines search both use it.

People searching the app often type ordinary words the publications never use — "doctor" instead of "healthcare professional", "wife" instead of "spouse", "airfare" instead of "travel". The search engine already handles plurals, spelling mistakes and abbreviations, and it automatically follows the Code's own Glossary definitions (for example, it already knows "spouses" is covered by the defined term "Guests"). What it cannot do on its own is know that a "wife" is a "spouse" in everyday English, or that a "mug" handed out at a conference is a "promotional item". That is the one job of this file: bridge everyday language to more formal or broader language. Everything after that — matching the formal word against the current text and its Glossary — is handled automatically by the engine.

Example chain: a user types "wife" → the phrasebook says that's close to "spouse" → the engine's own Glossary logic already knows "spouse" is covered by the defined term "Guests" → the search finds the relevant Code text.

## The zero-upkeep rule

**This file describes the English language, not the Code.** It must stay correct no matter what the Code or the Disclosure Guidelines say, and it must never need to be edited just because a publication was revised, restructured, or renumbered.

That means:
- It never contains chapter numbers, section numbers, Q&A numbers, annex numbers, or any other numbering or anchor.
- It never contains names or defined terms unique to these publications, such as the exact name of a specific event type, a named vetting system, or an abbreviation coined by the Code.
- It only ever contains ordinary English words and phrases — the kind you'd find in a general dictionary or a business-English glossary. Some of those ordinary words happen to also be words the publications use (for example "healthcare professional", "grant", "disclosure") — that's fine, because the word itself is still ordinary English.
- It never contains a fragment copied from one sentence just to make one search land on that sentence. "running costs" → "overheads" is English; "running costs" → "general running" (half of a phrase from one Q&A) is not. When that sentence is reworded, a copied fragment silently stops working.

If a publication adds, removes, or renames a section, Q&A, or defined term, **this file does not need to change.**

## The two kinds of entries

Every entry in `phrasebook.json` is a "group" of related phrases, and every group is one of two kinds.

### `same` — true synonyms (two-way, weight 0.8)

Use this when words are genuinely interchangeable — you could swap one for the other in a sentence and nobody would blink — or for spelling variants of one word. Searching for any of them also searches for the others.

```json
{ "same": ["breach", "violation", "infringement"] }
{ "same": ["program", "programme"] }
```

### `from` → `to` — everyday word to formal or broader word (one-way, weight 0.7, or 0.3 if the typed word is already in the text)

Use this when a word is a casual, lay, or narrower way of describing something the publications discuss in more formal or more general terms. The connection only runs one way. "doctor" points to "healthcare professional", but not the other way round, because not every healthcare professional is a doctor.

```json
{ "from": ["doctor", "surgeon", "gp"], "to": ["physician", "healthcare professional", "clinician"] }
{ "from": ["background check"], "to": ["due diligence"] }
```

The second entry does not claim that all due diligence is a background check. It only says that someone asking about a background check is asking about due diligence.

**"Your word first":** if the word someone typed already appears in more than two places in the text being searched (for a typed phrase: anywhere in the text), the phrasebook's suggestions for that word count for less (0.3 instead of 0.7). Results containing the person's own word therefore stay on top, and the phrasebook only adds extra reach. The engine does this automatically.

## What belongs in the file

- **`from` phrases are things people actually type.** "background check", "kol", "mug" — not "vetting a distributor" or "several year agreement".
- **`to` phrases (the targets) are real words or terms**, not sentence fragments (see the zero-upkeep rule).
- **Point in the right direction.** Go from the narrower or everyday word to the broader or formal one. Don't join things that are only sometimes the same: free supply is not necessarily "in kind", a gift card is not an "educational item", a hybrid event is not a wholly "virtual event", and a loaned product is not necessarily an "evaluation product".
- **Avoid bare words with another common meaning.** Words like "event", "party", "board", "member", "chair", "company", "class", "charge", "stand", "meeting", "report", "present", "fair", "cover", "bill", "match", "third", "trial" and "reception" should not be used as `from` words on their own. A phrase built around one of them, like "business class", "advisory board" or "social reception", is fine because it's specific.
- **Keep genuinely different things in separate groups**, even when they are related. For example, a free sample, a demonstration unit and loaned equipment each have their own group.

## Phrases are matched as a whole

When someone types a phrase from the file, such as "hotel room" or "at no cost", search treats it as one idea: it looks for the phrase and its targets together, rather than each word on its own. Small words count inside a phrase: "at no cost" is only used when someone types that whole phrase, and a target such as "in kind" only matches the phrase "in kind", never the word "kind" on its own.

If neither the phrase nor any of its targets appears in the publication being searched, the phrase is ignored there and its words are searched one by one, exactly as if the entry did not exist. So a phrase whose target only appears in the Disclosure Guidelines never hides results when someone searches the Code.

## What if the word isn't in the Code?

Nothing bad happens. If a target never appears in the text being searched, that part of the entry simply never matches anything there. It is not an error and does not need to be removed: the phrasebook describes English in general, and not every everyday word has a match in every publication.

Two things are still worth knowing:
- An entry only helps if at least one of its targets actually appears, so check a new entry with `search:explain` (below). A target marked "matched: no" in both publications does nothing useful.
- Every word on the typing side of an entry (a `from` or `same` phrase) counts as a known English word, so search never "corrects" it into something else. Removing a word can change that: when "bonus" was briefly missing from the file, search corrected it to "bones". Try `search:explain` on any word you remove.

## Format rules

`npm run validate:data` reports any entry that breaks these rules. The app itself skips such an entry instead of failing.

- The file is exactly `{ "groups": [ ... ] }` — nothing else at the top level.
- Each group is either `{ "same": [...] }` with **at least 2** phrases, or `{ "from": [...], "to": [...] }` with **both** lists non-empty. No group may mix the two kinds or have any other keys (no notes, no comments).
- Every phrase must be:
  - all lowercase, using only letters, spaces, hyphens and apostrophes (no digits or other punctuation)
  - 1 to 4 words long, where a hyphen counts as a space ("hands-on" is two words)
  - more than just small words ("at the" is not allowed; "at no cost" is)
  - written with no leading or trailing spaces, and not repeated within its own group
- A phrase can be a `from` phrase in only **one** group, and can belong to only **one** `same` group; a phrase in a `same` group can't also be a `from` phrase elsewhere. Phrases that differ only by a hyphen or a space count as the same phrase ("follow-up" and "follow up").
- Keep each group focused: roughly 10 phrases or fewer.

## How to add an entry

1. Think of the everyday word or phrase someone might type, and the more formal or broader word(s) it should lead to.
2. Decide which kind of group it is: interchangeable words (`same`), or everyday-to-formal (`from` → `to`).
3. Check the phrase isn't already used as a `from` or `same` phrase anywhere else in the file.
4. Add the group to `phrasebook.json`. It doesn't need to go near related entries, though grouping similar topics together makes the file easier to scan.
5. Run `npm run validate:data`.
6. Try the new phrase with `npm run search:explain`, in both publications, and check that the top results make sense.

## Testing your changes

- `npm run validate:data` checks that this file (and the app's other data files) follow the required structure.
- `npm run search:explain -- "your query"` shows how a search is interpreted: which phrasebook entries fired, what they expanded to, whether each word matched anything, and how the results were ranked. Add `--scope transparency` to search the Disclosure Guidelines instead of the Code.
- `npm run search:report` runs a built-in list of everyday searches in both publications. To use your own list, save a JSON file such as `my-queries.json`:

  ```json
  [
    { "scope": "code", "query": "doctor travel" },
    { "scope": "transparency", "query": "currency" }
  ]
  ```

  and run:

  ```powershell
  npm run search:report -- --queries .\my-queries.json --json
  ```

  Running the same list before and after an edit is the easiest way to see what the edit changed.

The review files from the September 2026 phrasebook expansion (`docs/search-review/`) were removed from the repository; they remain in Git history at commit `8069fd98`.
