# Hooks

This directory contains custom React hooks that encapsulate shared business logic and side effects, such as browser-history routing, PWA installation lifecycle, and localStorage persistence for bookmarks and history. `useAppRouting.js` is the single UI-facing navigation controller and supports canonical Code and Transparency paths, publication section anchors, legacy Code hashes, and browser Back/Forward events. It cancels pending anchor-scroll and highlight work whenever a newer route wins. Bookmark and history entries include their publication namespace so Code and standalone documents cannot collide.

Routing behavior and compatibility requirements are documented in the [URL Routing Guide](../../ROUTING.md).

For more details on how these hooks drive the application state, see the [Project Map](../../AGENTS.md#project-map).
