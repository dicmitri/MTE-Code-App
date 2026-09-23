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

## Audit Findings — 2026-08-08

Found by an automated repo audit (read-only pass: `npm install`, `npm run lint`, `npm test`, `npm run validate:data`, `npm run build`, `npm run verify:disclosure-guidelines`, `npm run verify:production-disclosure-assets`, `npm audit`, plus manual inspection). All checks above passed cleanly at the time of the audit; nothing here indicates a currently-broken build. Items are grouped by how safe they are to act on, not by importance. None of these were implemented — evaluate and fold in the ones that make sense the next time related files are touched, per the "component splitting... only when a file is being changed" principle above.

### Low engineering risk (small, localized, no logic change) — still verify before shipping to production
- Delete `temp_ch10.json`, `temp_ch4.json`, `temp_ch8.json`, `temp_scope.json` (repo root). Leftover working files from a past content-migration session; confirmed unreferenced by any `.js`/`.mjs`/`.py` file.
- Delete `public/manifest.json`. Dead legacy PWA manifest, superseded by the `vite-plugin-pwa`-generated `manifest.webmanifest` actually linked from `index.html`. Its icon paths (`/icons/icon-192x192.svg` etc.) don't even exist, and its theme color doesn't match current branding. Confirmed unreferenced, including from `public/admin/index.html`.
- Delete `public/service-worker.js`. Pre-`vite-plugin-pwa` leftover; nothing in current app code registers it (the app registers the Workbox worker via `virtual:pwa-register` in `src/main.jsx`), yet Vite still copies it into every build as `/service-worker.js`. Confirmed no in-app references.
- Remove the `public/icons/` subfolder's three PNGs (byte-identical duplicates of `public/icon-192.png`, `public/icon-512.png`, `public/maskable-icon-512x512.png` — verified via checksum). The root-level copies are the ones wired into `vite.config.ts` and `index.html`; the subfolder copies and `public/icons.svg` (an unrelated, unreferenced social-icon sprite) appear to be dead weight.
- Remove the `"TPPT checker"` entry from `tsconfig.json`'s `exclude` array — that folder no longer exists in the repo.
- Rename `package.json`'s `"name"` from the Vite scaffold default `"react-example"` to something reflecting the project. Not coupled to `wrangler.toml`'s own `name` field.

### Needs real evaluation before touching (not drop-in fixes)
- `pdfjs-dist` has a published high-severity advisory (arbitrary JS execution on a malicious PDF). Relevant here because the TPPT Checker parses user-uploaded PDFs client-side with this library. `npm audit fix --force` upgrades to a breaking major version (6.2.108) — needs a real test pass against `src/utils/tpptExtraction.js` and the TPPT upload flow before shipping.
- `oauth-proxy.js` reflects any HTTPS `Origin` header back in `Access-Control-Allow-Origin` (CORS restricted by protocol only, not by domain). Not currently exploitable given the HMAC-signed state token and postMessage-based token delivery, but broader than necessary. Tightening it requires first enumerating every legitimate calling origin so real CMS editors aren't locked out.
- `tsconfig.json` has no `strict`/`noImplicitAny`. Turning on strict mode will likely surface new type errors in `TPPTContent.tsx` that need fixing — plan it as its own pass, not a quick toggle.
- Lower-priority `npm audit` findings (dompurify, vite, postcss, esbuild, nanoid, picomatch) are mostly dev-tooling-only exposure, not shipped to end users; revisit opportunistically via `npm audit fix` (non-breaking) rather than urgently.

## Verification Commands

Run from the project root:

```powershell
npm run validate:data
npm test
npm run lint
npm run build
```

See `PROJECT_CHECKS.md` for detailed instructions and troubleshooting.
