# Technical Changelog

All notable technical changes, architectural refactors, and feature additions to The Code App codebase are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.5.0] - 2026-07-23

### Added
- **Multi-Format Citation Menu**: Popover menu in `FullTextSection.jsx` offering Formal Citation (with access date `(Accessed DD Month YYYY)` and section title), Markdown Link, and Direct URL Link.
- **Copy Plain-Text Section**: Added `[Copy Text]` button in `FullTextSection.jsx` that strips HTML markup and formats legal body text and Q&As for email/memo drafting.
- **Search Category Breakdown Pills**: Sidebar search results now display match counts broken down by `Title`, `Q&A`, and `Text` categories with tooltip counters.
- **Decision Tree Filter Search**: Added real-time keyword search bar in `TreeLandingPage.jsx` for filtering decision tree guides.
- **"Send a Suggestion" Feature**: Header toolbar button and responsive `SuggestionModal.jsx` popover providing direct `mailto:ethics@medtecheurope.org` pre-filled draft generation and clipboard copy fallback.
- **Q&A Fast-Jump Badges**: Added `💬 Q&A` badges next to section titles that smooth-scroll directly to guidance notes.
- **Sticky Reading Progress Line**: Added scroll percentage line across top of `MainContent.jsx`.
- **Recent Search Chips**: Added `localStorage`-backed recent search chips under the sidebar search bar.

### Changed
- Reorganized public `src/data/code/changelog.json` into `July 2026 Update 2` and `July 2026 Update 1`.
- Updated developer guides `README.md` (Section 2 chapter addition guide) and `AGENTS.md` (version v1.6).

---

## [1.4.0] - 2026-07-23

### Added
- **Knowledge Quiz Module**: Configurable quiz setup (`QuizConfig.jsx`), interactive gameplay (`QuizSession.jsx`), score evaluation (`QuizResults.jsx`), and question bank (`src/data/quizData.json`).
- **TPPT Checker Tool**: Agenda ingestion engine for PDF/Word/text (`tpptParser.js`, `tpptExtraction.js`), practical & hands-on duration eligibility calculator, interactive session editor (`TPPTContent.tsx`), and assessment PDF exporter (`pdfmake`).

---

## [1.3.0] - 2026-07-22

### Added
- **Centralized Routing Engine**: Pure URL route parser `src/utils/routeUtils.js`, content registry `src/config/routes.js`, and browser synchronization hook `src/hooks/useAppRouting.js`.
- **Data Validation & Verification Suite**: Dependency-free validator `scripts/validate-data.mjs` and Node test suite `tests/` covering route round-trips, section anchor stability, and data schema rules.
- **Developer Documentation**: Maintainer guides `ROUTING.md`, `PROJECT_CHECKS.md`, and content migration proof docs.

### Refactored
- **Modular Code Content**: Split monolithic `codeData.json` into canonical single-chapter files in `src/data/code/*.json` with explicit ordering in `codeOrder.js` and compatibility adapter `codeData.js`.

---

## [1.2.0] - 2026-05-24

### Added
- **Decap CMS Integration**: Administrative CMS at `/admin/` backed by Cloudflare Worker OAuth proxy (`server.js`) with HMAC CSRF state tokens.
- **Glossary System**: Automated glossary term detection (`processTextWithTerms`), interactive tooltip popovers (`DefinitionPopup.jsx`), and DOMPurify HTML sanitization.
- **Authoritative PDF Verification**: Automated audit script (`scripts/audit-code-pdf.py`) matching JSON content against September 2024 source PDF.

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
