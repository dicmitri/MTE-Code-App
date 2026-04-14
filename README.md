# The Code App - Developer & Editor Guide

Welcome to the repository for **The Code App** (MedTech Europe Code of Ethical Business Practice Reader). 

This guide is written specifically for anyone who needs to update the content, change the branding, or tweak the styles, even if you have **never looked at the code before**.

---

## 📁 App Structure Overview

The app is built using **React** and **Vite**. All the important files you will ever need to edit live inside the `src/` (source) folder:

```text
/src
 ├── /components/    # The building blocks of the UI (Buttons, Header, Sidebar, etc.)
 ├── /data/          # The actual text/content of the legal code
 ├── /hooks/         # Custom React hooks (logic for PWA, bookmarks, routing, keyboard)
 ├── /utils/         # Helper functions (like the search highlight logic)
 ├── App.jsx         # The main "brain" that connects everything together
 └── index.css       # Global styles and fonts
```

---

## ⚙️ 1. Technical Architecture & Key Features

TheCodeApp uses a custom-built architecture optimized for performance and offline reading:

### 🧩 Hash-Routing & State (No React Router)
Instead of a heavy routing library, the app uses URL hash fragments (`#part1-section-1`) to track the exact section a user is viewing. The custom hook `useHashRouting.js` listens to these hashes and seamlessly scrolls the user directly to the section without reloading the page. 

### 🔍 Dynamic Search Engine
The search bar lives in the `Sidebar`. It splits the user's query and counts matches across **titles, summaries, full legal texts, and Q&As**.
- Users can toggle **Advanced Search Filters** ("Titles", "Full Text", "Q&As") to restrict precisely where the app hunts for matches.
- Highlighting is handled dynamically in `utils/textUtils.js` which wraps matching terms in a `<mark>` tag.
- Keyboard shortcut: Users can press `/` anywhere to immediately focus the search bar, or `Escape` to clear it.

### 📱 Progressive Web App (PWA) Offline Capabilities
This app caches all assets (via `vite-plugin-pwa`) so that traveling users can open the app without an internet connection. 
- The installation logic relies on the `usePWAInstall.js` hook, which intercepts the browser's `beforeinstallprompt` and shows a custom install button. iOS requires manual installation via Safari's "Add to Home Screen" share action, which the UI explicitly handles.

### ⭐ Bookmarks & History
Users can save specific sections to a personalized "Bookmarks" tab in the sidebar (via `useBookmarks.js`). Additionally, the app automatically tracks your last 5 visited chapters under the **Recently Viewed** list (via `useRecentHistory.js`). Both systems save data silently to `window.localStorage` so they persist without user accounts.

### 📑 Reading Utilities
To facilitate heavy professional reference usage, the app includes several quality-of-life tools:
- **Table of Contents (On This Page):** A sticky, scroll-tracking minimap located on the right side of the screen on desktop displays.
- **Copy Citation:** Alongside standard URL linking, a dedicated `[Cite]` button instantly copies a professionally formatted citation block to the clipboard.
- **Next/Prev Navigation:** Large footer buttons at the bottom of every document allow for linear reading of the entire legal code without returning to the sidebar.

### 🖨️ Print & Export Mode
The app features an optimized Print Mode. By pressing the **Print** icon in the header (or pressing `Ctrl+P`), the `index.css` `@media print` query strips away the Sidebar, Header, and interactive elements. It presents a clean, high-contrast, black-and-white view of the legal text—perfect for generating PDFs.

---

## 📝 2. How to Edit the Legal Content (`FULL_CODE_DATA`)

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
1. **Fixing Typos:** Simply use `Ctrl+F` (or `Cmd+F`) in `codeData.json` to find the typo and change the text.
2. **Formatting Text:** The `legalText` and `a` (answer) fields use standard HTML. 
   - Use `<strong>text</strong>` for bold.
   - Use `<em>text</em>` for italics.
   - Use `<ul><li>Item</li></ul>` for bulleted lists.
   - *Note: You can also use Tailwind CSS classes directly inside these HTML tags (e.g., `<p class="text-red-500">`).*
3. **Adding a new Q&A:** Find the correct `sections` block, go to its `"qas"` array, and add a new `{"q": "...", "a": "..."}` block. Make sure to separate it from the previous one with a comma!

*(Note: The file `src/data/codeData.js` simply imports this JSON file so the rest of the app can read it. You rarely need to touch the `.js` file).*

---

## 🎨 3. How to Edit Styles and Colors

This app uses **Tailwind CSS** for styling. This means you won't find traditional `.css` files full of styling rules. Instead, styles are applied directly to elements using "utility classes".

### Where to find styles:
If you want to change how a specific part of the app looks, you need to find its corresponding component in the `src/components/` folder.

For example, to change the top navigation bar, open `src/components/Header.jsx`. You will see code like this:
```jsx
<header className="h-16 flex-none border-b border-gray-200 bg-white">
```
- `h-16` means height: 4rem.
- `border-b` adds a bottom border.
- `bg-white` makes the background white.

### How to change colors:
Tailwind has a built-in color palette. If you want to change a blue button to a purple button, you simply change `bg-blue-600` to `bg-purple-600`.
- Text color: `text-slate-800`, `text-red-500`, etc.
- Background color: `bg-slate-100`, `bg-teal-50`, etc.
- *Tip: You can find all available colors at [tailwindcss.com/docs/customizing-colors](https://tailwindcss.com/docs/customizing-colors).*

### Global Styles:
If you need to change the **font family** or the background color of the entire website, look in:
👉 **`src/index.css`**

---

## 🖼️ 4. How to Edit Logos and Icons

### The Main Logo
The main MedTech Europe logo (seen in the Header and on the Landing Page) is controlled by a single file:
👉 **`src/components/Logo.jsx`**

If you open this file, you will see an `<svg>` tag. This is the vector graphic of the logo. 
- **To change the logo:** You can replace the `<svg>...</svg>` block with a new SVG code, OR you can replace it with a standard image tag like `<img src="/my-new-logo.png" alt="Logo" />` (if you do this, place the image file in the `/public/` folder).
- **To change the text next to the logo:** You will see the text "MedTech Europe" and "from diagnosis to cure" right inside this file. You can edit them directly.

### Other Icons
The icons used in the sidebar and throughout the app (like the menu icon, search icon, or document icons) are stored in:
👉 **`src/components/AppIcons.jsx`**

This file uses a library called `lucide-react`. If you want to change an icon, you can go to [lucide.dev/icons](https://lucide.dev/icons), find the name of the icon you want, and update it in `AppIcons.jsx`.

---

## 🚀 5. How to Preview and Publish Your Changes

Once you have made your edits, you'll want to see them and publish them.

### To preview on your computer:
1. Open your terminal in the project folder.
2. Run `npm install` (you only need to do this once).
3. Run `npm run dev`.
4. Open the `http://localhost:3000` link provided in the terminal. The app will automatically update as you save files!

### To publish to the live website (Cloudflare Pages):
If your project is connected to GitHub:
1. Save your files.
2. Run the following commands in your terminal:
   ```bash
   git add .
   git commit -m "Describe what you changed here"
   git push
   ```
3. Cloudflare will automatically detect the change and update the live website within 2-3 minutes!
