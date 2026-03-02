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
 ├── /utils/         # Helper functions (like the search highlight logic)
 ├── App.jsx         # The main "brain" that connects everything together
 └── index.css       # Global styles and fonts
```

---

## 📝 1. How to Edit the Legal Content (`FULL_CODE_DATA`)

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

## 🎨 2. How to Edit Styles and Colors

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

## 🖼️ 3. How to Edit Logos and Icons

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

## 🚀 4. How to Preview and Publish Your Changes

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
