# Agent Instructions

<!-- Version: v1.2 – 2026-04-25 -->

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

- **`src/App.jsx`**: The core orchestrator. It manages the `activeSection` (Home Hub, Code, Decision Trees, Quiz) and uses custom hooks to synchronize state with the URL hash and `localStorage`.
- **`src/components/`**: UI building blocks.
  - **Layout Components**: `Header.jsx` and `Sidebar.jsx` are persistent across sections. `Header` dynamically changes its toolbar based on the `activeSection`.
  - **Section Controllers**: `MainContent.jsx` (Code), `TreeContent.jsx` (Trees), and `QuizContent.jsx` (Quiz) act as sub-routers and layout managers for their respective features.
  - **Feature Components**: Specialized UI like `DecisionTree.jsx` (interactive logic), `DefinitionPopup.jsx` (glossary), and `TableOfContents.jsx` (navigation).
- **`src/hooks/`**: Business logic and side effects.
  - `useHashRouting.js`: Intercepts URL changes to drive `App.jsx` state without a routing library.
  - `useBookmarks.js` / `useRecentHistory.js`: Persist user interactions to `localStorage`.
  - `usePWAInstall.js`: Manages the PWA lifecycle and install prompts.
- **`src/data/`**: The "Source of Truth" for content.
  - `codeData.json`: Hierarchical structure of the MedTech Code (Chapters -> Sections -> Q&As).
  - `treeData.json`: Graph-based logic for compliance decision trees.
  - `quizData.json`: Question bank for the knowledge quiz.
- **`src/config/`**: Shared registries like `sections.js`, which defines the modules available in the Home Hub.
- **`src/utils/`**: Deterministic helpers for text processing, search highlighting, and ID generation.

## Standards

### 1. Architecture & State
- **Functional Components**: Use React functional components and hooks exclusively.
- **Custom Routing**: Adhere to the hash-based routing system (`#prefix-id`). New sections must be registered in `useHashRouting.js`.
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
- **JSON First**: All content updates must happen in the `src/data/*.json` files.
- **Sanitization**: When rendering HTML from JSON (e.g., `legalText`), always wrap it in a sanitizer if not already handled by a central component.
- **Computed IDs**: Section IDs are generated dynamically via `utils/textUtils.js`. Maintain this consistency to avoid breaking bookmarks and deep links.

### 5. Naming Conventions
- **Files**: `PascalCase.jsx` for components, `camelCase.js` for hooks/utilities/data.
- **Variables**: Use `camelCase` for local variables and `UPPER_SNAKE_CASE` for exported constants or data imports.

## Example Snippets
### Full Chapter Example (from `src/data/codeData.json`)
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
export const sections = [
  // existing entries …
  {
    id: "materials",
    label: "Materials",
    icon: "Package",
    route: "#materials", // follows the hash‑routing convention
    color: "bg-teal-600", // Tailwind utility using brand teal
  },
];
```
