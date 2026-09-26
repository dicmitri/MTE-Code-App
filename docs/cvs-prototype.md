# Live CVS lookup prototype

Open `/prototypes/cvs` in the existing app. This isolated demo is deliberately
absent from the Home Hub and production sponsorship trees. Enter an event name,
optionally narrow by country and dates, search, then select an event to retrieve
its current overall status. No account or EMT input is required.

## Run locally

Run `npm run dev:worker` and visit
`http://127.0.0.1:8787/prototypes/cvs`. This builds React and serves both the app
and API through the existing Worker. Alternatively, run `npm run dev` alongside
the local Worker; Vite forwards `/api/cvs` to port 8787. Vite alone cannot serve
the CVS API. The browser always uses same-origin app endpoints.

The lookup requires internet access. Existing D1 bindings are unrelated; this
prototype never reads or writes them. No new framework or dependency is added.

The existing Worker SPA fallback now fetches `/` internally instead of
`/index.html`: the assets binding redirects the latter to Home, which was
discarding deep-link paths. This correction is covered for the demo and existing
Code, Transparency, Tree, Quiz and TPPT paths.

## Integration contract

- `POST /api/cvs/search`: `{ "name": "Heart", "country": "Belgium", "from": "", "to": "" }`.
  Dates, when provided, are valid `YYYY-MM-DD` values; the adapter converts them
  to the observed CVS `dd-mm-yyyy` form format.
- Search returns transient `results` containing EMT ID, name, start/end date,
  city, country, raw search status (or `null`), and the authoritative detail URL.
  `retrievedAt` records the fetch time. `mayBeLimited` warns at the observed
  50-result boundary; it is not a total count. Refine a broad search instead of
  crawling more results.
- `GET /api/cvs/events/EMT-26-11175` fetches the selected event's detail page and
  returns `{ emtId, name, status: { raw }, detailUrl, retrievedAt }`.
- Both success and error responses use `Cache-Control: no-store`. Errors have
  `{ error: { code, message } }`; they never assign a compliance status.

One search makes one public GET to obtain the form token/session cookies, then
one form POST. Selection makes one detail GET. There are no retries, background
requests, pagination crawls, synchronization, database writes, localStorage
records, or result caches. An explicit refresh checks the selected status again.
Tokens and cookies exist only during the Worker search request and are never
returned to the browser or saved in fixtures. The public form itself includes
a large EMT dropdown; its contents are discarded, not imported as a dataset.

## Parsing contract and failure boundaries

`cvs-parser.js` centralizes selectors and labels inspected against the public
CVS site on 2026-09-26. It uses Workers' native `HTMLRewriter`, collects complete
text chunks, checks the results heading against the parsed cards, verifies EMT
identity against the link/title or requested detail ID, and fails for inconsistent
markup. It decodes common/Latin-1 named entities and numeric Unicode entities;
an unsupported named entity produces a visible parsing error instead of corrupted
identity/status text. All rendered upstream text uses React text nodes.

The search card's status includes internal annotations, for example
`Compliant (Final assessment by CO) (41)`. The detail page's specifically labeled
`Overall status of event:` is `Compliant` for that example. This prototype
preserves both strings as returned, and displays the detail status after
selection. It never substitutes an individual criterion badge, invents a status
enum, or interprets legal meaning. A status is current at its displayed retrieval
time and may subsequently change.

`cvs-adapter.js` owns HTTP/session handling, an identifiable User-Agent, a
20-second budget for each operation (including response bodies), a 5 MiB HTML
limit, input validation, and fixed supplier URLs. Redirects, non-HTML responses,
missing tokens, unavailable pages, changed structures, and missing overall status
are explicit technical failures. Browser requests cancel when searches/selections
change or the demo closes; older responses cannot overwrite a newer selection.

This proves a bounded HTML integration, not a supported supplier API or an uptime
guarantee. Recheck the contract if IQVIA changes its site. Supplier permission,
production traffic policy/rate limits and edge deployment verification should be
settled before integrating this into a production sponsorship workflow.

## Checks

`node --test tests/cvs.test.mjs tests/routeUtils.test.mjs` runs offline parsing,
HTTP/session, API, and route tests. It uses the real HTMLRewriter in the Miniflare
runtime already supplied by the pinned Wrangler development dependency. Fixtures
are minimal contract snippets with a synthetic token; ordinary tests never call CVS.

With the Worker running, explicitly run a narrow live smoke check:

```powershell
node scripts/check-cvs-live.mjs --name "Heart" --country Belgium --select 1
```

Optional `--from`, `--to`, and `--base` arguments narrow the dates or target a
different running app. `--select` is the 1-based result number. A single result
is selected automatically; multiple results otherwise require explicit selection.

Manually check name-only search, multiple and empty matches, optional dates,
selection/refresh, offline errors, keyboard selection, mobile layout, Back/Forward
and print. Print hides the form/result controls and retains the selected event,
retrieved status and timestamp. Do not interpret an empty result or technical
failure as a substantive CVS status.

Live local-Worker checks on 2026-09-26 returned two Belgian matches for `Heart`,
one match when narrowed to November 2026, and a recognized empty result for a
deliberately unmatched name. A name-only lookup also found the 20th Belgian
Heart Rhythm Meeting. Selecting EMT-26-11175 retrieved the overall status
`Compliant`. These checks establish feasibility for the observed HTML contract;
the prototype has not been deployed to the production Cloudflare edge.

The build, type checks and focused CVS/routing tests passed. The full suite still
has the existing Windows CRLF-sensitive glossary assertion documented as A09 in
`ranked_changed.md`; this prototype leaves that unrelated test unchanged.

## Removal

Remove the demo component/App branch, prototype path builder/parser case and
route test and Routing guide entry; remove the three root CVS modules and server routing branch; remove
the Vite CVS proxy, PWA API exclusion if no other API needs it, and Wrangler CVS
`run_worker_first` patterns; remove the CVS fixtures/tests, manual script and this
guide. No content data or production tree changes need to be reversed.
Keep the independently tested SPA fallback correction if retaining current
Workers static-asset handling.
