# The Code App — Developer & Editor Guide

Welcome to the repository for **The Code App** (MedTech Europe Code of Ethical Business Practice Reader).

This guide is written specifically for anyone who needs to update the content, change the branding, or tweak the styles, even if you have **never looked at the code before**.

---

## 📁 App Structure Overview

The app is built using **React**, **Vite**, and **Cloudflare Workers**. All the important UI files live inside the `src/` (source) folder. The main feature folders under `src/` contain local `README.md` files explaining their purpose; content-only folders such as `src/data/code/` do not.

```text
/
 ├── /public/        # Static assets (icons, manifest, Decap CMS config)
 ├── /src/
 │   ├── /components/ # The building blocks of the UI (Header, Decision Trees, Quiz, etc.)
 │   ├── /config/     # Centralized registries (section definitions)
 │   ├── /data/       # Legal documents, decision trees, quiz data, and content manifests
 │   │   ├── /code/   # One canonical JSON file per Code chapter
 │   │   └── /transparency/ # Standalone Transparency publications, split into reader units
 │   ├── /hooks/      # Custom React hooks (PWA, bookmarks, routing, keyboard, history)
 │   ├── /utils/      # Helper functions (search highlighting, glossary processing)
 │   ├── App.jsx      # The main "brain" that connects everything together
 │   ├── main.jsx     # React entry point
 │   └── index.css    # Global styles, fonts, and print rules
 ├── server.js       # App/SPA Cloudflare Worker with optional same-origin OAuth endpoints
 ├── oauth-proxy.js  # Standalone OAuth proxy for Decap CMS
 ├── CHANGELOG.md    # Developer technical version changelog
 ├── PROJECT_CHECKS.md # Plain-language validation and testing guide
 ├── ROUTING.md      # URL formats, compatibility rules, and route checks
 ├── AGENTS.md       # AI Agent instructions and global Project Map
 └── wrangler.toml   # Cloudflare Worker configuration
```

### Components Reference

| File | Role |
|---|---|
| `AppIcons.jsx` | Centralized icon registry (uses `lucide-react`) |
| `DecisionTree.jsx` | Interactive step-by-step decision tree |
| `DefinitionPopup.jsx` | Glossary term tooltip popup |
| `DocumentReader.jsx` | Shared legal-document reader used by the Code and Transparency publications |
| `FullTextSection.jsx` | Renders a single legal text section with cite/link/bookmark + related tree callouts |
| `Header.jsx` | Top bar with section-aware toolbar (Summary, Full Text, Q&A, Reader, Print) |
| `Highlight.jsx` | Wraps matched text in highlight marks during search |
| `HubPage.jsx` | Home landing page with section cards |
| `InstallPrompt.jsx` | PWA install banner |
| `LandingPage.jsx` | Code section landing page with chapter grid |
| `Logo.jsx` | MedTech Europe SVG logo |
| `MainContent.jsx` | Main content area for the Code section |
| `quiz/QuizContent.jsx` | Main state controller for the Knowledge Quiz feature |
| `quiz/QuizConfig.jsx` | Setup screen for selecting quiz chapters and question count |
| `quiz/QuizResults.jsx` | Displays quiz score, review of incorrect answers, and share link |
| `quiz/QuizSession.jsx` | The interactive gameplay screen for answering questions |
| `Sidebar.jsx` | Collapsible navigation sidebar with search, bookmarks, and history |
| `TableOfContents.jsx` | Sticky "On This Page" minimap |
| `TPPTContent.tsx` | TPPT Checker UI: agenda ingestion (PDF/Word/text), session card editor, compliance threshold visualization, and PDF report export. Lazy-loaded via `React.lazy()`. Parser logic lives in `src/utils/tpptParser.js` |
| `TransparencyContent.jsx` | Transparency landing/document controller and local Annex I resource wiring |
| `TransparencyLandingPage.jsx` | Transparency publication cards and document-unit overview |
| `CsvTemplatePreview.jsx` | Non-normative preview and local download control for the Annex I CSV template |
| `TreeContent.jsx` | Router for the Decision Trees section (landing / interactive / visualization) |
| `TreeLandingPage.jsx` | Grid of decision tree cards grouped by category |
| `TreeVisualization.jsx` | Full flowchart visualization of a decision tree |

### Utility Modules Reference

| File | Role |
|---|---|
| `utils/bookmarkUtils.js` | Normalizes namespaced Code and Transparency bookmark records |
| `utils/csvUtils.js` | Parses the bundled Annex I CSV for its non-normative preview |
| `utils/htmlTextUtils.js` | Extracts normalized visible text from legal HTML for search and copy utilities |
| `utils/routeEffects.js` | Cancels/version-controls delayed anchor scrolling and section highlighting across route changes |
| `utils/searchResultUtils.js` | Normalizes search queries and identifies results visible only through Q&A content |
| `utils/textUtils.js` | Text processing, search highlighting, glossary extraction, ID generation |
| `utils/resourceUtils.js` | Resolves approved local `resource:` links without changing their visible text |
| `utils/tpptParser.js` | TPPT agenda parsing engine — session detection, type classification, capitalization normalization, eligibility calculation. Single source of truth used by both `TPPTContent.tsx` and `scratch/analyze_agendas.js` |
| `utils/tpptExtraction.js` | PDF text extraction using `pdfjs-dist` coordinate-based line detection |

---

## ⚙️ 1. Technical Architecture & Key Features

The Code App is a multi-section platform with a custom-built architecture optimized for performance and offline reading.

### 🏠 Multi-Section Architecture

The app is organized into independently navigable **sections**, all accessible from a central **Home Hub**:

- **Home Hub** — A card-based landing page that links to each section.
- **The Code** — The full MedTech Europe Code of Ethical Business Practice reader.
- **Transparency** — Standalone transparency publications, initially the Disclosure Guidelines.
- **Decision Trees** — Interactive compliance decision guides based on the Code.
- **Knowledge Quiz** — A testing module that challenges users with randomized multiple-choice questions on selected chapters.
- **TPPT Checker** — A compliance tool for evaluating whether a medical event qualifies as a Third Party Procedural Training meeting. Parses PDF/Word/text agendas, classifies sessions by type (Hands-on, Streaming, Case Study, etc.), checks the Code's practical-session thresholds, and exports a formatted PDF report.

The currently active section is tracked via `activeSection` state in `App.jsx` (`null` = Home, `'code'`, `'transparency'`, `'trees'`, `'quiz'`, or `'tppt'`). Transparency also tracks its active standalone publication in `activeDocumentId`. The `SECTIONS` registry supplies Home Hub metadata; it is not a complete navigation or routing registry. Adding a new section (e.g. "Materials") requires:
1. Adding an entry to `src/config/sections.js` using an icon registered in `src/components/AppIcons.jsx`.
2. Creating the content component.
3. Adding selection handling and a rendering branch in `App.jsx`.
4. Adding URL parsing/building rules and navigation actions in `utils/routeUtils.js` and `hooks/useAppRouting.js`.
5. Adding the desired navigation entry to `Sidebar.jsx`.
6. Adding focused routing tests to `tests/routeUtils.test.mjs`.

### 🧩 URL Routing & State (No React Router)
The app uses readable browser-history routes without adding a routing dependency:

- `/code` opens the Code chapter index.
- `/code/ch1` opens a chapter.
- `/code/ch1#ch1-2-event-location-and-venue` opens an exact Code section using its existing generated section ID.
- `/transparency` opens the Transparency index.
- `/transparency/disclosure-guidelines` opens the Disclosure Guidelines overview.
- `/transparency/disclosure-guidelines/dg-chapter-1#section-id` opens an exact Disclosure Guidelines section.
- `/trees/dt-ch1-event-location`, `/quiz`, and `/tppt` open the other tools.

`useAppRouting.js` keeps `App.jsx` state synchronized with these URLs and responds to browser Back/Forward navigation. Pure parsing and URL construction live in `utils/routeUtils.js`, configured with current content in `config/routes.js`. Previously shared root-hash links such as `/#ch1` and `/#ch1-2-event-location-and-venue` remain supported and are replaced with their canonical URL after loading. This compatibility behavior and every current Code chapter/section, Transparency document/unit/section, and decision-tree route are covered by `tests/routeUtils.test.mjs`.

See [`ROUTING.md`](ROUTING.md) before changing Code chapter IDs, Transparency document or unit IDs, tree IDs, section titles, navigation behavior, or deployment routing.

### 🔍 Dynamic Search Engine
The search bar lives in the `Sidebar`. It splits the user's query and counts matches across **titles, summaries, full legal texts, and Q&As**.
- Users can toggle **Advanced Search Filters** (Titles, Full Text, Q&As) to restrict precisely where the app hunts for matches.
- The sidebar auto-expands any collapsible groups that contain matches and shows per-group match counts.
- Whitespace-only input is treated as an empty search. Expansion snapshots are scoped to the current legal collection, and selecting a Q&A-only result automatically reveals its Q&A content.
- Highlighting is handled dynamically in `utils/textUtils.js` which wraps matching terms in a `<mark>` tag.
- Keyboard shortcut: Users can press `/` anywhere to immediately focus the search bar, or press `Escape` while the search field is focused to clear it.
- **Important:** Search is scoped to the active legal collection: Code content in the Code section and Transparency publications in the Transparency section. It intentionally does not search Decision Tree content.

### 📱 Progressive Web App (PWA) Offline Capabilities
This app precaches the core reader and application assets via `vite-plugin-pwa` so that previously installed users can open the main app without an internet connection. The emitted Disclosure Guidelines PDF and Annex I CSV template are included in the production service-worker precache. The large TPPT document-processing bundles and PDF worker are deliberately excluded, so the TPPT Checker is not guaranteed to load offline unless the required resources are already available in the browser cache.
- The installation logic relies on the `usePWAInstall.js` hook, which intercepts the browser's `beforeinstallprompt` and shows a custom install button. iOS requires manual installation via Safari's "Add to Home Screen" share action, which the UI explicitly handles.

### ⭐ Bookmarks & History
Users can save specific Code or Transparency sections to a personalized **Bookmarks** group in the sidebar (via `useBookmarks.js`). The app also tracks the last 5 visited Code chapters or Transparency document units under **Recently Viewed** (via `useRecentHistory.js`). Stored identifiers are namespaced by publication so similarly named sections cannot collide. Both are saved silently to `window.localStorage` so they persist without user accounts.

### 🗂️ Collapsible Sidebar Navigation
The sidebar uses a hierarchical, fully collapsible group structure:
- **Home Hub:** Bookmarks and Recently Viewed are expanded by default.
- **Code section:** "The Code" parent group expands automatically, revealing sub-groups (Introductory Chapters, Part 1: The Code, Part 2: Complaint Handling, Part 3: Annexes & Glossary, Website).
- **Transparency section:** The "Transparency" group reveals each registered publication and its reader units.
- **Decision Trees section:** The "Decision Trees" group expands, showing a "Browse Decision Trees" link.
- **Search mode:** When a search query is active, groups with matching chapters auto-expand. The prior expansion state is saved and restored when the search is cleared.

### 🌳 Decision Trees
Interactive compliance decision guides that let users step through real-world compliance scenarios:
- **Interactive Mode:** Question-by-question flow with contextual help text, path breadcrumb trail, go-back/reset controls, and color-coded outcomes (✅ Compliant, ❌ Non-Compliant, ⚠️ Conditional, ⚖️ Consult Legal).
- **Full Tree Visualization:** A flowchart rendering of the entire decision tree, with a legend and highlighted-path support.
- **Cross-linking:** Code chapters that have related decision trees show an inline amber callout with a direct link. Clicking it switches the user from the Code section to the relevant tree.

### 📚 Glossary & Definitions
The Code reader automatically detects glossary terms within its legal text and renders them as interactive links. Clicking a term opens a `DefinitionPopup` tooltip with the glossary definition. Standalone Transparency publications intentionally disable this transformation so their approved visible text remains unchanged.

### 📑 Reading Utilities
To facilitate heavy professional reference usage, the app includes several quality-of-life tools:
- **Table of Contents (On This Page):** A sticky, scroll-tracking minimap located on the right side of the screen on desktop displays.
- **Reading Progress Line:** A sticky top progress bar that smoothly tracks scrolling completion down long legal chapters.
- **Q&A Fast-Jump Badges:** Section titles with associated Q&As feature a `💬 Q&A` badge that smooth-scrolls directly to the guidance notes for that provision.
- **Multi-Format Citation Dropdown:** A `[Cite]` popover offering Formal Citations (including section title and current access date), Markdown links, and Direct URL links with confirmation toast notifications.
- **Copy Link:** A `[Link]` button copies the direct URL to the section.
- **Next/Prev Navigation:** Large footer buttons at the bottom of every reader unit allow for linear reading without returning to the sidebar.
- **Reader Settings:** An `Aa` button in the header opens a panel to customize font size, line spacing, and paragraph spacing.

### 🖨️ Print & Export Mode
The app features an optimized Print Mode. By pressing the **Print** icon in the header (or pressing `Ctrl+P`), the `index.css` `@media print` query strips away the Sidebar, Header, and interactive elements. It presents a clean, high-contrast, black-and-white view of the legal text — perfect for generating PDFs. Transparency printing includes every publication Q&A even when Q&As are hidden on screen; the non-normative Annex I CSV preview and interactive source/download controls are omitted.

### 🛠️ Decap CMS & Cloudflare Worker Integration
The application uses **Decap CMS** for content management, accessible at `/admin/`.
- The CMS uses GitHub as its backend.
- The hosted CMS uses the separately deployed `oauth-proxy.js`, configured by `public/admin/config.yml`, for GitHub OAuth.
- `server.js` serves the static React application and SPA routes. It also contains optional same-origin OAuth endpoints, but it is not the OAuth service currently named by the hosted CMS configuration.
- For local, uncommitted content, run `npm run cms` from the app root. This
  starts both Vite and the local Decap proxy. The hosted CMS continues to read
  only the GitHub `main` branch.
- See [`docs/cms-guide.md`](docs/cms-guide.md) for the non-technical editing,
  validation, troubleshooting, and release workflow.

---

## 📝 2. How to Edit & Add Legal Content (`FULL_CODE_DATA`)

You can edit content directly in the JSON files or via the **Decap CMS** at `/admin/`.

For local CMS editing, use `npm run cms`, not only `npm run dev`. The local proxy is what allows the CMS to read files that have not yet been committed to GitHub.

The text, annexes, and Q&As are stored as **one canonical JSON file per chapter** in:
👉 **`src/data/code/`**

The filename matches the chapter ID and URL. For example, `ch1.json` supplies `/code/ch1`, while `annex4.json` supplies `/code/annex4`.

### Published Baseline and Word Amendment Workflow

The September 2024 PDF and editable Word file have distinct roles:

- `src/data/code-september-2024 (1).pdf` is the hash-pinned published baseline.
- `src/data/code-september-2024.docx` is the team-facing amendment and review format.
- `src/data/code/*.json` remains the source used by the application.

The DOCX is generated directly from the PDF by `scripts/build-code-docx-from-pdf.py`; the script deliberately does not read the JSON. Do not regenerate the DOCX from application data. When a revised DOCX is returned after review, identify the deliberate Word changes against the PDF-derived structure and apply only the approved changes to the relevant chapter JSON files.

Use `scripts/verify_code_docx_against_pdf.py` to independently check the generated Word file against the published PDF and its documented editorial corrections. These Python scripts require the document-processing dependencies imported by the scripts.

`src/data/code-manifest.json` is frozen evidence of the 2026 monolith-to-chapters migration. It is not an everyday content baseline and must not be regenerated after an ordinary approved content edit. See [`docs/content-migration/README.md`](docs/content-migration/README.md) and its reconciliation record for the audit history.

### Understanding the Chapter Schema
Each chapter file in `src/data/code/` contains a single JSON object structured as follows:

```json
{
  "id": "ch1",
  "part": "part1",
  "title": "General Criteria for Events",
  "icon": "1",
  "summary": "A brief summary of the chapter goes here...",
  "sections": [
    {
      "title": "1.1 The Core Objective",
      "legalText": "<p>This is the actual legal text. It uses <strong>HTML</strong> tags.</p>",
      "qas": [
        {
          "q": "What is the core objective?",
          "a": "<p>The answer goes here.</p>"
        }
      ]
    }
  ]
}
```

#### Field Reference:
* `id`: Unique string identifier (e.g. `"ch1"`, `"annex1"`). Forms the public URL path `/code/<id>`.
* `part`: Categorizes where the chapter appears in the sidebar hierarchy:
  * `"intro"` — Introductory Chapters (Scope, Admin, Intro)
  * `"part1"` — Part 1: MedTech Europe Code of Ethical Business Practice
  * `"part2"` — Part 2: Dispute Resolution Code / Complaint Handling
  * `"part3"` — Part 3: Procedural Standards & Annexes
  * `"website"` — Website Information & Version History
* `title`: Full title string displayed in headers and sidebar navigation.
* `icon`: Icon name from `AppIcons.jsx` or a chapter number string (e.g. `"1"`).
* `summary`: Short summary string or HTML rendered on chapter cards and summary views.
* `sections`: Array of section objects, each containing:
  * `title`: Section heading (e.g. `"1.1 The Core Objective"`).
  * `legalText`: Normative legal body text (supports HTML tags like `<strong>`, `<em>`, `<ul>`, `<li>`, `<table>`).
  * `qas`: Array of Q&A objects `[{ "q": "...", "a": "..." }]`.

---

### How to Edit Existing Content
1. **Fixing Typos:** Open the relevant file in `src/data/code/`, use `Ctrl+F` (or `Cmd+F`) to find the text, and change only the intended value. Alternatively, edit via Decap CMS.
2. **Formatting Text:** The `legalText` and `a` (answer) fields support standard HTML:
   - Use `<strong>text</strong>` for bold text.
   - Use `<em>text</em>` for italics.
   - Use `<ul><li>Item</li></ul>` for bulleted lists.
   - Use `<table>...</table>` for tabular data.
3. **Adding a Q&A to a Section:** Navigate to the target section in its chapter JSON file, locate its `"qas"` array, and append a new entry:
   ```json
   {
     "q": "Q&A 3: Can a Member Company...?",
     "a": "<p>Yes, provided that...</p>"
   }
   ```

---

### How to Add a New Section to an Existing Chapter
1. Open the relevant chapter file in `src/data/code/` (e.g. `src/data/code/ch1.json`).
2. Add a new section object to the `"sections"` array:
   ```json
   {
     "title": "1.3 Virtual & Hybrid Event Guidelines",
     "legalText": "<p>When organizing virtual events, Member Companies must...</p>",
     "qas": []
   }
   ```
3. *Note on Section Deep Links:* Section IDs are automatically computed from the `title` string via `utils/textUtils.js` (e.g. `"1.3 Virtual & Hybrid Event Guidelines"` generates anchor ID `ch1-1-3-virtual-hybrid-event-guidelines`).

---

### How to Add a Brand New Chapter (Step-by-Step)

When introducing a new chapter (e.g. `ch11.json` or `annex8.json`), follow these 4 steps:

#### Step 1: Create the JSON file in `src/data/code/`
Create a new file `src/data/code/ch11.json` with the complete chapter schema:
```json
{
  "id": "ch11",
  "part": "part1",
  "title": "Digital & Software Compliance",
  "icon": "11",
  "summary": "Guidelines governing standalone software, digital tools, and AI solutions.",
  "sections": [
    {
      "title": "11.1 Scope of Digital Tools",
      "legalText": "<p>This chapter applies to all digital applications...</p>",
      "qas": []
    }
  ]
}
```

#### Step 2: Register the Chapter Order in `src/data/codeOrder.js`
Open `src/data/codeOrder.js` and add the new chapter ID to the `CODE_CHAPTER_IDS` array in the exact position you want it to appear in linear reading order:

```javascript
// src/data/codeOrder.js
export const CODE_CHAPTER_IDS = Object.freeze([
  'scope',
  'admin',
  'intro',
  'ch1',
  // ...
  'ch10',
  'ch11', // <--- Insert new chapter ID here
  'part2',
  'glossary',
  // ...
]);
```

#### Step 3: Register the Import in `src/data/codeData.js`
Open `src/data/codeData.js`, import your new JSON file, and add it to the `CHAPTERS_BY_ID` dictionary:

```javascript
// src/data/codeData.js
// 1. Add import statement at top:
import chapter11 from './code/ch11.json';

// 2. Add to CHAPTERS_BY_ID mapping:
const CHAPTERS_BY_ID = {
  // ...
  ch10: chapter10,
  ch11: chapter11, // <--- Map ID to imported object
  part2,
  // ...
};
```

#### Step 4: Validate & Verify
Run the validation and test suite from your terminal:
```bash
npm run validate:data
```
Or run the complete verification check:
```bash
npm run check
```
`npm run validate:data` checks JSON structure, registered icons, references, and generated-ID uniqueness. `npm run check` additionally runs route tests, Disclosure source verification, TypeScript checks, and the production build.

See [`docs/content-migration/README.md`](docs/content-migration/README.md) for PDF audit history and migration details.

---

### Disclosure Guidelines source and editing rules

The Disclosure Guidelines are a standalone publication under the Transparency section, not another Code chapter.

- `src/data/mte-code_disclosure_guidelines.pdf` is the authoritative October 2025 source.
- `src/data/transparency/` contains the verbatim reader data, ordered as Preamble, Chapters 1–3, and Annexes I–III.
- The PDF table of contents is represented by the live document overview and sidebar navigation; normative body text, headings, Q&As, notes, and tables must remain verbatim.
- Footnote 1 in Chapter 1, section 1 keeps its original marker and wording but is intentionally rendered at the end of the continuous-reader section. The source verifier restores only that footnote's PDF-page position for comparison and pins the relocation as an approved representational change.
- `src/data/declaration-csv-template.csv` is the local Annex I download. The sentence and link text remain exactly as published, while the link target is resolved locally by the app.
- The CSV preview is a clearly labelled convenience view of that same local file. It is not part of the published Disclosure Guidelines text.

Never summarize, silently correct, or bulk-reserialize this publication. After any edit, run:

```bash
npm run verify:disclosure-guidelines
npm run validate:data
```

The first command pins both supplied source files and all raw publication JSON. It compares the ordered visible body from PDF pages 2–15 with the integrated publication, checks lexical word boundaries and punctuation, and separately asserts the Annex I link boundary plus Annex II/III structure. The evidence manifest records the narrow PDF-extraction normalizations used for this comparison; they do not change the publication text rendered by the app.

If a formally revised publication is approved, independently reconcile the new PDF/CSV and reader data, then update `source-manifest.json` and the `EXPECTED` baselines in `scripts/verify-disclosure-guidelines.mjs` together in the same reviewed change. Never change expected values merely to make a failure pass.

### Adding another Transparency publication

Transparency is a publication registry, so adding a document requires more than adding a Home Hub card:

1. Create a publication folder under `src/data/transparency/`. Its `document.json` needs a route-safe `id`, title, registered icon, ordered `unitIds`, and declared resources. Each unit needs an `id`, matching `documentId`, `type`, title, a registered icon or numeric icon, positive `sourcePages`, and non-empty `sections`.
2. Import and register the document and its units in `src/data/transparency/transparencyData.js`.
3. Register the same files in `scripts/lib/transparency-content.mjs` so validation and route tests load the live publication data.
4. Map bundled source and resource files in `src/components/TransparencyContent.jsx`. Use `?url&no-inline` for small downloads that must remain real URLs. Offline precaching also requires the file extension in `vite.config.ts` `workbox.globPatterns` and the emitted file to remain below `maximumFileSizeToCacheInBytes`; update or explicitly document those limits for other formats and confirm the result in the built `dist/sw.js`.
5. Add source-specific verification where the publication is normative, then run `npm run check` and test every document, unit, and section route.

The generic Transparency landing page, sidebar, reader, search, bookmarks, history, and route builders then include the registered publication without a new section controller.

---

## 🌳 3. How to Edit Decision Trees (`treeData.json`)

All decision trees are stored in:
👉 **`src/data/treeData.json`**

### Understanding the Structure
Each tree is an object with these fields:

```json
{
  "id": "dt-ch1-event-location",
  "title": "Is My Event Location Compliant?",
  "relatedChapter": "ch1",
  "relatedSection": "ch1-2-event-location-and-venue",
  "category": "events",
  "description": "Assess whether a proposed event location meets Code requirements.",
  "nodes": [ ... ]
}
```

### Supported `outcome` values:
| Value | Color | Icon | Meaning |
|---|---|---|---|
| `compliant` | Green | ✅ | Passes the compliance check |
| `non-compliant` | Red | ❌ | Fails the compliance check |
| `conditional` | Amber | ⚠️ | Depends on further context |
| `consult-legal` | Blue | ⚖️ | Seek legal counsel |
| `not-required` | Teal | ℹ️ | Assessment not required |
| `out-of-scope` | Purple | ➖ | Outside the Code's scope |
| `not-applicable` | Purple | ➖ | Not applicable |
| `prior-review` | Purple | 📋 | Prior review required |
| `in-scope` | Indigo | 🎯 | Within the Code's scope |

### How to add a new tree:
1. Open `treeData.json` (or use Decap CMS).
2. Add a new object to the top-level array.
3. Give it a unique `id` starting with `dt-`.
4. Set `relatedChapter` to the Code chapter's `id` (e.g. `"ch3"` for Company Events).
5. Optionally set `relatedSection` to a specific section's `computedId` for precise cross-linking.
6. Add your `nodes` array. The first question node **must** have `"id": "start"`.
7. Make sure every `"next"` value in every option points to a valid node `id`.

---

## 🧠 4. How to Edit the Knowledge Quiz (`quizData.json`)

All quiz questions and options are stored in:
👉 **`src/data/quizData.json`**

### Understanding the Structure
Each question is an object with these fields:

```json
{
  "id": "q1",
  "chapterId": "ch1",
  "question": "What is the minimum required duration for...?",
  "options": [
    { "id": "opt1", "text": "4 hours", "isCorrect": false },
    { "id": "opt2", "text": "6 hours", "isCorrect": true }
  ],
  "hint": "The program must present a clear schedule...",
  "explanation": "The minimum duration for a full day is 6 hours..."
}
```

---

## 🏗️ 5. How to Add a New Top-Level Section

The app is designed to be scalable. Adding an entirely new top-level section (like "Materials" or "Training") requires minimal changes:

1. **Register the section** in `src/config/sections.js`:
   ```js
    {
      id: 'materials',
      title: 'Materials',
      subtitle: 'Supplementary compliance resources',
      description: 'Download templates, checklists, and reference guides.',
      icon: 'Gift',
      color: '#8b5cf6',
      available: true,
    }
    ```

   The icon must already be registered in `src/components/AppIcons.jsx`. If you want to use another Lucide icon such as `Package`, add it to that registry first.

2. **Create the content component(s)** in `src/components/` (e.g. `MaterialsContent.jsx`).

3. **Wire it into `App.jsx`:**
   - Import the component.
   - Recognize `'materials'` in `handleSectionSelect`.
   - Add a conditional branch in the main rendering logic:
      ```jsx
      ) : activeSection === 'materials' ? (
       <MaterialsContent ... />
     ) : (
     ```

4. **Add the section's URL rules** to `utils/routeUtils.js`, expose its navigation action from `hooks/useAppRouting.js`, and add focused cases to `tests/routeUtils.test.mjs`.

5. **Add Sidebar navigation explicitly** in `Sidebar.jsx`. The Home Hub reads available cards from `SECTIONS`, but the Sidebar does not currently generate top-level navigation from that registry.

6. **Run `npm run check`** to validate data, tests, TypeScript, and the production build.

---

## 🎨 6. How to Edit Styles and Colors

This app uses **Tailwind CSS** utility classes for most component styling. Cross-cutting behavior—including reader typography, CMS-authored HTML, accessibility helpers, animations, and print rules—also lives in `src/index.css`.

### Where to find styles:
If you want to change how a specific part of the app looks, you need to find its corresponding component in the `src/components/` folder.

For example, to change the top navigation bar, open `src/components/Header.jsx`. You will see code like this:
```jsx
<header className="h-20 flex-none border-b border-gray-200 bg-white/95 backdrop-blur-sm">
```
- `h-20` means height: 5rem.
- `border-b` adds a bottom border.
- `bg-white/95` makes the background white at 95% opacity.
- `backdrop-blur-sm` adds a subtle blur for a glassmorphism effect.

### How to change colors:
Tailwind has a built-in color palette. If you want to change a blue button to a purple button, you simply change `bg-blue-600` to `bg-purple-600`.
- Text color: `text-slate-800`, `text-red-500`, etc.
- Background color: `bg-slate-100`, `bg-teal-50`, etc.
- *Tip: You can find all available colors at [tailwindcss.com/docs/customizing-colors](https://tailwindcss.com/docs/customizing-colors).*

### Brand colors used in the app:
| Color | Hex | Usage |
|---|---|---|
| Purple | `#7654A1` | Primary accent (buttons, active states, bookmarks) |
| Teal | `#0099A7` | Code and Transparency reader accent (breadcrumbs, citations, links) |
| Amber/Orange | `#e67e22` | Decision Trees section accent |
| Slate Gray | various | Text, backgrounds, borders |

### Global Styles:
If you need to change the **font family** or the background color of the entire website, look in:
👉 **`src/index.css`**

---

## 🖼️ 7. How to Edit Logos and Icons

### The Main Logo
The main MedTech Europe logo (seen in the Header and on the Home Hub) is controlled by a single file:
👉 **`src/components/Logo.jsx`**

### Other Icons
The icons used in the sidebar and throughout the app are stored in:
👉 **`src/components/AppIcons.jsx`**

This file uses a library called `lucide-react`. If you want to change an icon, you can go to [lucide.dev/icons](https://lucide.dev/icons), find the name of the icon you want, and update it in `AppIcons.jsx`.

> **Important:** All icons must be imported through `AppIcons.jsx`. Do not import `lucide-react` directly in other components — this keeps the bundle size predictable and icons consistent.

---

## ⌨️ 8. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `/` | Focus the search bar |
| `Escape` | Clear the search bar while the search field is focused |
| `Ctrl+P` / `Cmd+P` | Open print mode |

---

## 🧪 9. Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.0.0 | UI framework |
| `react-dom` | ^19.0.0 | React DOM renderer |
| `vite` | ^6.2.0 | Build tool & dev server |
| `@tailwindcss/vite` | ^4.1.14 | Tailwind CSS integration |
| `tailwindcss` | ^4.1.14 | Utility-first CSS framework |
| `lucide-react` | ^0.546.0 | Icon library |
| `dompurify` | ^3.3.3 | HTML sanitizer (prevents XSS in legal text) |
| `motion` | ^12.23.24 | Animation library |
| `vite-plugin-pwa` | ^1.2.0 | Service worker generation for offline support |
| `mammoth` | ^1.12.0 | Word document text extraction for the TPPT Checker |
| `pdfjs-dist` | ^5.7.284 | PDF text extraction for the TPPT Checker |
| `pdfmake` | ^0.3.8 | TPPT assessment PDF generation |

---

## 🚀 10. How to Preview and Publish Your Changes

Once you have made your edits, you'll want to see them and publish them.

### To preview on your computer:
1. Open your terminal in the project folder.
2. Run `npm install` (you only need to do this once, or after dependency changes).
3. Run `npm run dev`.
4. Open the `http://localhost:3000` link provided in the terminal. The app will automatically update as you save files!

### To build a production bundle:
```bash
npm run build
```
The optimized output will be placed in the `dist/` folder. This is what gets deployed.

### To publish to Cloudflare Workers (Live Website):
This project is configured as a Cloudflare Worker with Assets (`wrangler.toml`).
If the Cloudflare project has been separately connected to this GitHub repository with automatic deployments enabled, push your changes:
1. Save your files.
2. Run the following commands in your terminal:
   ```bash
   git add .
   git commit -m "Describe what you changed here"
   git push
   ```
3. Confirm the deployment in Cloudflare. A push triggers deployment only when that external Git integration is configured and enabled; `wrangler.toml` alone does not create a push-triggered deployment.
Alternatively, you can manually deploy using `npx wrangler deploy`.

### Other useful commands:
| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Create a production-optimized build |
| `npm run preview` | Preview the production build locally |
| `npm run clean` | Delete the `dist/` folder (the current script requires a shell that provides `rm`; in PowerShell use `Remove-Item -Recurse -Force dist`) |
| `npm run lint` | Run TypeScript checks without emitting files |
| `npm run validate:data` | Check Code, Transparency, tree, and quiz data integrity |
| `npm run verify:disclosure-guidelines` | Verify verbatim Disclosure Guidelines data and pinned PDF/CSV sources |
| `npm run verify:production-disclosure-assets` | After a build, prove the emitted Disclosure PDF/CSV remain byte-exact and precached |
| `npm test` | Run focused tests for stable project logic |
| `npm run check` | Run validation, source verification, tests, TypeScript, the production build, and emitted-asset proof |

For step-by-step instructions written for non-technical maintainers, see [`PROJECT_CHECKS.md`](PROJECT_CHECKS.md).

---

## 📂 11. Data Flow Overview

```text
User opens app
     │
     ▼
  Home Hub (HubPage.jsx)
     │
     ├── Click "The Code" ──► Code Section
     │      │
     │      ├── Sidebar (collapsible chapter groups)
     │      ├── LandingPage (chapter cards grid)
     │      ├── MainContent (Summary + Full Text + Q&A)
     │      │     └── FullTextSection (legal text + glossary links + tree callouts)
     │      │            └── "Related Decision Tree" callout  ──► Decision Tree
     │      └── TableOfContents (sticky "On This Page")
     │
     ├── Click "Transparency" ──► Transparency Section
     │      │
     │      ├── TransparencyLandingPage (standalone publication cards)
     │      └── Disclosure Guidelines
     │             ├── Document overview (Preamble, Chapters 1–3, Annexes I–III)
     │             ├── DocumentReader + FullTextSection
     │             └── Annex I local CSV download and convenience preview
     │
     └── Click "Decision Trees" ──► Trees Section
     │      │
     │      ├── TreeLandingPage (tree cards by category)
     │      ├── DecisionTree (interactive step-by-step)
     │      └── TreeVisualization (full flowchart)
     │
     └── Click "Knowledge Quiz" ──► Quiz Section
            │
            ├── QuizConfig (Select chapters, count)
            ├── QuizSession (Answer questions)
            └── QuizResults (Score, Share, Review)
     │
     └── Click "TPPT Checker" ──► TPPT Section
            │
            ├── Import agenda text or document
            ├── Review parsed sessions and session types
            ├── Calculate eligibility
            └── Export assessment PDF
```

---

## 🔒 12. Security Notes

- All HTML in `legalText` and Q&A answers is sanitized through **DOMPurify** before rendering. This prevents cross-site scripting (XSS) even if someone injects malicious code into the JSON content.
- The hosted Decap CMS uses the separately deployed `oauth-proxy.js`; `server.js` serves the application and also offers optional same-origin OAuth endpoints. Both OAuth implementations use HMAC-signed state tokens for CSRF protection.
- Public reader interactions and TPPT source documents are processed client-side. Bookmarks, history, and recent searches stay in `localStorage`; the separate `/admin/` CMS communicates with GitHub and its OAuth service when editors sign in or save content.
