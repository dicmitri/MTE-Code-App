# Scratch Files

`analyze_agendas.js` is the maintained TPPT parser verification utility described
in the project README.

The older Code/PDF comparison and mutation scripts in this folder are historical
artifacts from work on the deleted `src/data/codeData.json` monolith. They use
weak normalization or hard-coded paths and must not be used to edit or certify
the current chapter files.

Use these maintained commands instead:

```powershell
npm run validate:data
npm run verify:code-migration
python scripts/audit-code-pdf.py --output docs/content-migration/code-pdf-audit.json
```

The first command is for routine content edits. The second is the immutable 2026
split proof. The third performs the current read-only PDF comparison.
