# “Can I support this event?” — implementation plan

Planning date: 26 September 2026. Status: implemented on `codex/event-support`.
The sections below retain the agreed specification. See [the implementation and
coverage guide](event-support.md) for the delivered behaviour, checks and explicit
internal-review boundaries. This is a local branch implementation, not a
production release or a content-owner approval.

## Product direction

Start with the specific activity the company intends to undertake. Give a clear,
reasoned answer to that scenario, then offer an overview of other support options
for the same event. Reuse the facts already entered when exploring alternatives.

Build this within the existing React app and custom routing. Reuse the working
same-origin CVS integration. The tool should explain the MedTech Europe Code
position and any unresolved conditions; it should not describe its output as
company approval or claim to determine every national legal requirement.

## Proposed journey

1. **Describe the planned support.** Offer plain-language choices: a grant to an
   organiser, funding attendance through a grant, paying an HCP directly, hiring
   a speaker, buying a booth or advertising, sending company staff, or holding
   a company meeting/training. Ask what the payment or benefit actually covers;
   a package can contain several activities that need separate answers.
2. **Clarify only the relevant facts.** Establish the event's organiser, purpose,
   format, location, relevant HCP/HCO geography and participant role. Distinguish
   a third-party conference, procedure training and company event through short
   guided questions where the user is unsure. Reveal activity-specific questions
   about the recipient, beneficiary selection, services, expenses or timing.
3. **Check CVS where required or to verify an apparent national-event exemption.**
   A company answer that no HCPs from different countries will attend must not
   skip this check for a third-party event before presenting a CVS-not-required
   conclusion. Use the existing name/country/
   date search, let the user identify the event, and retrieve the current overall
   detail-page status. Compare that evidence with the company's audience answers
   and show the scope warning specified below when they conflict. Explain why
   this step is relevant. A prohibited activity
   can receive its answer without requiring a CVS search first.
4. **Answer the actual question.** State the position, the reason, conditions
   satisfied and still outstanding, missing facts, and linked Code provisions.
   For payments to an HCP, distinguish fees, registration, travel, accommodation
   and hospitality where their treatment differs.
5. **Offer “What other support could we provide?”** Show a compact comparison
   using the same event facts. Each alternative has its own result. An option
   requiring more facts says so and opens a short follow-up flow when selected.

Allow “I don't know” throughout, Back, answer editing and Start again. Changing
an upstream answer must invalidate dependent answers and results. Changing event
identity must also invalidate its CVS evidence. Do not ask for HCP names when a
role, location or beneficiary-selection answer is sufficient.

## Coverage to implement

Annex I is the starting coverage matrix, rather than the entire specification.
Its eight activities across four event settings give **32 baseline cases**.
Annex VI supplies **16 further baseline cells** for faculty/delegate support in
different settings. Main chapters, Q&As, definitions and footnotes determine the
additional questions and exceptions.

| Scenario family | Main source coverage | Planned checks |
| --- | --- | --- |
| Third-party conferences | Annex I; Chapters 1, 2 and 4 | Separate grant purposes, commercial support, company attendance and direct HCP support; apply each activity's CVS requirement independently. |
| HCP roles and paid services | Annex VI; Chapters 2, 3 and 5 | Main-programme faculty versus company satellite/booth services; active services versus passive attendance; poster/abstract presenters; genuine consulting and expense allocation. |
| Procedure training | Annex VII; Chapter 2 and relevant Q&As | Reuse the TPPT calculator plus qualification questions; cover grants and direct support, programme changes and training attached to a conference. |
| Company events | Chapter 3; Annex VI | Product/procedure training, educational meetings, sales/business meetings, advisory and investigator meetings; whether they occur in the context of a third-party event. |
| Event format and general conditions | Chapter 1; relevant Chapter 2 Q&As | In-person, virtual and hybrid components; programme, venue, travel, hospitality, guests and transparency. Assess components separately where necessary. |
| Funding and recipients | Chapter 4 and Q&As | HCOs and PCOs, cash/in-kind support, mixed grant/commercial packages, beneficiary independence, individual organisers, contracts and disclosure. |
| Related event activities | Chapters 5, 8, 9 and 10 | Consulting, educational/promotional items, demonstrations/samples and intermediaries when included in the proposed support. |

The completeness target is all **event-support scenarios** identifiable in the
Code. Independent research, royalties and other non-event arrangements should
receive an explicit handoff to the relevant Code section/tool rather than an
invented event answer. This boundary will be recorded in the coverage inventory.

## Rules and evidence model

Use a deterministic evaluator with reviewed rules, separate from the question UI
and live CVS requests. Each rule has a stable ID, applicable facts, conclusion,
conditions, source references and a version. Store derived questions/rules in
JSON without rewriting the canonical publication text.

Keep these dimensions distinct in the assessment:

- Whether the Code applies to the interaction.
- Whether the planned activity is permitted, prohibited or needs review.
- Whether CVS assessment is required for that activity.
- What the selected event's current CVS evidence establishes.
- Whether the company's apparent CVS exemption conflicts with the event record.
- Which conditions or facts remain unresolved.

Suggested result wording: **Not permitted under the Code**, **Permitted subject
to conditions**, **CVS assessment outstanding**, **Internal review required**,
**Outside the Code's scope**, or **More information needed**. Show the reason and
the separate CVS position alongside the main answer. Preserve the distinction
between an Annex cell that is not applicable and an interaction outside scope.

A result should retain its rule version, triggering answers and source links.
CVS evidence includes the EMT ID, exact raw overall status, authoritative URL
and retrieval time. Keep event records and answers transient by default. Offer a
user-initiated print summary of the specific assessment; no local CVS database
or background collection is needed.

### CVS record warning despite an apparently national audience

This is an explicitly requested product precaution. Keep it distinct from the
source-derived Code rules; it does not create a new automatic legal prohibition.

**Trigger:** the company answers that no HCPs from different countries will
attend (or otherwise reaches an apparent national-event/CVS-not-required branch),
the user confirms the matching event in CVS, and its current overall status is
neither of these two values:

- `Not assessed - Out of scope`
- `Not assessed - National event`

Apply the warning to every other status, including pending review, pre-cleared,
positive, negative and unrecognised statuses. Compare the entire status label
after conservative case/whitespace normalisation; retain the exact raw label for
display. Do not accept a substring such as “national” or treat every not-assessed
status as an exemption. A missing status also leaves scope unresolved.

Suggested default warning:

> This event is listed in CVS with status “[current status]”. Although you
> indicated that no HCPs from different countries will attend, the event may
> still be in scope of CVS, and a negative assessment could still be issued.
> Confirm the event's CVS scope and current decision before proceeding.

Adapt the final sentence about assessment to the actual evidence: for an already
negative result, state that a negative assessment is already recorded; for a
positive result, show the current positive decision alongside the scope warning
without presenting it as pending. Pending or unknown status cannot support a
definitive conclusion that CVS is not required.

The two exception labels suppress this particular discrepancy warning only.
They do not establish that the Code is out of scope or that the activity is
permitted. No search match, a skipped check, an ambiguous match or a failed lookup
is also not proof of exemption: show “CVS scope not confirmed” if this check is
needed and cannot be completed.

Show the warning next to the specific answer, carry it into the alternative
support overview and printed summary, and include the EMT ID, raw status,
retrieval time and CVS link. Treat the record as a reason to confirm scope,
rather than silently replacing the company's audience answers or declaring all
support prohibited. Preserve activity-specific rules, including activities that
require internal review independently of CVS.

### Interpretation work before coding conclusions

Create a source-linked coverage register with an expected result for every
baseline cell and every additional exception. Resolve these questions explicitly:

- **Geography:** maintain a dated country classification. Code scope, Disclosure
  scope and CVS/Mecomed assessment arrangements must not share an assumed
  identical boundary. Check the current official classifications before release.
- **Audience and beneficiaries:** take account of Annex I's footnotes, relevant
  HCO location and grant beneficiaries. An event's country or marketing label
  alone is insufficient. Unclassified audience combinations require review.
  Apply the requested CVS-record discrepancy warning even where the company's
  audience answers suggest the event is national.
- **CVS statuses:** agree a documented mapping for final, pending, pre-cleared,
  negative and not-assessed statuses. Preserve raw values; unknown statuses must
  produce a visible review state. An out-of-scope CVS status is evidence to
  examine, not an automatic exemption from the app's rules.
- **Training and company events:** don't infer their classification from names,
  a positive CVS status or programme percentages alone. Treat changes to the
  programme and bundled conference attendance explicitly.
- **Commitment versus execution:** where the Code permits an arrangement subject
  to a future condition, distinguish that stage from authorising the payment.
- **Judgment and local requirements:** identify checks the tool can determine and
  checks requiring internal review; do not fabricate national limits or rules.

Existing decision trees provide useful question wording and coverage clues, but
their conclusions must be checked against the source. In particular, the Annex I
tree currently describes international direct sponsorship as requiring CVS and
only “generally” prohibited. Its unused prohibition result and mixed outcome
labels make it unsuitable as the new evaluator's authority. Record and reconcile
this discrepancy when those tree data are next changed.

## Implementation sequence

### 1. Map and review the scenarios

Produce the coverage register, plain-language question inventory, rule precedence
and status/geography policies. Pin the Code version and distinguish publication
rules from current CVS operational guidance. Flag genuinely unresolved cases for
content-owner review while implementing the unambiguous branches.

**Completion:** every baseline cell and additional event-related provision has a
rule, a deliberate review outcome or a documented out-of-feature handoff.

### 2. Build the rule evaluator

Add `src/data/eventSupportRules.json`, a pure evaluator in
`src/utils/eventSupportRules.js`, and focused Node tests. Evaluate shared event
facts and individual support activities separately, including mixed packages.
Validate rule IDs, question dependencies and links to actual Code sections.

**Completion:** all 32 Annex I and 16 Annex VI baseline expectations pass, with
additional tests for footnotes, exceptions, unknown facts and conflicting inputs.
Include the requested national-audience/CVS-record warning as a separate tested
precaution so it cannot be bypassed by the ordinary national-event branch.

### 3. Build the scenario-first interface

Add a lazily loaded `EventSupportContent.jsx` at the proposed `/event-support`
route using the existing App/routing registries and Home Hub metadata. Use local
assessment state and small feature components for questions and results. Follow
existing Tailwind, icon, accessibility and print conventions.

Start with the Annex I conference branches, then add the remaining scenario
families against the same evaluator before describing the feature as complete.

**Completion:** a user can assess one proposed activity, understand its answer,
edit facts and obtain a consistent updated answer on desktop and mobile.

### 4. Connect live CVS and the TPPT checks

Extract a reusable CVS lookup UI from the prototype and retain the existing
adapter/endpoints. Fetch status only when relevant or explicitly requested;
handle no match, ambiguous identity, unavailable service and changed status.
An apparent national-event exemption makes this lookup relevant: do not end the
flow at the company's “no HCPs from different countries” answer. Reuse a confirmed
event and its live evidence across activities. Re-evaluate the warning whenever
the audience answer or refreshed status changes.
Refresh evidence before producing a final summary and label an unsuccessful
refresh as unresolved rather than presenting an earlier result as current.

Reuse `tpptParser.js` and `tpptExtraction.js` where agenda analysis is needed.
Resolve backlog A06 (invalid/negative session durations) before trusting their
calculation in this tool. Reuse qualification answers/results through a small
shared interface instead of maintaining another TPPT calculation. Start with
browser printing; A07 must be resolved if the existing PDF report is reused.

**Completion:** a stale response cannot change another event's answer; offline
rules remain usable and missing required live evidence is clearly unresolved.

### 5. Add alternatives and complete validation

Offer the post-answer support overview and a printable assessment. Test realistic
packages and cross-scenario differences, including final positive CVS with a
prohibited activity, negative CVS with a separate company-attendance review,
pending/pre-cleared status, an event abroad with relevant beneficiaries, a
poster presenter, a satellite speaker, a company meeting adjacent to a congress,
and procedure training whose programme changes.

Add specific acceptance cases for the new warning:

- National-audience answer plus pending review: show possible CVS scope and the
  risk of a future negative assessment; no unconditional CVS-not-required result.
- The same answer plus each of the two named exception statuses: suppress this
  warning while continuing the ordinary Code and activity checks.
- The same answer plus another not-assessed, pre-cleared or unknown status:
  retain the warning; do not infer an exemption.
- Positive and negative final statuses: retain the scope warning with accurate
  current-decision wording and the appropriate activity-specific assessment.
- No confirmed match or failed lookup: mark scope unconfirmed, not exempt.
- Status changes on refresh or audience answers change: update the warning and
  dependent result; preserve it consistently in alternatives and print output.

Run data validation, focused and full tests, type checking, production build and
the established source/asset checks. Add route compatibility tests and verify
Back/Forward, keyboard, mobile and print behavior. Account for the known Windows
test issue A09 rather than hiding a failure. Align related existing tree outputs
once the new rules are source-verified, and update routing/check documentation
and resolved backlog entries.

**Completion:** source review and scenario tests agree; the specific result,
alternative overview and printed summary use the same rules and evidence.

## Source basis

The repository's Code chapters remain the app's canonical content. Annex I,
Annex VI and Annex VII are in `src/data/code/annex1.json`, `annex6.json` and
`annex7.json`. Supporting provisions are in Scope, Chapters 1–5, 8–10 and their
Q&As. The existing CVS contract is documented in `docs/cvs-prototype.md`.

External cross-checks used for planning:

- [MedTech Europe Code, September 2024](https://www.medtecheurope.org/wp-content/uploads/2017/06/code-september-2024.pdf).
- [Official CVS 2.0 training, including 2025 features](https://www.ethicalmedtech.eu/wp-content/uploads/2025/01/CVS-2.0-Training_Slides_deck-v3.0-incl-2025-features-to-upload.pdf).

The reviewed operational guidance reinforces why CVS evidence and the company's
remaining assessment responsibilities must remain separate. Verify current
guidance again when implementing the status and geography policies.
