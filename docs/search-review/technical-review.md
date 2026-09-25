# Technical review of search expansion

Reviewed the search engine, phrasebook validator, and report CLI changes against `56b5f0ef` on 2026-09-25. No correctness defects found in the reviewed code. No engine, validator, or CLI changes were needed during this review.

- Ranking constants and the BM25F, coverage, proximity, cutoff, and defined-term scoring paths are unchanged. The engine now sorts compiled phrasebook rules and target lists, keeps the strongest weight when multiple rules reach one target, and chooses stable display text for scope-resolved spellings.
- The completion change permits a partial word that appears only inside a multiword phrasebook source to complete. A complete phrase still takes priority, and a corrected phrase still expands. The focused tests cover these distinctions, exact phrase suggestion and highlighting, rule order, and collision reporting.
- The validator uses the search tokenizer to detect corpus-independent duplicates across spaces, hyphens, and apostrophes, and rejects sources made entirely of stopwords. Corpus-dependent stem collisions remain diagnostics rather than validation errors.
- The report CLI validates the query-file shape and scope, preserves the bare text report, and emits parseable JSON with concepts, unmatched terms, top results, timings, and collisions for each scope. The Q&A shortcut's non-finite score is serialized as the string `Infinity` so JSON remains valid.
- At the reviewed 203-group phrasebook snapshot, the Code index reports one stem collision (`sponsor`/`sponsoring`, resolved key `sponsor`); the Transparency index reports none. This is vocabulary-dependent and informational.

Verification: focused search/validator/CLI tests passed (69/69). The complete `npm run check` passed: data validation, Disclosure source verification, all 198 tests, type check, production build, and production asset verification. `git diff --check` found no whitespace errors.

The initial Windows checkout had CRLF bytes in nine pinned Disclosure JSON/CSV source files, so its first source verification failed despite no authored changes. With the parent's authorization, those nine working files were restored from exact `HEAD` Git blobs; the pinned verifier and full check then passed. Their raw working-file hashes match the Git blobs, and `git diff` is empty for them. Git may still list them as modified under this worktree's `core.autocrlf=true` setting because the working bytes are now LF; there is no source content diff.
