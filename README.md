# TheCodeApp - MedTech Europe Code of Ethical Business Practice

This application is a digital, highly searchable, and installable version of the MedTech Europe Code of Ethical Business Practice. 

## 📁 Folder & File Structure

Here is a bird's-eye view of the project's files and folders. Don't worry if it looks like a lot; we will break down what each part does below!

```text
/ (Root Directory)
├── public/                     # Publicly accessible files (icons, PWA setup)
│   ├── icons/                  # App icons for mobile and desktop installation
│   ├── manifest.json           # Tells the browser this app can be installed
│   └── service-worker.js       # Allows the app to work offline
├── src/                        # The main source code (where the magic happens)
│   ├── components/             # Reusable visual building blocks (UI)
│   │   ├── AppIcons.jsx        # All the little icons (home, search, menu, etc.)
│   │   ├── DefinitionPopup.jsx # The popup that shows when you click a glossary term
│   │   ├── FullTextSection.jsx # Displays the actual legal text and Q&As
│   │   ├── Highlight.jsx       # Highlights text in yellow when you search
│   │   ├── LandingPage.jsx     # The home screen with all the chapter cards
│   │   └── Logo.jsx            # The app's logo
│   ├── data/                   # The actual content of the app
│   │   └── codeData.jsx        # The massive file containing all chapters, text, and Q&As
│   ├── hooks/                  # Behind-the-scenes logic helpers
│   │   └── useDebounce.js      # Makes search faster by waiting until you stop typing
│   ├── utils/                  # Helper functions for text processing
│   │   └── textUtils.js        # Code that finds glossary terms and makes them clickable
│   ├── App.jsx                 # The main layout (Sidebar, Header, Content Area)
│   ├── index.css               # The design styles, colors, and fonts
│   └── main.jsx                # The starting point that loads the app into the browser
├── index.html                  # The main web page that loads everything else
├── package.json                # A list of external tools and libraries the app uses
└── vite.config.ts              # Settings for the tool that builds the app (Vite)
```

---

## 🧩 What Does Everything Do?

Think of the app like a house. Here is how the different parts construct that house:

### 1. The Foundation (`index.html`, `src/main.jsx`, `package.json`)
*   **`index.html`**: This is the front door. When a user visits the website, this is the very first file their browser reads. It sets up the basic page and loads the React application.
*   **`src/main.jsx`**: This is the foundation layer. It takes the entire React application (from `App.jsx`) and injects it into `index.html`.
*   **`package.json`**: This is the blueprint's material list. It tells the system what external libraries (like React, Tailwind CSS) need to be downloaded for the app to work.

### 2. The Frame & Layout (`src/App.jsx`, `src/index.css`)
*   **`src/App.jsx`**: This is the core of the application. It acts as the "traffic controller." It manages the sidebar navigation, the top header (with the Summary/Full Text/Q&A toggles), the search bar, and decides which chapter to show on the screen.
*   **`src/index.css`**: This handles the interior design. It defines the colors (like the specific purple and teal), the fonts (Inter for the app, Georgia for the legal text), and the reader settings (font size, line spacing).

### 3. The Content (`src/data/codeData.jsx`)
*   **`src/data/codeData.jsx`**: **If you need to update the text of the Code, this is where you go.** It is a large data file containing all the chapters, summaries, legal texts, and Q&As structured in a way the app can read and display.

### 4. The Building Blocks (`src/components/`)
Instead of writing the same code over and over, we use "Components" (like Lego bricks) to build the interface:
*   **`LandingPage.jsx`**: The welcome screen you see when you first open the app.
*   **`FullTextSection.jsx`**: The component responsible for rendering a specific section of legal text. It also handles showing the Q&As at the bottom of the section.
*   **`DefinitionPopup.jsx`**: The little window that pops up when you click a highlighted glossary term.
*   **`Highlight.jsx`**: A tiny helper that wraps matching search words in a yellow background.
*   **`AppIcons.jsx`**: A collection of all the SVG graphics (icons) used in the app.

### 5. The Brains & Helpers (`src/hooks/`, `src/utils/`)
*   **`useDebounce.js`**: When you type in the search bar, searching instantly on every single keystroke would freeze the app. This "debounce" hook waits until you stop typing for a split second (300 milliseconds) before running the heavy search.
*   **`textUtils.js`**: This file contains smart functions that read through the text, find words that match the Glossary, and automatically turn them into clickable purple links.

### 6. The "App" Experience (`public/`)
This app is a **Progressive Web App (PWA)**, meaning it can be installed on a phone or computer just like a native app from the App Store.
*   **`manifest.json`**: Tells the phone/computer the name of the app, what colors to use for the top bar, and where to find the app icons.
*   **`service-worker.js`**: A script that runs in the background. It saves (caches) the app's files to your device so the app can load instantly and even work without an internet connection!

---

## 🛠️ How to Make Changes

If you want to modify the app, here is a quick guide on where to look:

*   **To change the legal text, add a Q&A, or fix a typo:** Open `src/data/codeData.jsx`.
*   **To change the app's colors or default font sizes:** Open `src/index.css`.
*   **To modify the sidebar or top navigation bar:** Open `src/App.jsx`.
*   **To change the app's name or icon on mobile devices:** Update `public/manifest.json` and replace the images in `public/icons/`.

## 🚀 Running the App Locally

If you are a developer looking to run this on your own machine:

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Build for production: `npm run build`
