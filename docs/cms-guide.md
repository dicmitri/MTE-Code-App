# Content Manager Guide

The Content Manager edits the same JSON files used by the app. It does not keep
a second copy of the content.

## Choose The Correct Mode

There are two deliberately separate modes.

### Edit This Local Working Copy

Use this while developing or reviewing changes that have not been merged into
GitHub `main`.

1. Open PowerShell or Terminal in the app root folder.
2. Run:

   ```powershell
   npm run cms
   ```

3. Keep that terminal open.
4. Open `http://localhost:3000/admin/`.
5. Select **Login**. Local mode does not require GitHub credentials.

This command starts both the app on port `3000` and the local content proxy on
port `8081`. Press `Ctrl+C` in the terminal when finished.

If the app is already running with `npm run dev`, leave it running and start the
content proxy in a second terminal:

```powershell
npm run cms:proxy
```

If the local CMS shows no entries, the content proxy is not running. Starting
only `npm run dev` is not enough for local CMS editing.

### Edit Published GitHub Content

The deployed `/admin/` page uses GitHub and reads the `main` branch. Select
**Login with GitHub** there. It cannot display local files or uncommitted work.

The split chapter entries will therefore appear in the hosted CMS only after
the split files and CMS configuration have been committed, merged into `main`,
and deployed.

## Edit A Code Chapter

1. Open **The Code - Chapters**.
2. Select the chapter.
3. Open the required section.
4. Use **Edit** to change the stored HTML string.
5. Use **Preview** to inspect the rendered result.
6. Publish the change.
7. From the app root, run:

   ```powershell
   npm run validate:data
   ```

The editor passes the HTML string through unchanged. It does not convert it to
Markdown or automatically reformat it. The preview runs in a sandbox and does
not alter the stored value.

Chapter IDs, navigation groups and icons are hidden because routine text edits
must not change them. The CMS also prevents adding, deleting or reordering Code
sections and Q&As. A section-title warning remains visible because changing a
section title can change its public URL.

## Edit A Decision Tree

Open **Decision Trees**, then **All Decision Trees**. The editor uses the full
page; the previous generated text preview is disabled.

Decision Trees remain structurally editable because maintainers may need to add
nodes and options. Treat these fields carefully:

- Tree ID controls the tree route.
- Node ID identifies a destination inside the tree.
- Next Node ID must exactly match an existing Node ID in the same tree.

After every Decision Tree change, run `npm run validate:data`. It checks tree
targets and reports the exact location of broken references.

## Before A Release

Run the complete project check:

```powershell
npm run check
```

This validates all content, runs the route and content tests, checks TypeScript,
and creates a production build.
