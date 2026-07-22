# Hooks

This directory contains custom React hooks that encapsulate shared business logic and side effects, such as browser-history routing, PWA installation lifecycle, and localStorage persistence for bookmarks and history. `useAppRouting.js` is the single UI-facing navigation controller and supports canonical paths, Code section anchors, legacy hashes, and browser Back/Forward events.

Routing behavior and compatibility requirements are documented in the [URL Routing Guide](../../ROUTING.md).

For more details on how these hooks drive the application state, see the [Project Map](../../AGENTS.md#project-map).
