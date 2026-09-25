# Browser verification — 2026-09-25

Verified against the isolated local app on `127.0.0.1:5179`, after the final 208-group expansion. Browser checks used the normal app controls in the Codex in-app browser.

- Code search `background check`: three authoritative results; Third Party Intermediaries first; explanation identifies due diligence; snippet and reader highlight the expansion. Tab from the last filter reaches the first result; Enter opens `/code/ch10#ch10-section-0`.
- `paper trail`: interpreted as documentation/records without the old payer/train correction. Verification Documents is second; app content is shown separately.
- `Q&A 31`: one direct result; keyboard activation opens `/code/ch4#ch4-3-educational-grants-qa-3` and enables the Q&A reader view. Screenshot inspection confirmed the correct answer is visible and readable.
- Opened the glossary definition dialog from reader text and closed it with Escape; search navigation continued to work.
- Switched through the Transparency publication navigation to the October 2025 Disclosure Guidelines. The search label changed to Search Transparency publications.
- `publication deadline`: Time of Disclosure first, with the correct Guidelines wording and an explanation of time of disclosure/time of publication. Keyboard activation opened `/transparency/disclosure-guidelines/dg-chapter-3#dg-chapter-3-2-time-of-disclosure`. Screenshot inspection confirmed heading highlighting, result focus, explanation layout, and reader text.
- No browser console errors were captured.

No UI markup or print styles were added. Existing reader/search print treatment is unchanged; a print-dialog/PDF export was not exercised. The pre-existing offline bundle issue remains outside this search change and is recorded in `ranked_changed.md`.

The dev server reloaded while editorial JSON files were being written; those reloads cleared transient search input during the session. The completed checks above were repeated after the reload and verified from the resulting route and displayed content.
