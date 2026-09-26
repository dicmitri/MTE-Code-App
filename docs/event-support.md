# Event support tool

Implemented on `codex/event-support`, 26 September 2026. Canonical route:
`/event-support`. The Home Hub and persistent navigation both open the tool.
This guide records the implemented coverage and the boundaries of its answers.

## Use locally

Run `npm run dev:worker` and open
[the event-support tool](http://127.0.0.1:8787/event-support). The Worker serves
the app and the same-origin CVS endpoints. The implementation review used
`http://127.0.0.1:8788/event-support` to avoid a previous local preview's cached
app assets. Nothing has been deployed.

Choose the company's actual proposal, answer the relevant event questions,
confirm its conditions, identify the event in CVS where relevant, then obtain
the specific answer. Only afterward does the tool offer other support options.
Selecting an alternative keeps shared event facts, but clears its recipient,
expenses and conditions for reconfirmation. A mixed package needs separate
assessments for its educational and commercial elements.

Answers and agendas remain in memory; there is no account, saved assessment,
HCP-name collection or local CVS database. A reload starts a new assessment.
PDF agendas are processed locally. CVS name/country/date filters are sent to
the existing public CVS service through the Worker; no assessment answers or
agenda files are sent to CVS.

## Coverage inventory

The baseline is the published September 2024 Code stored in the existing
canonical chapter JSON. Derived questions, matrices and condition labels are
in `src/data/eventSupportRules.json`, version `2026-09-26.1`. The normative
chapter files are unchanged. Result citations resolve to their generated
section anchors; official operational TPPT guidance is separately labelled.

| Scenario | Implemented position and checks | Sources |
| --- | --- | --- |
| Conference support | General-running, attendance and faculty grants; satellite services; staff attendance; booths/advertising; direct delegate and main-faculty support. All eight rows across all four settings are represented and tested. | Annex I, its footnotes, Chapters 1, 2 and 4 |
| Direct HCP support | Faculty/services versus delegates, including poster presenters; conference, satellite, booth, TPPT, company training and business meetings; stand-alone versus congress-related settings. All 16 Annex VI cells are tested. | Annex VI; Chapters 2, 3 and 5 |
| Expenses | Fees, registration, travel, accommodation and meals are assessed separately. Satellite access/prorating, duplicate grant support, incremental congress expenses and virtual participation restrictions are included. | Chapters 1, 3 and 5; relevant Q&As |
| Procedure training | Shared agenda calculator plus procedure-skills purpose, clinical setting, stand-alone training and active-station criteria. Streamed practical sessions need following hands-on exercises. Cancelled/virtual hands-on programmes receive the limited changed-event treatment. | Annex VII; Chapter 2; [current CVS training guidance](https://www.ethicalmedtech.eu/conference-vetting-system/third-party-procedure-training/) checked 26 September 2026 |
| Company events | Product/procedure/educational training, business meetings and consulting meetings; genuine purpose and services, congress overlap, non-portable-equipment business-meeting exception. | Chapter 3, Annex VI, Chapter 5 |
| Grants and recipients | HCO/PCO/other recipients, payment routes, independent beneficiary selection, identifiable beneficiaries, mixed packages, contract/use safeguards and individual-organiser risks. | Chapter 4 and Q&As; Chapter 2 Q&A on individual organisers |
| General event conditions | Programme, venue, location/season, guests/entertainment, hospitality/travel, transparency and local requirements. In-person, virtual and hybrid distinctions are included. | Chapter 1 |
| Related support | Individual-organiser in-kind arrangements, meals, educational/promotional items, demonstration products versus samples, clinical use, proctorships/preceptorships and intermediaries. | Chapters 2, 5, 8, 9 and 10 |
| Scope and non-event arrangements | Event/HCP/HCO geography and company applicability; charitable donations, research funding and royalties receive linked dedicated-provision handoffs. | Scope, Annex III, Chapters 4, 6 and 7 |

The existing Annex I decision tree was also reconciled: its direct-conference
sponsorship results state the prohibition clearly and separately from CVS.

## CVS evidence and the national-audience warning

CVS requirement, current CVS evidence and Code permission are separate fields.
A positive CVS decision does not permit a prohibited activity. Company staff
attendance still requires its own internal review. An unsuccessful search or
an unavailable service provides no confirmed exemption.

For a third-party event with a **no cross-country HCP-delegate** answer and a
matched CVS record, the requested scope warning appears unless the entire
overall status equals one of these two labels:

- `Not assessed - Out of scope`
- `Not assessed - National event`

Comparison ignores case and repeated/outer whitespace only. Pending,
pre-cleared, other not-assessed labels and unrecognised statuses retain the
warning and the risk of a later negative assessment. A negative decision says
that it is already recorded; a positive decision states its current position
while retaining the scope discrepancy. The raw overall status, event identity,
retrieval time and official CVS link are shown.

Search/filter changes clear old evidence. Requests are cancelled and checked
against their identity so late responses cannot replace a newer selection.
Selecting a different event clears its dependent answers and conditions;
refreshing the same event preserves them. The tool refreshes selected evidence
before showing or printing an answer. A failed refresh removes the previous
accepted status and leaves the result unresolved.

## Explicit review boundaries

The tool reports conditional Code positions rather than company approval.
Unknown facts and unconfirmed conditions cannot count as satisfied. Uncertain
classifications, mixed geography, Mecomed requirements, ambiguous recipients,
individual-organiser support, hybrid components and overlapping benefits are
sent for internal review instead of being assigned a guessed exemption.

The tool does not independently establish whether a venue, consulting fee,
selection criterion or national-law arrangement satisfies the Code. The user
confirms those conditions and the answer records that confirmation. Mecomed's
current territorial rules are not reduced to an unverified country list.
Research, royalties and charitable donations require their dedicated provisions.
This coverage needs content-owner review before a production release.

## Architecture and verification

`eventSupportRules.js` is the deterministic evaluator. `eventSupportQuestions.js`
controls conditional questions and invalidation, and `eventSupportConditions.js`
selects applicable conditions. `EventSupportContent.jsx` owns transient state.
The shared `useCvsLookup` hook and `CvsEventLookup` component serve both this
tool and the retained `/prototypes/cvs` demo. The existing CVS parser/adapter
and Worker endpoints remain the source of live evidence.

TPPT ingestion uses the existing parser and extraction modules. The shared
calculator now rejects negative/non-finite/invalid durations or unrecognised
session categories, and the existing TPPT screen blocks invalid results and
exports. Its separate PDF-report wording issue is not reused by this tool.

`npm run check` passes: content/source validation, 160 tests, TypeScript checks,
production build and byte-exact Disclosure asset/precache verification. The 78
event-support tests include the two baseline matrices and additional scope,
CVS, expense, recipient, programme-change, unknown-answer and stale-request
cases. The Windows glossary test also normalises line endings while preserving
its wiring assertions.

Browser verification covers the specific proposal flow, live event selection,
the national/positive-status warning, answer editing, alternatives and desktop
and 390px mobile layouts. Printing uses the existing print stylesheet: controls
and navigation are hidden, and the answer, evidence, sources and facts remain.
Physical printing and pagination across different printer drivers are not
verified by the browser automation.

Before release, repeat these manual checks:

1. Open `/event-support` directly, reload, and navigate via Home/sidebar and
   browser Back/Forward. Existing Code, Transparency and tree links must work.
2. Check a national booth or grant proposal against a pending CVS event; verify
   the scope/possible-negative warning. Test both exact exemption labels too.
3. Select another event and reconfirm details. Refresh the same event, then
   simulate a failed lookup; old evidence must not be represented as current.
4. Check direct conference delegate/main-faculty support against positive CVS;
   it must remain prohibited. Check a satellite expense package separately.
5. Review TPPT parsing, every session category/duration and qualitative answers.
   Negative/blank durations and missing facts must not produce a ready result.
6. Open the support alternatives, change activity and reconfirm its conditions.
7. Use Print summary/Save as PDF and inspect all pages for facts, timestamp,
   sources, warnings, readable tables and absence of navigation controls.
