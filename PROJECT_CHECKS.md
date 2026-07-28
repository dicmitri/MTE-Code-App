# Project Checks

This guide explains how to check The Code App after changing content or code. The checks do not publish the app. The production build step regenerates the ignored `dist/` output.

## Before You Start

Open a terminal in the app's root folder:

```text
C:\Users\dicmi\Documents\GitHub\MTE-Code-App
```

In Windows File Explorer, open that folder, click the address bar, type `powershell`, and press Enter. To confirm the location, run:

```powershell
Get-Location
```

The displayed path should end with `MTE-Code-App`.

If this is the first time the app is being used on the computer, run `npm install` once before running the checks.

## Check Content Data

Run this after changing the Code, Transparency publications, decision trees, or quiz questions:

```powershell
npm run validate:data
```

A successful result looks like this:

```text
Data validation passed.
23 chapters, 68 sections, 43 Q&As
8 decision trees, 116 nodes
60 quiz questions
1 Transparency document, 7 reader units, 19 sections, 11 Q&As
```

The totals may increase when content is intentionally added. The important line is `Data validation passed.`

The Code is stored as one chapter per file in `src/data/code/`, while standalone
Transparency publications live under `src/data/transparency/`. This command
checks that every file listed in `src/data/codeOrder.js` exists, that its chapter
ID matches its filename, and that publication, section, resource, tree, and quiz
references remain valid.

If validation fails, the output identifies the file and item involved. For example:

```text
Data validation failed with 1 error:
- treeData.json trees[0] nodes[0] options[0]: target node "missing-node" does not exist in tree "dt-example".
```

Do not make unrelated changes just to remove the message. Keep the output and ask the project developer or Codex to inspect the reported item.

## Run Focused Tests

Run this after changing app logic, especially URL navigation, the TPPT parser, eligibility rules, section IDs, or the validation script:

```powershell
npm test
```

A successful result ends with output similar to:

```text
tests 60
pass 60
fail 0
```

The number of tests may grow. The important value is `fail 0`.

The URL tests use the current project data. They confirm that every current Code chapter/section, Transparency document/unit/section, and decision tree has a working unique route, that representative section-ID generation rules remain stable, and that supported legacy link formats still resolve. If one fails after a content edit, do not rename IDs simply to make the test pass; keep the output and have the reported route reviewed.

Automated checks cannot decide whether changing a public identifier was intentional. Read [`ROUTING.md`](ROUTING.md) before changing Code chapter IDs, Transparency document or unit IDs, tree IDs, section titles, navigation behavior, or hosting rules.

## Historical Split Proof

The 2026 migration from one large Code JSON file to chapter files has a separate
preservation proof:

```powershell
npm run verify:code-migration
```

This reconstructs the deleted monolith from the chapter files and checks its
original SHA-256 hash, every raw chapter slice, every string value, chapter
order, counts, and generated section routes. It is evidence for that migration,
not the normal check after editing content.

An approved content correction will make this historical command fail because
the content is no longer identical to the 2026 baseline. That is expected. Do
not regenerate `src/data/code-manifest.json` just to make it pass. Continue to
use `npm run validate:data` for everyday edits.

## Disclosure Guidelines Source Proof

Run this after changing the Disclosure Guidelines JSON, its supplied PDF, or the
Annex I CSV template:

```powershell
npm run verify:disclosure-guidelines
```

This check pins the supplied PDF, CSV, document metadata, and every raw reader
unit. It compares the ordered visible body against PDF pages 2–15, preserves
lexical word boundaries and punctuation, and separately checks the Annex I link
boundary plus Annex II/III structure. A failure means the app can no longer prove
that its standalone publication matches the approved source. Do not rewrite,
summarize, or silently correct the source text to clear the error. If a formally
revised publication is approved, independently reconcile its PDF/CSV and reader
data, then update `source-manifest.json` and the `EXPECTED` baselines in
`scripts/verify-disclosure-guidelines.mjs` together as one reviewed change.
Never change expected values merely to make a failure pass.

If a test fails, keep the complete output from the first failing test through the final summary. Do not change the expected result unless the intended business rule has been confirmed.

## Run Every Project Check

Before a release or deployment, run:

```powershell
npm run check
```

This runs data validation, the Disclosure Guidelines source proof, focused
tests, TypeScript checks, the production build, and a final proof that the
emitted Disclosure PDF/CSV are byte-exact and listed in the service-worker
precache. It may take longer than the individual commands. A successful run
finishes with `Production Disclosure assets are byte-exact and precached.`

For an offline release check, preview the production build and load the
Disclosure Guidelines overview, original PDF, and Annex I download once. Then
enable the browser's Offline mode, refresh a nested Disclosure route, and confirm
that the reader, PDF, and CSV still load. When adding a new resource format,
also confirm its emitted asset appears in `dist/sw.js`.

## When To Run The Checks

- After editing files in `src/data`, run `npm run validate:data`.
- After editing Disclosure Guidelines data or sources, also run `npm run verify:disclosure-guidelines`.
- After changing TPPT or other tested logic, run `npm test`.
- Before a release or deployment, run `npm run check`.
- Documentation-only edits normally do not require every check, but running them is safe.

## Common Problems

### `npm` is not recognized

Node.js is not installed or is not available to the terminal. Ask the person responsible for the development environment to install the project's supported Node.js version.

### `Missing script`

The terminal is probably in the wrong folder or the local project is out of date. Run `Get-Location` and confirm that the path ends with `MTE-Code-App`.

### A package cannot be found

Run `npm install`, then repeat the original command. If the problem remains, keep the error output and ask for technical help.

### A check reports an error you do not understand

Do not delete files or rewrite content based only on the error. Share:

1. The command that was run.
2. The complete error output.
3. The file that was being edited.
4. A short description of the intended change.
