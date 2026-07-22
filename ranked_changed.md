# Current Maintenance Backlog

Last reviewed: 2026-07-22

This file records the current maintenance position of The Code App. It replaces the earlier speculative backlog, which mixed verified issues with optional product ideas and led to incorrect assumptions about working features.

## Current Baseline

- React 19 and Vite 6 application with four active sections: The Code, Decision Trees, Knowledge Quiz, and TPPT Checker.
- Content source of truth: `src/data/code/*.json`, `src/data/treeData.json`, and `src/data/quizData.json`.
- Current content: 23 chapters, 67 sections, 43 Q&As, 8 decision trees with 116 nodes, and 60 quiz questions.
- Recent History intentionally stores the last five visited Code chapters in browser `localStorage`.
- Bookmarks currently apply to Code sections and are stored in browser `localStorage`.
- Readable browser-history routes cover chapters and decision trees, while generated section IDs remain as exact anchors for section links. Existing root-hash links remain supported, and there is no known duplicate-ID or route-collision problem.

## Implemented Maintenance Guardrails

- `npm run validate:data` checks structural integrity of Code, tree, and quiz data without changing files.
- `npm test` runs focused tests for route compatibility, TPPT rules, parser behavior, stable section IDs, and validator behavior.
- `npm run check` runs validation, tests, TypeScript checks, and a production build.
- `PROJECT_CHECKS.md` explains these commands and their output for non-technical maintainers.

## Active Priorities

### 1. Keep Documentation And Public Version History Current

Update documentation only after checking claims against source code, project configuration, package metadata, Git history, and actual behavior where necessary. Do not expose administration or infrastructure details in the public in-app Version History.

### 2. Maintain Content Accuracy

Continue source-by-source comparison when the underlying MedTech Europe Code changes. The audit in `src/data/verified_issue_list.md` documents the latest completed content comparison. Structural validation complements editorial review but does not replace it.

### 3. Add Tests Only Where They Protect Stable Business Rules

Extend tests when changing TPPT thresholds, parser behavior, data relationships, or section-ID generation. Avoid broad snapshots and test infrastructure that costs more to maintain than the behavior it protects.

### 4. Make Local Accessibility Improvements

Prefer explicit labels, semantic controls, and keyboard access in existing workflows. Keep changes local and verify that mouse, keyboard, mobile, and print behavior remain intact.

## Changes Requiring Evidence Before Implementation

- Indexed search should be considered only if the current search becomes measurably slow or inadequate.
- New profile filters, checklists, exports, or cross-links require a concrete user need and maintained content model.
- Component splitting should happen only when a file is being changed and extraction clearly reduces risk or duplication.

## Deliberately Deferred Structural Changes

The current project scale does not justify adding a routing library, global state management, accounts or cloud synchronization, a full TypeScript migration, a backend content API, or an AI assistant. Reconsider only if a future requirement offers a major gain that cannot be achieved within the existing architecture.

## Verification Commands

Run from the project root:

```powershell
npm run validate:data
npm test
npm run lint
npm run build
```

See `PROJECT_CHECKS.md` for detailed instructions and troubleshooting.
