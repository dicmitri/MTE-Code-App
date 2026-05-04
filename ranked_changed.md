# Ranked Changes Backlog

This document ranks recommended changes for The Code App by implementation ease first, then impact. It is intended as a handoff for another AI or developer so they can start implementation without remapping the repository.

## Current Project Context

- App type: static-first React/Vite app for digitalizing the MedTech Europe Code of Ethical Business Practice.
- Core stack: React 19, Vite 6, Tailwind CSS 4 via `@tailwindcss/vite`, DOMPurify, lucide icons through a local registry, vite-plugin-pwa, Cloudflare Worker assets/OAuth.
- Content source of truth:
  - `src/data/codeData.json`
  - `src/data/treeData.json`
  - `src/data/quizData.json`
- Main app orchestrator: `src/App.jsx`
- Section registry: `src/config/sections.js`
- Hash routing: `src/hooks/useHashRouting.js`
- Code reader: `src/components/MainContent.jsx`, `src/components/FullTextSection.jsx`, `src/components/Sidebar.jsx`
- Decision trees: `src/components/DecisionTree.jsx`, `src/components/TreeVisualization.jsx`, `src/components/TreeContent.jsx`, `src/components/TreeLandingPage.jsx`
- Quiz: `src/components/quiz/*`
- CMS: `public/admin/config.yml`
- Cloudflare Worker: `server.js`
- OAuth proxy: `oauth-proxy.js`

Observed content scale at time of mapping:

- 23 chapters
- 66 generated section anchors
- 43 Q&As
- 8 decision trees
- 116 decision tree nodes
- 60 quiz questions

`npm run lint` currently passes.

## Existing Conventions To Preserve

- Components are React functional components with hooks.
- Component filenames use `PascalCase.jsx`.
- Hooks/utilities use `camelCase.js`.
- Content changes should be JSON-first in `src/data/*.json`.
- New top-level app sections should be registered in `src/config/sections.js`.
- Hash routes use URL fragments, for example `#ch1-...`, `#dt-...`, `#quiz`.
- Computed section IDs are generated from chapter ID plus a slugified section title. Keep generation centralized to avoid broken bookmarks and deep links.
- Use Tailwind utility classes for styling. Avoid new CSS files unless absolutely necessary.
- Use `AppIcon` from `src/components/AppIcons.jsx`. Do not import `lucide-react` directly in feature components.
- Any HTML rendered from JSON must be sanitized with DOMPurify or a trusted central sanitizer.
- Use `print:hidden` or existing print CSS patterns for interactive elements.
- Local user state currently lives in `localStorage`, not on a server.
- The project currently has TypeScript configuration but allows JS and JSX. `npm run lint` means `tsc --noEmit`, not ESLint.

## Ranking Key

- Ease: primary ranking factor.
- Impact: expected user/product value.
- Complexity: risk, number of files, need for data migration, and test effort.
- Value lens: best practices for normative-content apps such as legal/code readers, government guidance, compliance decision tools, and training portals.

## 1. Add Data Validation Scripts

Ease: Very easy  
Impact: Very high  
Complexity: Low

Add a validation script that checks content integrity before build or deploy.

Why it matters:

- This app is mostly data-driven. Broken JSON, duplicate section IDs, invalid tree links, missing icons, or quiz errors can break user trust quickly.
- Current ad hoc checks showed no broken tree/quiz references, but there is no repeatable guardrail.

Likely files affected:

- Add `scripts/validate-data.mjs`
- Update `package.json` scripts with `validate:data`
- Optionally update `README.md`
- Optionally update `public/admin/config.yml` hints after schema decisions

Checks to implement:

- `codeData.json` has a `chapters` array.
- Chapter IDs are unique.
- Generated section IDs are unique.
- Chapter `part` is one of `intro`, `part1`, `part2`, `part3`, `website`.
- Chapter icons exist in `src/components/AppIcons.jsx`, allowing numeric chapter icons if current registry supports them.
- All sections have `title` and `legalText` unless intentionally exempted.
- Q&A entries have `q` and `a`.
- `treeData.json` has a `trees` array.
- Tree IDs are unique and start with `dt-`.
- Every tree has a `start` node.
- Every `option.next` points to an existing node in the same tree.
- Result node outcomes are in the allowed outcome registry.
- Tree `relatedChapter` and `relatedSection` point to real chapter/section IDs.
- `quizData.json` is an array.
- Quiz IDs are unique.
- Each quiz question has exactly one correct option.
- Quiz `chapterId` values point to real chapters.

Dependencies:

- Can use Node built-ins only.
- If choosing schema validation, add `zod` or `ajv`, but built-in validation is enough for the first version.

Validation:

- Run `node scripts/validate-data.mjs`.
- Consider chaining it before build: `"build": "npm run validate:data && vite build"`.

## 2. Fix Cross-Section History And Bookmark Behavior

Ease: Very easy  
Impact: High  
Complexity: Low

Make recently viewed and bookmarks genuinely section-aware.

Current issue:

- `src/hooks/useRecentHistory.js` only resolves IDs against `FULL_CODE_DATA`.
- Tree and quiz history are described as section-aware in the README, but recent history will not meaningfully store tree entries.
- Bookmarks support a `section` field, but `FullTextSection` passes only Code section bookmarks. Tree bookmarking does not exist.

Likely files affected:

- `src/hooks/useRecentHistory.js`
- `src/hooks/useBookmarks.js`
- `src/components/Sidebar.jsx`
- `src/components/DecisionTree.jsx` or `src/components/TreeContent.jsx` if tree bookmarks are added
- `src/data/treeData.js`

Implementation notes:

- Create helper functions such as `resolveNavigationItem(id, section)`.
- For `section === 'code'`, resolve from `FULL_CODE_DATA`.
- For `section === 'trees'`, resolve from `TREE_DATA`.
- For `section === 'quiz'`, store a simple entry for the quiz hub rather than individual quiz questions unless needed.
- Keep `localStorage` keys backward-compatible. If migration is needed, tolerate old entries.

Validation:

- Navigate to a code chapter, tree, and quiz.
- Confirm the sidebar recent history shows all expected item types.
- Reload the app and confirm entries survive.

## 3. Add Version And Review Metadata To Normative Content

Ease: Easy  
Impact: High  
Complexity: Low to medium

Add trust metadata to chapters and/or sections.

Suggested fields:

- `sourceVersion`
- `effectiveFrom`
- `lastReviewed`
- `changeNote`
- `sourceUrl`
- `status`, for example `current`, `archived`, `draft`, `superseded`

Likely files affected:

- `src/data/codeData.json`
- `public/admin/config.yml`
- `src/components/MainContent.jsx`
- `src/components/FullTextSection.jsx`
- `src/components/LandingPage.jsx`
- `scripts/validate-data.mjs` if item 1 exists

UI notes:

- Show compact badges such as "Current", "Reviewed Apr 2026", or "Effective from 2025-01-01".
- Keep badges quiet and scannable. This is reference software, not a marketing site.
- Hide or simplify metadata in print mode if it distracts from legal text.

Dependencies:

- No new runtime dependency needed.
- Use ISO date strings in JSON.

Validation:

- Confirm metadata appears on a chapter and specific section.
- Confirm empty optional fields do not render blank labels.

## 4. Add Content Taxonomy Fields For Profiles And Topics

Ease: Easy  
Impact: High  
Complexity: Low to medium

Add structured metadata that lets the app serve different user profiles without duplicating content.

Suggested fields on chapters and sections:

- `audiences`: array, for example `["compliance", "sales", "events", "legal", "training"]`
- `topics`: array, for example `["events", "grants", "consulting", "samples", "complaints"]`
- `activityTypes`: array, for example `["third-party-event", "company-event", "grant-review"]`
- `riskLevel`: one of `low`, `medium`, `high`
- `actors`: array, for example `["HCP", "HCO", "Member Company", "PCO"]`
- `relatedObligations`: array of section IDs or stable obligation IDs

Likely files affected:

- `src/data/codeData.json`
- `src/data/treeData.json`
- `src/data/quizData.json` optionally
- `public/admin/config.yml`
- `scripts/validate-data.mjs`
- Future profile UI components

Implementation notes:

- Keep taxonomy values lowercase kebab-case.
- Start with a small controlled vocabulary to avoid drift.
- Add validation for allowed terms.
- Do not over-model in the first pass. A few arrays are enough to unlock filtering.

Value:

- Enables profile views, search filters, suggested trees, and targeted quiz modes.

## 5. Add Profile Landing Filters

Ease: Easy to medium  
Impact: Very high  
Complexity: Medium

Create profile-specific entry points for different user needs.

Suggested profiles:

- Event organizer
- Grant reviewer
- Consultant engagement owner
- Distributor or affiliate
- Complaint handler
- Training user
- Legal/compliance reviewer

Likely files affected:

- `src/config/sections.js` if adding a new top-level section
- `src/components/HubPage.jsx`
- Add `src/components/ProfileLandingPage.jsx` or similar
- `src/components/Sidebar.jsx`
- `src/App.jsx`
- `src/hooks/useHashRouting.js`
- Taxonomy fields from item 4

Implementation notes:

- Prefer filtering existing content by taxonomy rather than creating duplicate profile content.
- A profile landing page can show:
  - Key Code sections
  - Relevant decision trees
  - Suggested quiz questions
  - Saved/checklist progress if item 12 exists
- Keep route fragments simple, for example `#profile-events` or a section ID such as `profiles`.

Dependencies:

- No new dependency required.

Validation:

- Confirm each profile has useful content.
- Confirm empty profiles degrade gracefully.

## 6. Replace Substring Search With A Small Indexed Search Layer

Ease: Medium  
Impact: High  
Complexity: Medium

Current search is useful but simple. It searches Code content with substring counts and does not include decision trees.

Improve search by building a normalized local index.

Likely files affected:

- Add `src/utils/searchIndex.js`
- `src/components/Sidebar.jsx`
- `src/components/Highlight.jsx`
- `src/utils/textUtils.js`
- `src/data/codeData.js`
- `src/data/treeData.js`
- `src/data/quizData.js`

Features:

- Search across Code, Q&A, glossary, decision trees, and optionally quiz explanations.
- Weighted results: title > section title > legal text > Q&A > tree node.
- Filters by type: Code, Q&A, glossary, trees, quiz.
- Filters by taxonomy from item 4.
- Recent searches in `localStorage`.
- Saved searches in `localStorage`.

Possible dependencies:

- No dependency for a first implementation.
- Later option: `minisearch` or `flexsearch` for better ranking and stemming.

External pattern:

- EUR-Lex supports recent searches, saved searches, advanced search criteria, and alerts. A local-first version can capture much of the value without accounts.

Validation:

- Search common terms such as "event", "grant", and "consulting".
- Confirm result counts and highlighting are coherent.
- Confirm no unsafe HTML is introduced by highlighting.

## 7. Centralize Route And ID Generation

Ease: Medium  
Impact: High  
Complexity: Low to medium

Current issue:

- Section ID generation exists in `src/utils/textUtils.js`.
- Similar slug generation is duplicated in `src/hooks/useHashRouting.js`.

Likely files affected:

- `src/utils/textUtils.js`
- `src/hooks/useHashRouting.js`
- `src/App.jsx`
- `scripts/validate-data.mjs`

Implementation notes:

- Export one canonical `generateSectionId`.
- Add helpers:
  - `getChapterRoute(chapterId)`
  - `getSectionRoute(sectionId)`
  - `parseHashRoute(hash)`
  - `resolveHashTarget(hash, data)`
- Avoid mutating imported JSON in `App.jsx` if possible. Instead compute enriched data once in `src/data/codeData.js`.

Validation:

- Deep link to a chapter.
- Deep link to a section.
- Deep link to a tree.
- Deep link to quiz.
- Confirm bookmarks still work.

## 8. Replace Hash Links With Clean Deep-Linkable URLs

Ease: Medium  
Impact: High  
Complexity: Medium

Move from fragment routes such as `/#ch1-...` and `/#dt-...` to canonical browser URLs such as `/code/ch1/introduction`, `/trees/dt-ch1-event-location`, and `/quiz`.

Why it matters:

- Clean URLs are easier to share, cite, index, and understand.
- Normative-content readers often need durable links for policies, emails, training material, and formal references.
- This change also makes future profile routes, checklists, and "What's new" pages feel like first-class app areas rather than internal views.

Recommended route shape:

```text
/                         Home Hub
/code                     Code landing
/code/:chapterId          Chapter
/code/:chapterId/:sectionSlug  Exact section
/trees                    Decision tree landing
/trees/:treeId            Interactive tree
/quiz                     Quiz
/quiz/challenge/:ids      Shared quiz challenge
```

Likely files affected:

- `src/hooks/useHashRouting.js`, likely replaced by `src/hooks/useAppRouting.js`
- `src/utils/textUtils.js`, or a new `src/utils/routeUtils.js`
- `src/App.jsx`
- `src/components/Sidebar.jsx`
- `src/components/MainContent.jsx`
- `src/components/FullTextSection.jsx`
- `src/components/TreeContent.jsx`
- `src/components/TreeLandingPage.jsx`
- `src/components/quiz/QuizContent.jsx`
- `src/components/quiz/QuizResults.jsx`
- `src/hooks/useBookmarks.js`
- `src/hooks/useRecentHistory.js`
- `server.js`
- `vite.config.ts` if dev-server fallback behavior needs adjustment
- `scripts/validate-data.mjs` if item 1 exists

Implementation notes:

- Do this after item 7 so route generation and parsing are centralized first.
- Prefer lowercase, URL-safe slugs, for example `/code/ch1/introduction`, not `/code/ch1/Introduction`.
- Keep stable machine IDs in the route. Use `chapterId` and generated section slug so title changes can be migrated deliberately.
- Add backward compatibility for existing hash links:
  - `/#ch1-...` should resolve or redirect to the equivalent clean URL.
  - `/#dt-...` should resolve or redirect to `/trees/:treeId`.
  - `/#quiz?q=...` should resolve or redirect to `/quiz/challenge/:ids`.
- Use `history.pushState` / `replaceState` if staying router-free.
- Alternatively add `react-router-dom` if the app is expected to keep growing. This adds a dependency but reduces custom routing complexity.
- Update copy-link and citation utilities so new links are canonical.
- Update Cloudflare Worker fallback in `server.js` so deep routes serve `index.html`.
- Ensure PWA navigation fallback still works for deep routes and still excludes `/admin`.

Possible dependency:

- Optional: `react-router-dom`. Not required, but reasonable if more top-level sections, profiles, checklists, and nested routes are coming.

Validation:

- Directly open `/code`, `/code/ch1`, `/code/ch1/<section-slug>`, `/trees`, `/trees/<treeId>`, and `/quiz`.
- Reload each deep URL in dev, preview, and Cloudflare/Worker environment.
- Verify old hash links still work.
- Verify bookmarks, recent history, copy link, copy citation, quiz share links, and decision-tree cross-links use clean URLs.
- Verify browser Back/Forward behaves naturally.
- Verify PWA offline navigation still resolves deep URLs.

## 9. Add A Visible Changes / What's New Section

Ease: Medium  
Impact: High  
Complexity: Low to medium

Normative-content users need provenance and update awareness.

Likely files affected:

- Add `src/data/releaseData.json`
- Add `src/data/releaseData.js`
- Add `src/components/ChangesContent.jsx` or include in Hub
- `src/config/sections.js`
- `src/App.jsx`
- `src/hooks/useHashRouting.js`
- `public/admin/config.yml`

Suggested data shape:

```json
{
  "version": "2026-04-25",
  "date": "2026-04-25",
  "summary": "Updated decision tree coverage and reader utilities.",
  "items": [
    {
      "type": "content",
      "title": "Updated event guidance",
      "relatedIds": ["ch1-event-location-and-venue"]
    }
  ]
}
```

Implementation notes:

- Keep release notes structured and short.
- Link each change to affected chapter/section/tree.
- Add a "changed since last visit" badge later using `localStorage`.

Validation:

- Confirm links resolve.
- Confirm print mode either hides or formats the section cleanly.

## 10. Add Focused Tests

Ease: Medium  
Impact: High  
Complexity: Medium

The current `lint` script is TypeScript-only. Add targeted tests for the logic that protects content quality.

Likely files affected:

- `package.json`
- Add `vitest.config.js` or use Vite config
- Add `src/utils/*.test.js`
- Add `src/hooks/*.test.jsx` if testing hooks
- Add `scripts/validate-data.test.mjs` if appropriate

Suggested dependencies:

- `vitest`
- `@testing-library/react`
- `@testing-library/user-event`
- `jsdom`

Initial test targets:

- `generateSectionId`
- `highlightSearchTerm`
- `extractGlossaryMap`
- `processTextWithTerms`
- data validation script
- tree traversal validation
- quiz scoring edge cases
- hash route parsing if item 7 is implemented

Validation:

- Add scripts:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`

## 11. Add Accessibility Checks And Interaction Polish

Ease: Medium  
Impact: High  
Complexity: Medium

The app already has some ARIA and keyboard behavior. Make accessibility systematic.

Likely files affected:

- `src/components/Header.jsx`
- `src/components/Sidebar.jsx`
- `src/components/DefinitionPopup.jsx`
- `src/components/DecisionTree.jsx`
- `src/components/TreeVisualization.jsx`
- `src/components/quiz/*`
- `src/index.css`

Targets:

- Add `aria-label` to icon-only buttons.
- Ensure modals/popups manage focus and close on Escape.
- Ensure glossary terms are keyboard reachable, not only clickable spans.
- Use real buttons/links for interactive text.
- Ensure tree option buttons have clear accessible labels.
- Ensure color-coded outcomes also include text labels.
- Verify print mode does not expose hidden interactive controls.

Possible dependencies:

- For automated checks later: `axe-core` or `@axe-core/react` in dev only.

Validation:

- Keyboard-only pass through all main flows.
- Screen reader labels for major controls.
- Visual check for focus rings.

## 12. Add "Check Before You Start" Scenario Wizards

Ease: Medium  
Impact: High  
Complexity: Medium to high

Create guided eligibility/suitability flows that route users to the right normative content.

Likely files affected:

- `src/data/treeData.json` or a new `src/data/wizardData.json`
- `src/components/DecisionTree.jsx`
- Add `src/components/WizardContent.jsx` if separate from decision trees
- `src/config/sections.js`
- `src/App.jsx`
- `src/hooks/useHashRouting.js`

Implementation notes:

- The existing decision-tree engine can be reused.
- Add result pages that include:
  - Outcome
  - Reason
  - Exact Code references
  - Suggested next action
  - Related checklist or quiz
- Keep one question per screen for public-style guidance flows.

External pattern:

- GOV.UK "Check a service is suitable" asks simple questions and presents a result page explaining eligibility or next steps.

Validation:

- Confirm every result has a reference.
- Confirm "I do not know" or "Not sure" is available where valid.

## 13. Add Task-List / Checklist Experiences

Ease: Medium to hard  
Impact: High  
Complexity: Medium to high

Add local-first workflow checklists for repeat compliance tasks.

Suggested workflows:

- Review an event
- Review an educational grant
- Set up a consulting arrangement
- Review demo/evaluation product support
- Handle a complaint
- Prepare training

Likely files affected:

- Add `src/data/checklistData.json`
- Add `src/data/checklistData.js`
- Add `src/components/ChecklistContent.jsx`
- Add `src/hooks/useChecklistProgress.js`
- `src/config/sections.js`
- `src/App.jsx`
- `src/components/Sidebar.jsx`
- `public/admin/config.yml`

Data shape:

```json
{
  "id": "event-review",
  "title": "Review an event",
  "audiences": ["events", "compliance"],
  "tasks": [
    {
      "id": "check-location",
      "title": "Check event location",
      "relatedSectionIds": ["ch1-2-event-location-and-venue"],
      "relatedTreeIds": ["dt-ch1-event-location"]
    }
  ]
}
```

Implementation notes:

- Store progress in `localStorage`.
- Start with statuses: `not-started`, `in-progress`, `completed`.
- Avoid collecting sensitive business data unless a privacy model is added.

External pattern:

- GOV.UK task-list pattern is useful for multi-session, multi-task services.

Validation:

- Complete tasks, reload, confirm persistence.
- Export or clear progress only with clear user action.

## 14. Add Richer Cross-Links Between Code, Trees, Quiz, And Glossary

Ease: Medium  
Impact: Medium to high  
Complexity: Medium

The app already links some Code sections to decision trees. Expand this into a consistent relationship layer.

Likely files affected:

- `src/data/codeData.json`
- `src/data/treeData.json`
- `src/data/quizData.json`
- Add `src/data/relationshipData.json` or embed arrays in existing files
- `src/components/FullTextSection.jsx`
- `src/components/DecisionTree.jsx`
- `src/components/quiz/QuizResults.jsx`
- `scripts/validate-data.mjs`

Suggested relationship fields:

- `relatedSectionIds`
- `relatedTreeIds`
- `relatedQuestionIds`
- `relatedGlossaryTerms`
- `referenceIds`

Implementation notes:

- Result nodes in `treeData.json` should reference exact Code sections.
- Quiz explanations should link back to Code sections.
- Code sections should show relevant trees and quiz practice.

Validation:

- Validate all references.
- Confirm relationship links do not create noisy UI.

## 15. Split Large UI Files Into Smaller Components And Hooks

Ease: Medium  
Impact: Medium  
Complexity: Medium

Some files carry many responsibilities.

Best candidates:

- `src/components/Sidebar.jsx`
- `src/components/TreeVisualization.jsx`
- `src/components/MainContent.jsx`
- `src/components/Header.jsx`

Possible extraction:

- `src/components/sidebar/CollapsibleGroup.jsx`
- `src/components/sidebar/SearchBox.jsx`
- `src/components/sidebar/SearchFilters.jsx`
- `src/components/sidebar/BookmarkList.jsx`
- `src/components/sidebar/RecentHistoryList.jsx`
- `src/components/tree/TreeCanvas.jsx`
- `src/components/tree/TreeLegend.jsx`
- `src/components/tree/treeLayout.js`
- `src/hooks/useReaderSettings.js`

Implementation notes:

- Preserve behavior first. Do not redesign during extraction.
- Keep Tailwind classes close to components unless a reusable primitive emerges.
- Continue using `AppIcon`.

Validation:

- Run `npm run lint`.
- Manual smoke test sidebar, search, tree visualization, print tree.

## 16. Remove Or Quarantine Unused AI Plumbing

Ease: Medium  
Impact: Medium  
Complexity: Low

Status: Implemented. The app no longer declares `@google/genai` in `package.json`, and `vite.config.ts` no longer exposes `process.env.GEMINI_API_KEY` to the client bundle.

Original signal:

- `@google/genai` is present in `package.json`.
- `vite.config.ts` defines `process.env.GEMINI_API_KEY`.
- No obvious user-facing AI feature is currently wired.

Likely files affected:

- `package.json`
- `package-lock.json`
- `vite.config.ts`
- Future `server.js` if AI is intentionally added server-side

Options:

- Remove the dependency and env define if unused.
- Or add a clear `docs/ai-plan.md` explaining intended use and safety constraints.

Important:

- Do not expose model API keys to the client bundle.
- If AI is added, route through Cloudflare Worker or another server-side boundary and require exact citations to Code sections.

Validation:

- Run `npm install` if dependency changes.
- Run `npm run build`.

## 17. Add Export Bundles

Ease: Medium to hard  
Impact: Medium  
Complexity: Medium

Add targeted export workflows beyond browser print.

Suggested exports:

- Selected Code sections as PDF
- Profile pack PDF
- Decision path report
- Quiz result certificate
- Checklist completion report

Likely files affected:

- `src/components/FullTextSection.jsx`
- `src/components/TreeVisualization.jsx`
- `src/components/quiz/QuizResults.jsx`
- `src/index.css`
- New export utility such as `src/utils/exportUtils.js`

Implementation options:

- First pass: use print-friendly pages and `window.print()`.
- Later: add client PDF generation only if print is insufficient.

Possible dependencies:

- Avoid new dependencies for first pass.
- Later options include `jspdf` or `pdf-lib`, but they add bundle weight and layout constraints.

Validation:

- Test print/PDF output on desktop.
- Confirm confidential local notes are not included unless explicitly selected.

## 18. Add Optional Local User Notes

Ease: Medium to hard  
Impact: Medium  
Complexity: Medium

Allow users to annotate sections locally.

Likely files affected:

- Add `src/hooks/useNotes.js`
- Add `src/components/NotesPanel.jsx`
- `src/components/FullTextSection.jsx`
- `src/components/Sidebar.jsx`

Implementation notes:

- Store notes in `localStorage` by section ID.
- Add export/import JSON so users can move notes between devices.
- Do not sync notes to a server unless accounts/privacy policies are added.
- Avoid notes in default print/export output unless user opts in.

Validation:

- Add, edit, delete notes.
- Reload and confirm persistence.
- Confirm notes do not break section layout or print mode.

## 19. Consider Accounts And Team Sync Later

Ease: Hard  
Impact: Medium to high  
Complexity: High

Accounts could enable shared bookmarks, team checklists, training progress, and admin analytics, but this changes the privacy and operating model.

Likely files affected:

- `server.js`
- Cloudflare storage configuration
- New API routes
- New auth/session handling
- Hooks currently using `localStorage`
- Privacy/security documentation

Possible dependencies/services:

- Cloudflare D1, KV, or Durable Objects
- Auth provider or GitHub/enterprise SSO

Implementation notes:

- Keep current local-first model until profile/checklist/search workflows prove value.
- If implemented, provide clear export/delete controls.

Validation:

- Security review required.
- Data deletion and access-control tests required.

## 20. Add "Ask The Code" Assistant Only After Citation Infrastructure

Ease: Hard  
Impact: Potentially high  
Complexity: High

An AI assistant could be valuable, but it is risky for normative content if it answers without exact references.

Prerequisites:

- Central route/reference registry from item 7.
- Section metadata from item 3.
- Relationship links from item 13.
- Server-side AI boundary from item 15.
- Clear disclaimers and exact citation rendering.

Likely files affected:

- `server.js`
- Add API route for retrieval/answering
- Add `src/components/AskCodePanel.jsx`
- Add `src/utils/retrievalIndex.js`
- Possibly add generated content chunks from `codeData.json`

Implementation notes:

- Do not send all user history or local notes to a model by default.
- Always answer with exact Code section references.
- Prefer retrieval over free-form generation.
- Include "I do not know" behavior when sources are insufficient.

Possible dependencies:

- Server-side model SDK only.
- A small local retrieval index can be generated at build time.

Validation:

- Test hallucination resistance with known edge cases.
- Check that every answer includes source links.

## 21. Defer Large Platform Features

Ease: Hard  
Impact: Variable  
Complexity: High

These may be valuable later but are lower priority because they are heavy relative to current app maturity.

Candidates:

- Multi-language support
- Automated amendment comparison
- LMS/SCORM integration
- Admin analytics dashboards
- Formal certification workflows
- Real-time collaboration
- External API integrations for legal updates

Likely files affected:

- Broad app architecture
- Content schema
- CMS
- Worker/server
- Build/deploy pipeline

Implementation notes:

- Revisit after metadata, validation, profile filters, search, and checklist foundations are stable.
- These features often require governance, editorial process changes, and privacy/security decisions.

## Suggested First Implementation Sprint

If a future AI or developer has one short sprint, implement in this order:

1. Data validation script.
2. Route/ID centralization.
3. Clean deep-linkable URLs.
4. Cross-section recent history fix.
5. Version/review metadata fields and display.
6. Taxonomy fields and CMS updates.
7. Basic profile landing filter.

This sequence strengthens the content foundation first, then adds user-visible value without forcing a backend or account system.

## Reference Patterns Used For Product Direction

- eCFR: point-in-time views, historical versions, compare dates, print/PDF, citations, subscriptions, and developer API concepts.
- EUR-Lex: advanced search, recent searches, saved searches, saved items, and RSS alerts.
- GOV.UK Design System: step-by-step navigation, check a service is suitable, question pages, and complete multiple tasks/task lists.
