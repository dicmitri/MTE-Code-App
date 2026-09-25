@AGENTS.md

<!--
Keep the import above. Once a CLAUDE.md exists, Claude Code reads it instead of
AGENTS.md, so without the import Claude would lose the project instructions.
Put rules for every agent in AGENTS.md and only Claude-specific notes here.
The hard rule below repeats the one in AGENTS.md in brief; keep the two in step.
-->

## Hard Rule: Propose a Version History Update Before Every Push

Before you commit and push, propose a draft update to the in-app Version History (`src/data/code/changelog.json`) and wait for the user's approval or edits. Cover only user-facing changes, in plain language. Mention an architectural or technical change only when users notice its effect, and describe that effect, not the mechanism. If nothing user-facing changed, say so in one line instead. The full rule is under Hard Rules in AGENTS.md.
