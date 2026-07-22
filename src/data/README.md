# Data

This directory serves as the source of truth for application content.

- `code/` contains one JSON file per MedTech Code chapter.
- `codeOrder.js` defines the chapter order.
- `codeData.js` assembles the chapter files behind the existing `FULL_CODE_DATA` export.
- `code-manifest.json` is the immutable evidence for the 2026 content-neutral split. Do not regenerate it after ordinary content edits.
- `code-september-2024 (1).pdf` is the supplied authoritative reference PDF.
- `treeData.json` and `quizData.json` contain decision-tree and quiz content.

After editing these JSON files, run `npm run validate:data` from the project root. See [Project Checks](../../PROJECT_CHECKS.md) for plain-language instructions and help interpreting the output.

For the split-file editing guide, preservation evidence, and known PDF differences, see [Code Content Split](../../docs/content-migration/README.md). For the wider data structure, see the [Project Map](../../AGENTS.md#project-map).
