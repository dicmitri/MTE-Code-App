# Historical Declarations D1 data

- `schema.sql` — D1 schema.
- `seed.sql` — full rehearsal dataset (real company/beneficiary names,
  no PII). Placeholder until the final Algolia export is ready; same
  schema, so swapping it in later needs no code changes.
- `seed.sample.sql` — 100-declaration sample with company and
  beneficiary/HCO names replaced by clearly-fake placeholders
  (`... (test data)`), for local testing without real names. Regenerate
  with `python3 scripts/build-sanitized-d1-sample.py`. See that script's
  docstring for what it does and doesn't sanitize (addresses and one
  legacy data-quality outlier still carry real identifying text in a
  few rows).

## Testing locally (no Cloudflare account needed)

`wrangler dev`'s local D1 mode runs entirely offline against a local
SQLite file — no `wrangler login` or real `database_id` required.

```bash
npx wrangler d1 execute historical-declarations --local --file=d1/historical-declarations/schema.sql
npx wrangler d1 execute historical-declarations --local --file=d1/historical-declarations/seed.sample.sql
npm run build
npx wrangler dev --local --port 8787
```

Then open http://localhost:8787/transparency/historical-declarations, or:

```bash
curl "http://localhost:8787/api/historical-declarations/metadata"
curl "http://localhost:8787/api/historical-declarations/search?q=Meridian"
```

To reset local state: `rm -rf .wrangler/state/v3/d1` and re-run the two
`wrangler d1 execute` commands above.

## Going live

1. `npx wrangler d1 create historical-declarations` (needs a real
   Cloudflare account) and put the returned `database_id` into
   `wrangler.toml`, replacing the placeholder.
2. Load the real data: `npx wrangler d1 execute historical-declarations --remote --file=d1/historical-declarations/seed.sql`
   (or the final export, once ready, at the same path/schema).
3. Deploy.
