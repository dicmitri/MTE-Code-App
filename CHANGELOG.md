# Technical Changelog

All notable technical changes, architectural refactors, and feature additions to The Code App codebase are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions are internal application-release labels; they are independent of the private npm package version and are not currently represented by Git tags.

---

## [1.6.0] - 2026-07-28

### Added
- Added the Transparency hub and a registry for standalone publications.
- Integrated the October 2025 Disclosure Guidelines as seven verbatim reader units: Preamble, Chapters 1–3, and Annexes I–III.
- Bundled the Annex I declaration CSV, retained the publication's exact linked words, and added a clearly labelled non-normative in-app preview.
- Added source-fidelity verification for the PDF, CSV, reader JSON, visible text, lexical boundaries, Q&As, annex structures, runtime publication registry, and emitted offline assets.

### Changed
- Extracted the shared `DocumentReader` used by the Code and Transparency.
- Extended routing, direct links, search, bookmarks, recent history, citations, print behavior, responsive navigation, and offline precaching to Transparency publications.
- Documented the publication registry, source-replacement controls, offline resource limits, routing stability rules, and release checks.

### Fixed
- Scoped standalone-publication table defaults so they cannot override existing Tailwind-authored Code annex tables.
- Added an accessible name to the mobile navigation control.
- Cancelled stale delayed anchor scrolling/highlighting after rapid route or Back/Forward changes.
- Made whitespace-only searches empty, restored expansion state per legal collection, and revealed Q&As when selecting a Q&A-only result.
- Moved Chapter 1 Scope footnote 1 to the end of the continuous-reader section while preserving its source marker, wording, and fidelity proof.

---

## [1.5.1] - 2026-07-24

### Changed
- Expanded `README.md` with the step-by-step chapter and section maintenance guide.
- Recorded recent searches only after explicit confirmation or result selection, rather than after every pause while typing.
- Updated the reading-progress indicator through `requestAnimationFrame` and a DOM transform to avoid rerendering the full chapter on every scroll event.

### Fixed
- Prevented Code section action controls from overflowing the mobile reader.
- Hid Q&A jump controls whenever Q&A content is disabled.
- Registered all component icon names and added a regression check for silent fallback icons.
- Added clipboard failure feedback, citation-popover keyboard handling, and accessible live announcements.
- Added suggestion-dialog semantics, associated labels, focus trapping and restoration, Escape handling, and background scroll locking.
- Added an informative empty state when decision-tree filters return no matches.

---

## [1.5.0] - 2026-07-23

### Added
- **Multi-Format Citation Menu**: Popover menu in `FullTextSection.jsx` offering Formal Citation (with access date `(Accessed DD Month YYYY)` and section title), Markdown Link, and Direct URL Link.
- **Copy Plain-Text Section**: Added `[Copy Text]` button in `FullTextSection.jsx` that strips HTML markup and formats legal body text and Q&As for email/memo drafting.
- **Search Category Breakdown Pills**: Sidebar search results now display match counts broken down by `Title`, `Q&A`, and `Text` categories with tooltip counters.
- **Decision Tree Filter Search**: Added real-time keyword search bar in `TreeLandingPage.jsx` for filtering decision tree guides.
- **"Send a Suggestion" Feature**: Header toolbar button and responsive `SuggestionModal.jsx` popover providing direct `mailto:ethics@medtecheurope.org` pre-filled draft generation and clipboard copy fallback.
- **Q&A Fast-Jump Badges**: Added Q&A-count buttons next to section titles that smooth-scroll directly to guidance notes.
- **Sticky Reading Progress Line**: Added scroll percentage line across top of `MainContent.jsx`.
- **Recent Search Chips**: Added `localStorage`-backed recent search chips under the sidebar search bar.

### Changed
- Reorganized public `src/data/code/changelog.json` into `July 2026 Update 2` and `July 2026 Update 1`.
- Updated `AGENTS.md` to version v1.6 with documentation for the new utilities.

---

## [1.4.0] - 2026-07-23

### Added
- **Knowledge Quiz Module**: Configurable quiz setup (`QuizConfig.jsx`), interactive gameplay (`QuizSession.jsx`), score evaluation (`QuizResults.jsx`), and question bank (`src/data/quizData.json`).
- **TPPT Checker Tool**: Agenda ingestion engine for PDF/Word/text (`tpptParser.js`, `tpptExtraction.js`), practical & hands-on duration eligibility calculator, interactive session editor (`TPPTContent.tsx`), and assessment PDF exporter (`pdfmake`).
- **Content Verification Tooling**: Added the PDF audit, migration verification, raw JSON extraction helpers, and supporting maintainer documentation.

### Changed
- **Modular Code Content**: Split monolithic `codeData.json` into canonical single-chapter files in `src/data/code/*.json`, with explicit ordering in `codeOrder.js` and the compatibility adapter in `codeData.js`.
- **CMS and Print Workflow**: Updated the local Decap CMS editing workflow and refined print presentation while preserving existing routes and section links.

### Fixed
- **Canonical Content Reconciliation**: Reconciled PDF-backed chapters against the September 2024 source, restored identified omissions and the Annex III geographic map, and retained documented corrections to obvious source typographical errors.

---

## [1.3.0] - 2026-07-22

### Added
- **Centralized Routing Engine**: Pure URL route parser `src/utils/routeUtils.js`, content registry `src/config/routes.js`, and browser synchronization hook `src/hooks/useAppRouting.js`.
- **Data Validation & Verification Suite**: Dependency-free validator `scripts/validate-data.mjs` and Node test suite `tests/` covering route round-trips, section anchor stability, and data schema rules.
- **Developer Documentation**: Maintainer guides `ROUTING.md`, `PROJECT_CHECKS.md`, and content migration proof docs.

---

## [1.2.0] - 2026-05-24

### Added
- **Decap CMS Integration**: Administrative CMS at `/admin/` backed by Cloudflare Worker OAuth proxy (`server.js`) with HMAC CSRF state tokens.
- **Glossary System**: Automated glossary term detection (`processTextWithTerms`), interactive tooltip popovers (`DefinitionPopup.jsx`), and DOMPurify HTML sanitization.

---

## [1.1.0] - 2026-04-28

### Added
- **Multi-Section Architecture**: Home Hub landing page (`HubPage.jsx`), section registry `src/config/sections.js`, and section-aware header toolbar (`Header.jsx`).
- **Interactive Decision Trees**: Compliance step-by-step engine (`DecisionTree.jsx`), flowchart visualization (`TreeVisualization.jsx`), and cross-linking callouts.
- **User State Persistence**: `useBookmarks.js` and `useRecentHistory.js` for `localStorage` section bookmarking and last 5 visited chapter history.
- **Reader Controls & Print Engine**: Customizable reader settings panel (font size, line height, paragraph spacing) and clean `@media print` layout.

---

## [1.0.0] - 2026-04-15

### Added
- **Initial Digital Release**: Canonical digital MedTech Europe Code of Ethical Business Practice application.
- **Core Reader & Search**: Full legal text renderer (`FullTextSection.jsx`), sidebar search with mark highlighting, table of contents minimap, PWA offline caching (`vite-plugin-pwa`), and brand styling.
