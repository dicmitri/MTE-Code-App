# Components

This directory contains the React components that build the UI of The Code App. It includes layout components (Header, Sidebar), section-specific content managers, and interactive features like decision trees and glossary popups.

`DocumentReader.jsx` is the shared long-form reader used by `MainContent.jsx` for
the Code and by `TransparencyContent.jsx` for standalone Transparency
publications. `TransparencyLandingPage.jsx` provides the publication/document
overview levels. `CsvTemplatePreview.jsx` renders the local Annex I CSV as a
clearly labelled convenience preview; it must not be treated as normative
Disclosure Guidelines content. Transparency passes the `transparency-reader`
root class to `DocumentReader`; keep standalone-publication table defaults scoped
to that class so they cannot override the Code annexes' Tailwind-authored tables.

For more details on how these components interact with the rest of the application, see the [Project Map](../../AGENTS.md#project-map).
