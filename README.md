# The Code App — Developer & Editor Guide

Welcome to the repository for **The Code App** (MedTech Europe Code of Ethical Business Practice Reader).

This guide is written specifically for anyone who needs to update the content, change the branding, or tweak the styles, even if you have **never looked at the code before**.

---

## 📁 App Structure Overview

The app is built using **React**, **Vite**, and **Cloudflare Workers**. All the important UI files live inside the `src/` (source) folder. **Note:** Every subfolder inside `src/` contains its own `README.md` file explaining its local purpose.

```text
/
 ├── /public/        # Static assets (icons, manifest, Decap CMS config)
 ├── /src/
 │   ├── /components/ # The building blocks of the UI (Header, Decision Trees, Quiz, etc.)
 │   ├── /config/     # Centralized registries (section definitions)
 │   ├── /data/       # The actual text/content (legal code, decision trees, quiz data)
 │   ├── /hooks/      # Custom React hooks (PWA, bookmarks, routing, keyboard, history)
 │   ├── /utils/      # Helper functions (search highlighting, glossary processing)
 │   ├── App.jsx      # The main "brain" that connects everything together
 │   ├── main.jsx     # React entry point
 │   └── index.css    # Global styles, fonts, and print rules
 ├── server.js       # Cloudflare Worker script (serves app and handles OAuth)
 ├── oauth-proxy.js  # Standalone OAuth proxy for Decap CMS
 ├── AGENTS.md       # AI Agent instructions and global Project Map
 └── wrangler.toml   # Cloudflare Worker configuration
```

### Components Reference

| File | Role |
|---|---|
| `AppIcons.jsx` | Centralized icon registry (uses `lucide-react`) |
| `DecisionTree.jsx` | Interactive step-by-step decision tree |
| `DefinitionPopup.jsx` | Glossary term tooltip popup |
| `FullTextSection.jsx` | Renders a single legal text section with cite/link/bookmark + related tree callouts |
| `Header.jsx` | Top bar with section-aware toolbar (Summary, Full Text, Q&A, Reader, Print) |
| `Highlight.jsx` | Wraps matched text in highlight marks during search |
| `HubPage.jsx` | Home landing page with section cards |
| `InstallPrompt.jsx` | PWA install banner |
| `LandingPage.jsx` | Code section landing page with chapter grid |
| `Logo.jsx` | MedTech Europe SVG logo |
| `MainContent.jsx` | Main content area for the Code section |
| `QuizContent.jsx` | Main state controller for the Knowledge Quiz feature |
| `QuizConfig.jsx` | Setup screen for selecting quiz chapters and question count |
| `QuizResults.jsx` | Displays quiz score, review of incorrect answers, and share link |
| `QuizSession.jsx` | The interactive gameplay screen for answering questions |
| `Sidebar.jsx` | Collapsible navigation sidebar with search, bookmarks, and history |
| `TableOfContents.jsx` | Sticky "On This Page" minimap |
| `TreeContent.jsx` | Router for the Decision Trees section (landing / interactive / visualization) |
| `TreeLandingPage.jsx` | Grid of decision tree cards grouped by category |
| `TreeVisualization.jsx` | Full flowchart visualization of a decision tree |

---

## ⚙️ 1. Technical Architecture & Key Features

TheCodeApp is a multi-section platform with a custom-built architecture optimized for performance and offline reading.

### 🏠 Multi-Section Architecture

The app is organized into independently navigable **sections**, all accessible from a central **Home Hub**:

- **Home Hub** — A card-based landing page that links to each section.
- **The Code** — The full MedTech Europe Code of Ethical Business Practice reader.
- **Decision Trees** — Interactive compliance decision guides based on the Code.
- **Knowledge Quiz** — A testing module that challenges users with randomized multiple-choice questions on selected chapters.

The currently active section is tracked via `activeSection` state in `App.jsx` (`null` = Home, `'code'`, `'trees'`). Adding a new section (e.g. "Materials") requires only:
1. Adding an entry to `src/config/sections.js`.
2. Creating the content component.
3. Adding a conditional branch in `App.jsx`.

### 🧩 Hash-Routing & State (No React Router)
Instead of a heavy routing library, the app uses URL hash fragments (`#ch1-2-event-location-and-venue`) to track the exact section a user is viewing. The custom hook `useHashRouting.js` listens to these hashes, auto-detects which section the hash belongs to (e.g. hashes prefixed with `dt-` are routed to Decision Trees), and seamlessly scrolls the user directly to the content without reloading the page.

### 🔍 Dynamic Search Engine
The search bar lives in the `Sidebar`. It splits the user's query and counts matches across **titles, summaries, full legal texts, and Q&As**.
- Users can toggle **Advanced Search Filters** (Titles, Full Text, Q&As) to restrict precisely where the app hunts for matches.
- The sidebar auto-expands any collapsible groups that contain matches and shows per-group match counts.
- Highlighting is handled dynamically in `utils/textUtils.js` which wraps matching terms in a `<mark>` tag.
- Keyboard shortcut: Users can press `/` anywhere to immediately focus the search bar, or `Escape` to clear it.
- **Important:** Search is scoped to Code content only and intentionally does not search Decision Tree content.

### 📱 Progressive Web App (PWA) Offline Capabilities
This app caches all assets (via `vite-plugin-pwa`) so that traveling users can open the app without an internet connection.
- The installation logic relies on the `usePWAInstall.js` hook, which intercepts the browser's `beforeinstallprompt` and shows a custom install button. iOS requires manual installation via Safari's "Add to Home Screen" share action, which the UI explicitly handles.

### ⭐ Bookmarks & History
Users can save specific sections to a personalized **Bookmarks** group in the sidebar (via `useBookmarks.js`). Additionally, the app automatically tracks your last 5 visited chapters under the **Recently Viewed** group (via `useRecentHistory.js`). Both systems:
- Save data silently to `window.localStorage` so they persist without user accounts.
- Are **section-aware** — each bookmark and history entry stores which section it belongs to (`'code'`, `'trees'`, etc.) so cross-section navigation works correctly.

### 🗂️ Collapsible Sidebar Navigation
The sidebar uses a hierarchical, fully collapsible group structure:
- **Home Hub:** Bookmarks and Recently Viewed are expanded by default.
- **Code section:** "The Code" parent group expands automatically, revealing sub-groups (Introductory Chapters, Part 1: The Code, Part 2: Complaint Handling, Part 3: Annexes & Glossary, Website).
- **Decision Trees section:** The "Decision Trees" group expands, showing a "Browse Decision Trees" link.
- **Search mode:** When a search query is active, groups with matching chapters auto-expand. The prior expansion state is saved and restored when the search is cleared.

### 🌳 Decision Trees
Interactive compliance decision guides that let users step through real-world compliance scenarios:
- **Interactive Mode:** Question-by-question flow with contextual help text, path breadcrumb trail, go-back/reset controls, and color-coded outcomes (✅ Compliant, ❌ Non-Compliant, ⚠️ Conditional, ⚖️ Consult Legal).
- **Full Tree Visualization:** A flowchart rendering of the entire decision tree, with a legend and highlighted-path support.
- **Cross-linking:** Code chapters that have related decision trees show an inline amber callout with a direct link. Clicking it switches the user from the Code section to the relevant tree.

### 📚 Glossary & Definitions
The app automatically detects glossary terms within the legal text and renders them as interactive links. Clicking a term opens a `DefinitionPopup` tooltip with the glossary definition. The glossary map is extracted from the Glossary chapter at initialization and passed through all `FullTextSection` components.

### 📑 Reading Utilities
To facilitate heavy professional reference usage, the app includes several quality-of-life tools:
- **Table of Contents (On This Page):** A sticky, scroll-tracking minimap located on the right side of the screen on desktop displays.
- **Copy Citation:** Alongside standard URL linking, a dedicated `[Cite]` button instantly copies a professionally formatted citation block to the clipboard.
- **Copy Link:** A `[Link]` button copies the direct URL to the section.
- **Next/Prev Navigation:** Large footer buttons at the bottom of every document allow for linear reading of the entire legal code without returning to the sidebar.
- **Reader Settings:** An `Aa` button in the header opens a panel to customize font size, line spacing, and paragraph spacing.

### 🖨️ Print & Export Mode
The app features an optimized Print Mode. By pressing the **Print** icon in the header (or pressing `Ctrl+P`), the `index.css` `@media print` query strips away the Sidebar, Header, and interactive elements. It presents a clean, high-contrast, black-and-white view of the legal text — perfect for generating PDFs.

### 🛠️ Decap CMS & Cloudflare Worker Integration
The application uses **Decap CMS** for content management, accessible at `/admin/`.
- The CMS uses GitHub as its backend.
- A custom Cloudflare Worker (`server.js`) securely handles the GitHub OAuth flow required by Decap CMS to authenticate users. It implements HMAC-signed state tokens for CSRF protection.
- The `server.js` script also serves the static React application.

---

## 📝 2. How to Edit the Legal Content (`FULL_CODE_DATA`)

You can edit content directly in the JSON files or via the **Decap CMS** at `/admin/`.

All the text, chapters, annexes, and Q&As are stored in a single file:
👉 **`src/data/codeData.json`**

This file uses a format called JSON. It is essentially a massive list of chapters.

### Understanding the Structure
If you open `codeData.json`, you will see a list of objects that look like this:

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

### How to make changes:
1. **Fixing Typos:** Simply use `Ctrl+F` (or `Cmd+F`) in `codeData.json` to find the typo and change the text. Alternatively, use the CMS.
2. **Formatting Text:** The `legalText` and `a` (answer) fields use standard HTML.
   - Use `<strong>text</strong>` for bold.
   - Use `<em>text</em>` for italics.
   - Use `<ul><li>Item</li></ul>` for bulleted lists.
   - *Note: You can also use Tailwind CSS classes directly inside these HTML tags (e.g., `<p class="text-red-500">`).*
3. **Adding a new Q&A:** Find the correct `sections` block, go to its `"qas"` array, and add a new `{"q": "...", "a": "..."}` block. Make sure to separate it from the previous one with a comma!

*(Note: The file `src/data/codeData.js` simply imports this JSON file so the rest of the app can read it. You rarely need to touch the `.js` file).*

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

## 🏗️ 5. How to Add a New Section

The app is designed to be scalable. Adding an entirely new top-level section (like "Materials" or "Training") requires minimal changes:

1. **Register the section** in `src/config/sections.js`:
   ```js
   {
     id: 'materials',
     title: 'Materials',
     subtitle: 'Supplementary compliance resources',
     description: 'Download templates, checklists, and reference guides.',
     icon: 'Package',
     color: '#8b5cf6',
     available: true,
   }
   ```

2. **Create the content component(s)** in `src/components/` (e.g. `MaterialsContent.jsx`).

3. **Wire it into `App.jsx`:**
   - Import the component.
   - Add a conditional branch in the main rendering logic:
     ```jsx
     ) : activeSection === 'materials' ? (
       <MaterialsContent ... />
     ) : (
     ```

4. **Update hash routing** in `useHashRouting.js` if your section uses hash-based navigation (add a prefix check like `mat-`).

That's it — the Home Hub and Sidebar will automatically pick up the new section from the registry.

---

## 🎨 6. How to Edit Styles and Colors

This app uses **Tailwind CSS** for styling. This means you won't find traditional `.css` files full of styling rules. Instead, styles are applied directly to elements using "utility classes".

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
| Teal | `#0099A7` | Code section accent (breadcrumbs, citations, links) |
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
| `Escape` | Clear the search bar |
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
| `@google/genai` | ^1.29.0 | Integration with Google Generative AI |

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
If connected to GitHub, push your changes:
1. Save your files.
2. Run the following commands in your terminal:
   ```bash
   git add .
   git commit -m "Describe what you changed here"
   git push
   ```
3. Cloudflare will automatically detect the change and deploy the updated Worker.
Alternatively, you can manually deploy using `npx wrangler deploy`.

### Other useful commands:
| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Create a production-optimized build |
| `npm run preview` | Preview the production build locally |
| `npm run clean` | Delete the `dist/` folder |
| `npm run lint` | Run TypeScript checks without emitting files |

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
```

---

## 🔒 12. Security Notes

- All HTML in `legalText` and Q&A answers is sanitized through **DOMPurify** before rendering. This prevents cross-site scripting (XSS) even if someone injects malicious code into the JSON content.
- The app uses a custom OAuth proxy via Cloudflare Workers (`server.js`) with HMAC-signed state tokens for CSRF protection.
- No user data is sent to any server. Bookmarks and history are stored exclusively in `localStorage`.
