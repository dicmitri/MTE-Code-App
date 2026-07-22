# Project Checks

This guide explains how to check The Code App after changing content or code. The checks do not publish the app and do not change project files.

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

Run this after changing the Code, decision trees, or quiz questions:

```powershell
npm run validate:data
```

A successful result looks like this:

```text
Data validation passed.
23 chapters, 67 sections, 43 Q&As
8 decision trees, 116 nodes
60 quiz questions
```

The totals may increase when content is intentionally added. The important line is `Data validation passed.`

The Code is stored as one chapter per file in `src/data/code/`. This command
checks that every file listed in `src/data/codeOrder.js` exists, that its chapter
ID matches its filename, and that chapter, section, tree, and quiz references
remain valid.

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
tests 16
pass 16
fail 0
```

The number of tests may grow. The important value is `fail 0`.

The URL tests use the current project data. They confirm that every current chapter, generated Code section anchor, and decision tree has a working unique route, that representative section-ID generation rules remain stable, and that supported legacy link formats still resolve. If one fails after a content edit, do not rename IDs simply to make the test pass; keep the output and have the reported route reviewed.

Automated checks cannot decide whether changing a public identifier was intentional. Read [`ROUTING.md`](ROUTING.md) before changing chapter IDs, tree IDs, section titles, navigation behavior, or hosting rules.

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

If a test fails, keep the complete output from the first failing test through the final summary. Do not change the expected result unless the intended business rule has been confirmed.

## Run Every Project Check

Before a release or deployment, run:

```powershell
npm run check
```

This runs data validation, focused tests, TypeScript checks, and the production build. It may take longer than the individual commands. A successful run finishes with a Vite build summary and no error.

## When To Run The Checks

- After editing files in `src/data`, run `npm run validate:data`.
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
