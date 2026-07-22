# Agent Instructions

<!-- Version: v1.5 - 2026-07-22 -->

## Table of Contents
- [Project Map](#project-map)
- [Standards](#standards)
  - [Architecture & State](#architecture--state)
  - [Styling & Branding](#styling--branding)
  - [Components & Icons](#components--icons)
  - [Data Handling](#data-handling)
  - [Naming Conventions](#naming-conventions)
- [Architecture Overview](#architecture-overview)

## Project Map

The project is structured around a centralized state architecture in `App.jsx`, which manages top-level navigation and shared utilities.

- **`src/App.jsx`**: The core orchestrator. It manages the `activeSection` (Home Hub, Code, Decision Trees, Quiz, TPPT) and uses custom hooks to synchronize state with the browser URL and `localStorage`. `TPPTContent` is loaded via `React.lazy()` so its heavy dependencies (pdfmake, pdfjs-dist, mammoth) are not included in the main bundle.
- **`src/components/`**: UI building blocks.
  - **Layout Components**: `Header.jsx` and `Sidebar.jsx` are persistent across sections. `Header` dynamically changes its toolbar based on the `activeSection`.
  - **Section Controllers**: `MainContent.jsx` (Code), `TreeContent.jsx` (Trees), `QuizContent.jsx` (Quiz), and `TPPTContent.tsx` (TPPT Checker) act as sub-routers and layout managers for their respective features.
  - **Feature Components**: Specialized UI like `DecisionTree.jsx` (interactive logic), `DefinitionPopup.jsx` (glossary), and `TableOfContents.jsx` (navigation).
- **`src/hooks/`**: Business logic and side effects.
  - `useAppRouting.js`: Drives `App.jsx` state from readable paths, section anchors, and browser Back/Forward events without a routing library. It also upgrades supported legacy hash URLs with `replaceState`.
  - `useBookmarks.js` / `useRecentHistory.js`: Persist user interactions to `localStorage`.
  - `usePWAInstall.js`: Manages the PWA lifecycle and install prompts.
- **`src/data/`**: The "Source of Truth" for content.
  - `code/*.json`: One canonical MedTech Code chapter per file (Sections -> Q&As).
  - `codeOrder.js`: Explicit chapter order shared by the app and validation tools.
  - `codeData.js`: Compatibility adapter that assembles `FULL_CODE_DATA` without changing component APIs.
  - `code-manifest.json`: Frozen raw-byte evidence for the 2026 monolith-to-chapters migration; it is not an everyday content baseline.
  - `treeData.json`: Graph-based logic for compliance decision trees.
  - `quizData.json`: Question bank for the knowledge quiz.
- **`src/config/`**: Shared registries like `sections.js`, which defines the modules available in the Home Hub, and `routes.js`, which configures the route parser from live Code and decision-tree data.
- **`src/utils/`**: Deterministic helpers for text processing, search highlighting, and ID generation.
  - `routeUtils.js`: Pure URL builders and parsing rules for canonical paths and supported legacy hash URLs.
  - `tpptParser.js`: The TPPT agenda parsing engine. Contains `parseTpptSessions()` (the main parser), `classifySessionTitle()` (type classification), `calculateTpptEligibility()` (threshold checker), `normalizeCapitalization()`, `getSuggestedEventName()`, and all time/duration utilities. This is the single source of truth for parsing logic — both `TPPTContent.tsx` and `scratch/analyze_agendas.js` import from it.
  - `tpptExtraction.js`: PDF text extraction using `pdfjs-dist`. Contains `extractPdfPageText()` and `extractPdfTextFromPdf()`. Imported by both `TPPTContent.tsx` and `scratch/analyze_agendas.js`.
- **`scratch/analyze_agendas.js`**: CLI verification script that runs the TPPT parser against real PDF agendas. Imports from `src/utils/tpptParser.js` and `src/utils/tpptExtraction.js` (single source of truth). Run with `node scratch/analyze_agendas.js [pdf-paths...]` to validate session parsing. If no paths are given, reads from `TPPT agendas/` folder.
- **`scripts/validate-data.mjs`**: Dependency-free structural validation for Code, decision-tree, and quiz data. Run with `npm run validate:data` after content edits.
- **`tests/`**: Focused Node tests for stable project logic. Run with `npm test`. The plain-language operating guide is `PROJECT_CHECKS.md`.
- **`ROUTING.md`**: Canonical URL formats, legacy compatibility guarantees, identifier stability rules, hosting requirements, and manual release checks.

## Standards

### 1. Architecture & State
- **Functional Components**: Use React functional components and hooks exclusively.
- **Custom Routing**: Keep routing centralized in `routeUtils.js`, `config/routes.js`, and `useAppRouting.js`. Canonical routes use `/code/:chapterId`, `/trees/:treeId`, `/quiz`, and `/tppt`; Code section links retain their generated ID as `/code/:chapterId#section-id`. Preserve legacy root-hash links and add route tests whenever routing changes.
- **State Management**: Prefer passing state/props from `App.jsx` for global concerns (active section, reader settings) and using local state for component-specific logic.

### 2. Styling & Branding
- **Tailwind CSS**: Use utility classes for all component styling. Avoid creating new `.css` files.
- **Brand Colors**: 
  - Purple (`#7654A1`): Primary actions, active states, bookmarks.
  - Teal (`#0099A7`): Code section accent, links, citations.
  - Amber: Decision Tree warnings and callouts.
- **Print Optimization**: All new UI elements must be evaluated for their appearance in Print Mode (managed via `@media print` in `index.css`). Use the `.no-print` class to hide interactive elements.

### 3. Components & Icons
- **Icon Registry**: Always use `<AppIcon name="..." />` from `src/components/AppIcons.jsx`. Never import `lucide-react` directly into feature components.
- **Reusability**: Encapsulate complex UI logic (like the glossary tooltip) into standalone components that can be driven by props.

### 4. Data Handling
- **JSON First**: All content updates must happen in the relevant JSON source, including chapter files under `src/data/code/`.
- **Canonical Text Preservation**: Never regenerate, summarize, or bulk reserialize normative Code text. Keep content edits narrowly scoped and verify them against the authoritative source.
- **Migration Evidence**: `code-manifest.json` proves the 2026 content-neutral split. Do not regenerate it after ordinary approved content edits.
- **Sanitization**: When rendering HTML from JSON (e.g., `legalText`), always wrap it in a sanitizer if not already handled by a central component.
- **Computed IDs**: Section IDs are generated dynamically via `utils/textUtils.js`. Maintain this consistency to avoid breaking bookmarks and deep links.
- **Validation**: Run `npm run validate:data` after changing JSON under `src/data/`. Do not weaken a rule or alter content merely to silence a validation error; first determine whether the content or the rule is wrong.

### 5. Naming Conventions
- **Files**: `PascalCase.jsx` for components, `camelCase.js` for hooks/utilities/data.
- **Variables**: Use `camelCase` for local variables and `UPPER_SNAKE_CASE` for exported constants or data imports.

## Example Snippets
### Full Chapter Example (from a file in `src/data/code/`)
```json
{
  "id": "scope",
  "part": "intro",
  "title": "Scope",
  "icon": "Globe",
  "summary": "Outlines the applicability and geographic reach of the MedTech Europe Code.",
  "sections": [
    {
      "title": "1. Applicability of the Code",
      "legalText": "<strong>1.1.</strong> This Code only applies ...",
      "qas": [
        {
          "q": "Q&A 1: Is the Code applicable to activities of an affiliate ...?",
          "a": "With regards to activities of an affiliate ..."
        },
        {
          "q": "Q&A 2: How does the Code apply to members with company platforms ...?",
          "a": "The Code applies to all Member Companies’ interactions ..."
        }
      ]
    }
    // … other sections omitted for brevity
  ]
}
```

### Adding a New Section in `src/config/sections.js`
```javascript
// src/config/sections.js
export const SECTIONS = [
  // existing entries …
  {
    id: "materials",
    title: "Materials",
    subtitle: "Supplementary compliance resources",
    description: "Download templates, checklists, and reference guides.",
    icon: "Package",
    color: "#8b5cf6",
    available: true,
  },
];
```

Registering Home Hub metadata does not create a route by itself. Follow the routing steps in `README.md` and `ROUTING.md` when making the section navigable.
