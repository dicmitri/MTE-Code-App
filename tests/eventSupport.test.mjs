import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { loadSplitCodeData } from '../scripts/lib/code-content.mjs';
import { validateProjectData } from '../scripts/validate-data.mjs';
import {
  assessProposal,
  evaluateEventSupport,
  getApplicableConditions,
  getConditionQuestions,
  getTpptQualification,
  updateEventAnswer,
} from '../src/utils/eventSupportRules.js';
import { classifyCvsStatus } from '../src/utils/eventSupportCvs.js';
import { getEventQuestions, getQuestionIds } from '../src/utils/eventSupportQuestions.js';
import { createCvsLookupClient, validateCvsDetail } from '../src/utils/cvsLookupClient.js';
import { formatMessage, linkCheckerTexts } from '../src/utils/eventSupportText.js';
import { createReferenceIndex } from '../src/utils/crossReferences.js';
import { createGlossaryEntry } from '../src/utils/textUtils.js';

const data = JSON.parse(readFileSync(new URL('../src/data/eventSupportRules.json', import.meta.url), 'utf8'));
const chapters = loadSplitCodeData(fileURLToPath(new URL('..', import.meta.url))).chapters;

const evidence = (raw) => ({
  emtId: 'EMT-26-11175',
  name: 'Example meeting',
  status: { raw },
  retrievedAt: '2026-09-26T10:00:00Z',
  detailUrl: 'https://cvs.solutions.iqvia.com/event/detail/EMT-26-11175',
});
const event = (overrides = {}) => ({
  member: 'yes', format: 'in-person', eventArea: 'in', audience: 'international', intermediary: 'no', ...overrides,
});
const confirmAll = (answers) => {
  const confirmed = { ...answers };
  for (const condition of getApplicableConditions(data, confirmed)) confirmed[condition.id] = 'yes';
  return confirmed;
};
const reasonIds = (result) => result.reasons.map((reason) => reason.id);
const qualifiedTraining = {
  handsOnChanged: 'no',
  sessions: [{ title: 'Cadaver lab', type: 'Hands-on', durationMinutes: 70 }, { title: 'Lecture', type: 'General Educational', durationMinutes: 50 }],
  procedureSkills: 'yes', clinicalVenue: 'yes', standalone: 'yes', activeStations: 'yes',
};

// ---- Annex I: every cell, transcribed independently from the published table ----------------

const ANNEX_I = {
  'grant-running': ['conditional:none', 'conditional:required', 'conditional:none', 'outside:none'],
  'grant-attendance': ['conditional:none', 'conditional:required', 'conditional:required', 'na:none'],
  'grant-faculty': ['conditional:none', 'conditional:required', 'conditional:none', 'na:none'],
  satellite: ['conditional:none', 'conditional:required', 'conditional:none', 'na:none'],
  'company-attendance': ['review:internal', 'review:internal', 'review:internal', 'review:internal'],
  booth: ['conditional:none', 'conditional:required', 'conditional:none', 'review:internal'],
  'direct-delegate': ['prohibited:none', 'prohibited:none', 'prohibited:none', 'na:none'],
  'direct-faculty': ['prohibited:none', 'prohibited:none', 'prohibited:none', 'na:none'],
};
// What the checker concludes in each column. "N/A" cells, and the "out of scope" cell, mean the
// Code does not apply when no HCPs or Healthcare Organisations from the Area are involved.
const ANNEX_I_RESULT = {
  'grant-running': ['conditional:none', 'conditional:required', 'conditional:none', 'outside:none'],
  'grant-attendance': ['conditional:none', 'conditional:required', 'conditional:required', 'outside:none'],
  'grant-faculty': ['conditional:none', 'conditional:required', 'conditional:none', 'outside:none'],
  satellite: ['conditional:none', 'conditional:required', 'conditional:none', 'outside:none'],
  'company-attendance': ['review:internal', 'review:internal', 'review:internal', 'review:internal'],
  booth: ['conditional:none', 'conditional:required', 'conditional:none', 'review:internal'],
  'direct-delegate': ['prohibited:none', 'prohibited:none', 'prohibited:none', 'outside:none'],
  'direct-faculty': ['prohibited:none', 'prohibited:none', 'prohibited:none', 'outside:none'],
};
const ACTIVITY_DETAILS = {
  'grant-running': { recipient: 'hco', paymentRoute: 'recipient', packageMixed: 'no' },
  'grant-attendance': { recipient: 'hco', paymentRoute: 'recipient', packageMixed: 'no' },
  'grant-faculty': { recipient: 'hco', paymentRoute: 'recipient', packageMixed: 'no' },
  satellite: { expenses: ['fee'] },
  'company-attendance': {},
  booth: { packageEducation: 'no' },
  'direct-delegate': {},
  'direct-faculty': { facultyRole: 'main' },
};
const annexIColumn = (activity, column) => {
  if (column === 0) return { eventArea: 'in', audience: 'local' };
  if (column === 1) return { eventArea: 'in', audience: 'international' };
  const areaHcps = column === 2 ? 'yes' : 'no';
  return {
    eventArea: 'out', audience: undefined, areaAttendance: areaHcps, beneficiariesInArea: areaHcps,
    supportedHcpInArea: areaHcps, recipientInArea: 'no',
  };
};

test('Annex I data matches the published table, cell by cell', () => {
  assert.deepEqual(data.conferenceMatrix, ANNEX_I);
});

for (const [activity, cells] of Object.entries(ANNEX_I_RESULT)) {
  cells.forEach((expected, column) => {
    test(`Annex I: ${activity}, column ${column + 1}`, () => {
      const answers = event({ activity, eventType: 'conference', ...ACTIVITY_DETAILS[activity], ...annexIColumn(activity, column) });
      const result = assessProposal(data, answers);
      assert.equal(`${result.permission}:${result.cvsRequirement}`, expected);
    });
  });
}

test('Annex I answers quote the table cell they rely on', () => {
  const result = assessProposal(data, event({ activity: 'booth', eventType: 'conference', packageEducation: 'no' }));
  const quote = result.reasons.find((reason) => reason.id === 'annex1Cell');
  assert.equal(quote.params.text, 'Subject to CVS decision');
  assert.equal(quote.params.column, data.annex1Columns[1]);
});

// ---- Annex VI: every cell ------------------------------------------------------------------

const ANNEX_VI = [
  ['conference', { activity: 'direct-faculty', eventType: 'conference', facultyRole: 'main' }, { activity: 'direct-delegate', eventType: 'conference' }, 'prohibited', 'prohibited'],
  ['satellite', { activity: 'satellite', expenses: ['fee'] }, { activity: 'direct-delegate', eventType: 'conference' }, 'conditional', 'prohibited'],
  ['booth', { activity: 'direct-faculty', eventType: 'conference', facultyRole: 'satellite', expenses: ['fee'] }, { activity: 'direct-delegate', eventType: 'conference' }, 'conditional', 'prohibited'],
  ['tppt', { activity: 'direct-faculty', eventType: 'tppt', ...qualifiedTraining, expenses: ['fee'] }, { activity: 'direct-delegate', eventType: 'tppt', ...qualifiedTraining, expenses: ['registration'] }, 'conditional', 'conditional'],
  ['company-training', { activity: 'direct-faculty', eventType: 'company-training', overlap: 'no', expenses: ['fee'] }, { activity: 'direct-delegate', eventType: 'company-training', overlap: 'no', expenses: ['travel'] }, 'conditional', 'conditional'],
  ['company-training-overlap', { activity: 'direct-faculty', eventType: 'company-training', overlap: 'yes', expenses: ['fee'] }, { activity: 'direct-delegate', eventType: 'company-training', overlap: 'yes' }, 'conditional', 'prohibited'],
  ['company-business', { activity: 'direct-faculty', eventType: 'company-business', overlap: 'no', expenses: ['fee'] }, { activity: 'direct-delegate', eventType: 'company-business', overlap: 'no', expenses: ['travel'], nonPortable: 'yes' }, 'conditional', 'conditional'],
  ['company-business-overlap', { activity: 'direct-faculty', eventType: 'company-business', overlap: 'yes', expenses: ['fee'] }, { activity: 'direct-delegate', eventType: 'company-business', overlap: 'yes' }, 'conditional', 'prohibited'],
];

for (const [setting, facultyAnswers, delegateAnswers, faculty, delegate] of ANNEX_VI) {
  test(`Annex VI: ${setting}, Faculty`, () => {
    assert.equal(data.directSupportMatrix[setting].faculty, faculty);
    assert.equal(assessProposal(data, event(facultyAnswers)).permission, faculty);
  });
  test(`Annex VI: ${setting}, Delegates`, () => {
    assert.equal(assessProposal(data, event(delegateAnswers)).permission, delegate);
  });
}

test('the non-portable equipment exception covers travel and accommodation at business meetings only', () => {
  const meeting = event({ activity: 'direct-delegate', eventType: 'company-business', overlap: 'no', expenses: ['travel', 'meals'] });
  const without = assessProposal(data, { ...meeting, nonPortable: 'no' });
  assert.equal(without.outcome ?? evaluateEventSupport(data, { ...meeting, nonPortable: 'no' }).outcome, 'not-permitted-as-proposed');
  assert.deepEqual(without.expenses.map((expense) => expense.state), ['not-allowed', 'allowed']);
  assert.equal(assessProposal(data, { ...meeting, nonPortable: 'yes' }).permission, 'conditional');
  assert.deepEqual(getQuestionIds(data, { ...meeting, expenses: ['meals'] }).includes('nonPortable'), false);
});

// ---- Scope and geography --------------------------------------------------------------------

test('the Code applies only to Member Companies and their affiliates', () => {
  const result = evaluateEventSupport(data, event({ activity: 'booth', eventType: 'conference', member: 'no' }));
  assert.equal(result.outcome, 'outside');
  assert.deepEqual(getQuestionIds(data, { activity: 'booth', member: 'no' }), ['member']);
});

test('Mecomed countries are in the Area: the Code applies and CVS refers to Mecomed', () => {
  const grant = event({ activity: 'grant-running', eventType: 'conference', eventArea: 'mecomed', ...ACTIVITY_DETAILS['grant-running'] });
  const result = evaluateEventSupport(data, confirmAll(grant));
  assert.equal(result.permission, 'conditional');
  assert.equal(result.cvsRequirement, 'mecomed');
  assert.equal(result.outcome, 'review');
  assert.ok(reasonIds(result).includes('mecomedCvs'));
  const direct = evaluateEventSupport(data, event({ activity: 'direct-delegate', eventType: 'conference', eventArea: 'mecomed' }));
  assert.equal(direct.outcome, 'not-permitted');
});

test('a recipient in the Area brings a grant for an Event abroad within the Code, without CVS', () => {
  const running = assessProposal(data, event({ activity: 'grant-running', eventType: 'conference', ...ACTIVITY_DETAILS['grant-running'], eventArea: 'out', audience: undefined, areaAttendance: 'no', recipientInArea: 'yes' }));
  assert.equal(`${running.permission}:${running.cvsRequirement}`, 'conditional:none');
  assert.ok(reasonIds(running).includes('recipientInAreaApplies'));
  const attendance = assessProposal(data, event({ activity: 'grant-attendance', eventType: 'conference', ...ACTIVITY_DETAILS['grant-attendance'], eventArea: 'out', audience: undefined, beneficiariesInArea: 'no', recipientInArea: 'yes' }));
  assert.equal(`${attendance.permission}:${attendance.cvsRequirement}`, 'conditional:none');
  assert.ok(reasonIds(attendance).includes('beneficiariesNotInArea'));
});

test('paying an HCP from outside the Area for an Event abroad is outside the Code', () => {
  const result = evaluateEventSupport(data, event({ activity: 'direct-delegate', eventType: 'conference', eventArea: 'out', audience: undefined, supportedHcpInArea: 'no' }));
  assert.equal(result.outcome, 'outside');
  assert.deepEqual(reasonIds(result), ['outsideSupportedHcp']);
});

test('an audience Annex I does not classify never becomes a national exemption', () => {
  const booth = confirmAll(event({ activity: 'booth', eventType: 'conference', audience: 'other', packageEducation: 'no' }));
  const unconfirmed = evaluateEventSupport(data, booth, evidence('Under Review'));
  assert.equal(unconfirmed.cvsRequirement, 'unknown');
  assert.equal(unconfirmed.outcome, 'review');
  assert.ok(reasonIds(unconfirmed).includes('audienceUnclassified'));
  // Once CVS has assessed the Event as Compliant, its decision settles the question.
  const decided = evaluateEventSupport(data, booth, evidence('Compliant'));
  assert.equal(decided.outcome, 'permitted-confirmed');
  assert.equal(reasonIds(decided).includes('audienceUnclassified'), false);
});

// ---- Virtual and hybrid Events ---------------------------------------------------------------

test('a hybrid Event follows all the in-person rules, including CVS', () => {
  const result = assessProposal(data, event({ activity: 'booth', eventType: 'conference', format: 'hybrid', packageEducation: 'no' }));
  assert.equal(result.cvsRequirement, 'required');
  assert.ok(reasonIds(result).includes('hybridIsInPerson'));
});

test('Virtual Events need no CVS decision, and HCPs attending them cannot be supported directly', () => {
  const online = { format: 'virtual', eventArea: undefined, audience: undefined };
  const booth = assessProposal(data, event({ activity: 'booth', eventType: 'conference', ...online, areaAttendance: 'yes', packageEducation: 'no' }));
  assert.equal(`${booth.permission}:${booth.cvsRequirement}`, 'conditional:none');
  assert.ok(reasonIds(booth).includes('virtualNoCvs'));
  const delegate = evaluateEventSupport(data, event({ activity: 'direct-delegate', eventType: 'tppt', ...online, supportedHcpInArea: 'yes' }));
  assert.equal(delegate.outcome, 'not-permitted');
  assert.ok(reasonIds(delegate).includes('virtualNoDirect'));
  assert.ok(reasonIds(delegate).includes('tpptVirtual'));
  const speaker = assessProposal(data, event({ activity: 'satellite', ...online, supportedHcpInArea: 'yes', expenses: ['fee', 'travel', 'meals'] }));
  assert.deepEqual(speaker.expenses.map((expense) => `${expense.id}:${expense.state}`), ['fee:allowed', 'travel:not-allowed', 'meals:not-allowed']);
});

// ---- CVS evidence ------------------------------------------------------------------------------

test('CVS statuses are read from the live list, ignoring case, spacing and the kind of dash', () => {
  const expected = {
    Compliant: 'positive', 'Not Compliant': 'negative', 'Not Pre-cleared': 'negative', 'Pre-Cleared': 'pre-cleared',
    'Under Review': 'pending', 'Waiting for information': 'pending', 'To be reviewed': 'pending', 'Under Appeal': 'pending',
    'Under Correction Notice': 'pending', 'Not assessed - Late Submission': 'not-assessed',
    'Not assessed - Insufficient information': 'not-assessed', 'Not assessed - Out Of Scope': 'exempt',
    '  NOT assessed – out of scope ': 'exempt', 'Not assessed - National event': 'exempt', 'A new status': 'unknown',
    'Not assessed - Out of scope (unverified)': 'unknown', '': 'unknown',
  };
  for (const [raw, state] of Object.entries(expected)) assert.equal(classifyCvsStatus(data, raw), state, raw);
});

test('a CVS decision is required, not a substitute for the Code', () => {
  const booth = confirmAll(event({ activity: 'booth', eventType: 'conference', packageEducation: 'no' }));
  assert.equal(evaluateEventSupport(data, booth).outcome, 'cvs-needed');
  assert.equal(evaluateEventSupport(data, booth, evidence('Pre-Cleared')).outcome, 'cvs-needed');
  assert.ok(reasonIds(evaluateEventSupport(data, booth, evidence('Pre-Cleared'))).includes('cvsPreCleared'));
  assert.equal(evaluateEventSupport(data, booth, evidence('Under Review')).outcome, 'cvs-needed');
  const positive = evaluateEventSupport(data, booth, evidence('Compliant'));
  assert.equal(positive.outcome, 'permitted-confirmed');
  assert.equal(positive.ready, true);
  assert.equal(evaluateEventSupport(data, event({ activity: 'direct-delegate', eventType: 'conference' }), evidence('Compliant')).outcome, 'not-permitted');
});

test('negative and missing CVS decisions are binding', () => {
  const grant = confirmAll(event({ activity: 'grant-running', eventType: 'conference', audience: 'local', ...ACTIVITY_DETAILS['grant-running'] }));
  const negative = evaluateEventSupport(data, grant, evidence('Not Compliant'));
  assert.equal(negative.outcome, 'not-permitted');
  assert.ok(reasonIds(negative).includes('cvsNegativeBinding'));
  const attendance = evaluateEventSupport(data, confirmAll(event({ activity: 'company-attendance', eventType: 'conference' })), evidence('Not Compliant'));
  assert.equal(attendance.outcome, 'review');
  assert.ok(reasonIds(attendance).includes('cvsNegativeAttendance'));
  const late = evaluateEventSupport(data, confirmAll(event({ activity: 'booth', eventType: 'conference', packageEducation: 'no' })), evidence('Not assessed - Late Submission'));
  assert.equal(late.outcome, 'not-permitted');
  const disagreement = evaluateEventSupport(data, confirmAll(event({ activity: 'booth', eventType: 'conference', packageEducation: 'no' })), evidence('Not assessed - Out Of Scope'));
  assert.ok(reasonIds(disagreement).includes('cvsScopeDisagrees'));
});

test('a Compliant decision settles the Event’s own criteria, not the company’s arrangements', () => {
  const grant = event({ activity: 'grant-running', eventType: 'conference', ...ACTIVITY_DETAILS['grant-running'] });
  const asked = getConditionQuestions(data, grant, evidence('Compliant')).map((condition) => condition.id);
  assert.equal(asked.includes('venue'), false);
  assert.equal(asked.includes('programme'), false);
  assert.ok(asked.includes('fundingRequest'));
  const result = evaluateEventSupport(data, grant, evidence('Compliant'));
  assert.equal(result.conditions.find((condition) => condition.id === 'venue').answer, 'covered');
  assert.equal(result.conditions.find((condition) => condition.id === 'grantPurpose').answer, 'unknown');
});

test('if the CVS decision is not available yet, a grant can make it a pre-condition', () => {
  const grant = confirmAll(event({ activity: 'grant-attendance', eventType: 'conference', ...ACTIVITY_DETAILS['grant-attendance'] }));
  assert.ok(reasonIds(evaluateEventSupport(data, grant)).includes('grantPreCondition'));
  assert.ok(reasonIds(evaluateEventSupport(data, grant, evidence('Under Review'))).includes('grantPreCondition'));
});

// ---- The requested national-audience precaution -----------------------------------------------

for (const [raw, messageId] of [
  ['Under Review', 'nationalRecordPending'], ['Pre-Cleared', 'nationalRecordPending'],
  ['Not assessed - Late Submission', 'nationalRecordPending'], ['A new status', 'nationalRecordPending'],
  ['Compliant', 'nationalRecordPositive'], ['Not Compliant', 'nationalRecordNegative'],
]) {
  test(`a national-audience answer with a CVS record “${raw}” keeps the warning`, () => {
    const booth = confirmAll(event({ activity: 'booth', eventType: 'conference', audience: 'local', packageEducation: 'no' }));
    const result = evaluateEventSupport(data, booth, evidence(raw));
    if (raw === 'Not Compliant') {
      assert.equal(result.outcome, 'not-permitted');
      return;
    }
    assert.equal(result.warnings[0].id, 'national-cvs-record');
    assert.equal(result.warnings[0].messageId, messageId);
    assert.equal(result.ready, false);
  });
}

test('only the two named “Not assessed” labels lift the national-audience warning', () => {
  const booth = confirmAll(event({ activity: 'booth', eventType: 'conference', audience: 'local', packageEducation: 'no' }));
  for (const raw of ['Not assessed - Out of scope', 'Not assessed - National event', '  NOT assessed - OUT OF SCOPE  ']) {
    const result = evaluateEventSupport(data, booth, evidence(raw));
    assert.deepEqual(result.warnings, [], raw);
    assert.equal(result.outcome, 'permitted-confirmed', raw);
  }
});

test('no match, or no search, does not confirm that a national Event is outside CVS scope', () => {
  const booth = confirmAll(event({ activity: 'booth', eventType: 'conference', audience: 'local', packageEducation: 'no' }));
  const result = evaluateEventSupport(data, booth);
  assert.equal(result.warnings[0].id, 'scope-unconfirmed');
  assert.equal(result.outcome, 'review');
});

// ---- Grants ------------------------------------------------------------------------------------

test('grants go to qualifying organisations, in their name', () => {
  const grant = (details) => evaluateEventSupport(data, event({ activity: 'grant-running', eventType: 'conference', ...ACTIVITY_DETAILS['grant-running'], ...details }));
  assert.equal(grant({ recipient: 'individual' }).outcome, 'not-permitted-as-proposed');
  assert.equal(grant({ recipient: 'agency' }).outcome, 'not-permitted-as-proposed');
  assert.ok(reasonIds(grant({ recipient: 'agency' })).includes('grantToTravelAgency'));
  assert.equal(grant({ recipient: 'patient' }).outcome, 'outside');
  assert.equal(grant({ paymentRoute: 'personal' }).outcome, 'not-permitted-as-proposed');
  assert.ok(reasonIds(grant({ recipient: 'pco' })).includes('grantToPco'));
  assert.ok(getApplicableConditions(data, event({ activity: 'grant-attendance', eventType: 'conference', ...ACTIVITY_DETAILS['grant-attendance'], paymentRoute: 'agency' })).some((condition) => condition.id === 'travelAgency'));
});

test('an Educational Grant gives the company nothing in return', () => {
  const result = evaluateEventSupport(data, confirmAll(event({ activity: 'grant-running', eventType: 'conference', ...ACTIVITY_DETAILS['grant-running'], packageMixed: 'yes' })), evidence('Compliant'));
  assert.equal(result.outcome, 'review');
  assert.ok(reasonIds(result).includes('grantPackageSplit'));
  const booth = evaluateEventSupport(data, confirmAll(event({ activity: 'booth', eventType: 'conference', packageEducation: 'yes' })), evidence('Compliant'));
  assert.ok(reasonIds(booth).includes('boothPackageSplit'));
});

test('grant conditions follow the type of grant', () => {
  const ids = (activity) => getApplicableConditions(data, event({ activity, eventType: 'conference', ...ACTIVITY_DETAILS[activity] })).map((condition) => condition.id);
  assert.ok(ids('grant-attendance').includes('grantSelection'));
  assert.equal(ids('grant-attendance').includes('grantOrganiser'), false);
  assert.ok(ids('grant-faculty').includes('grantOrganiser'));
  assert.ok(ids('grant-running').includes('fundingDecision'));
});

// ---- Procedure training ---------------------------------------------------------------------

test('procedure training qualification combines the agenda and the Annex VII criteria', () => {
  assert.equal(getTpptQualification(qualifiedTraining).state, 'qualified');
  assert.equal(getTpptQualification({ ...qualifiedTraining, standalone: 'no' }).state, 'failed');
  assert.equal(getTpptQualification({ ...qualifiedTraining, standalone: 'unknown' }).state, 'unknown');
  assert.equal(getTpptQualification({ ...qualifiedTraining, sessions: [{ type: 'General Educational', durationMinutes: 120 }] }).state, 'failed');
  const streamed = { ...qualifiedTraining, sessions: [{ type: 'Hands-on', durationMinutes: 40 }, { type: 'Streaming', durationMinutes: 30 }, { type: 'General Educational', durationMinutes: 50 }] };
  assert.equal(getTpptQualification(streamed).state, 'unknown');
  assert.equal(getTpptQualification({ ...streamed, streamingFollowed: 'no' }).state, 'failed');
  assert.equal(getTpptQualification({ ...streamed, streamingFollowed: 'yes' }).state, 'qualified');
});

test('a training that does not qualify is assessed as a conference', () => {
  const result = evaluateEventSupport(data, event({ activity: 'direct-delegate', eventType: 'tppt', ...qualifiedTraining, standalone: 'no' }));
  assert.equal(result.outcome, 'not-permitted');
  assert.ok(reasonIds(result).includes('tpptNotQualified'));
  assert.equal(getQuestionIds(data, event({ activity: 'direct-delegate', eventType: 'tppt', ...qualifiedTraining, procedureSkills: 'no' })).includes('clinicalVenue'), false);
});

test('a qualifying training allows direct support, with CVS for international Events', () => {
  const training = event({ activity: 'direct-delegate', eventType: 'tppt', ...qualifiedTraining, expenses: ['registration', 'travel', 'accommodation'] });
  const international = evaluateEventSupport(data, confirmAll(training), evidence('Compliant'));
  assert.equal(international.outcome, 'permitted-confirmed');
  assert.ok(reasonIds(international).includes('tpptCvs'));
  const national = assessProposal(data, { ...training, audience: 'local' });
  assert.equal(national.cvsRequirement, 'none');
});

test('once the hands-on part is cancelled or moved online, only a grant and registration remain', () => {
  const changed = event({ activity: 'direct-delegate', eventType: 'tppt', handsOnChanged: 'yes' });
  assert.deepEqual(assessProposal(data, { ...changed, expenses: ['registration'] }).expenses.map((expense) => expense.state), ['allowed']);
  assert.equal(evaluateEventSupport(data, { ...changed, expenses: ['registration', 'travel'] }).outcome, 'not-permitted-as-proposed');
  assert.equal(evaluateEventSupport(data, event({ activity: 'direct-faculty', eventType: 'tppt', handsOnChanged: 'yes' })).outcome, 'not-permitted');
  assert.equal(assessProposal(data, event({ activity: 'grant-running', eventType: 'tppt', ...ACTIVITY_DETAILS['grant-running'] })).permission, 'conditional');
});

// ---- Payments to speakers and at Company Events ------------------------------------------------

test('satellite speakers: registration only if needed for access, no travel already covered by a grant', () => {
  const speaker = event({ activity: 'satellite', expenses: ['fee', 'registration', 'travel'], accessRequired: 'no', grantCoversAttendance: 'yes' });
  const result = assessProposal(data, speaker);
  assert.deepEqual(result.expenses.map((expense) => expense.state), ['allowed', 'not-allowed', 'not-allowed']);
  assert.equal(evaluateEventSupport(data, speaker).outcome, 'not-permitted-as-proposed');
  const allowed = assessProposal(data, { ...speaker, accessRequired: 'yes', grantCoversAttendance: 'no' });
  assert.deepEqual(allowed.expenses.map((expense) => expense.state), ['allowed', 'allowed', 'allowed']);
});

test('services at a Company Event around a congress: no incremental costs of the congress', () => {
  const advisers = event({ activity: 'direct-faculty', eventType: 'company-services', overlap: 'yes', expenses: ['fee', 'registration', 'travel'] });
  const incremental = assessProposal(data, { ...advisers, incrementalCosts: 'yes' });
  assert.deepEqual(incremental.expenses.map((expense) => expense.state), ['allowed', 'not-allowed', 'not-allowed']);
  const own = assessProposal(data, { ...advisers, expenses: ['fee', 'travel'], incrementalCosts: 'no' });
  assert.equal(own.permission, 'conditional');
});

test('a Delegate is never paid a fee, and the fee option is not offered', () => {
  const delegate = event({ activity: 'direct-delegate', eventType: 'company-training', overlap: 'no' });
  const expenses = getEventQuestions(data, delegate).find((question) => question.id === 'expenses');
  assert.equal(expenses.options.some(([value]) => value === 'fee'), false);
  assert.equal(assessProposal(data, { ...delegate, expenses: ['fee'] }).expenses[0].state, 'not-allowed');
});

// ---- Other interactions ----------------------------------------------------------------------

test('individual organisers: In Kind support only, never money or identifiable attendance', () => {
  const organisers = event({ activity: 'in-kind', eventType: 'conference', inKindType: ['invoices'], identifiableAttendance: 'no' });
  assert.equal(assessProposal(data, organisers).permission, 'conditional');
  assert.equal(evaluateEventSupport(data, { ...organisers, inKindType: ['money'] }).outcome, 'not-permitted-as-proposed');
  assert.equal(evaluateEventSupport(data, { ...organisers, identifiableAttendance: 'yes' }).outcome, 'not-permitted-as-proposed');
  assert.ok(getApplicableConditions(data, { ...organisers, inKindType: ['speakers'] }).some((condition) => condition.id === 'consultingAgreement'));
});

test('meals, items, products, proctorships and donations have their own rules', () => {
  const other = (activity, details) => evaluateEventSupport(data, { member: 'yes', activity, interactionInArea: 'yes', intermediary: 'no', ...details });
  assert.ok(getApplicableConditions(data, { member: 'yes', activity: 'meal', interactionInArea: 'yes', overlap: 'yes' }).some((condition) => condition.id === 'mealPurpose'));
  assert.equal(other('meal', { overlap: 'yes', mealGrantHospitality: 'yes' }).outcome, 'review');
  assert.equal(other('demos', { demoKind: 'demo', demoClinicalUse: 'yes' }).outcome, 'not-permitted-as-proposed');
  assert.ok(getApplicableConditions(data, { member: 'yes', activity: 'demos', interactionInArea: 'yes', demoKind: 'sample' }).some((condition) => condition.id === 'sampleLimits'));
  assert.equal(other('proctorship', { proctorshipSetting: 'no' }).outcome, 'review');
  assert.equal(other('donation', { donationRecipient: 'hcp-charity' }).outcome, 'not-permitted');
  assert.equal(other('donation', { donationRecipient: 'hco', fundraiserHcps: 'no' }).outcome, 'review');
  assert.equal(other('donation', { donationRecipient: 'charity', fundraiserHcps: 'yes' }).outcome, 'not-permitted-as-proposed');
  assert.equal(other('items', { interactionInArea: 'no' }).outcome, 'outside');
  assert.equal(evaluateEventSupport(data, { activity: 'research' }).outcome, 'handoff');
});

// ---- Conditions and outcomes ---------------------------------------------------------------------

test('a condition answered “No” changes the outcome; unconfirmed ones keep it provisional', () => {
  const booth = event({ activity: 'booth', eventType: 'conference', packageEducation: 'no' });
  const provisional = evaluateEventSupport(data, booth, evidence('Compliant'));
  assert.equal(provisional.outcome, 'permitted');
  assert.equal(provisional.ready, false);
  assert.equal(evaluateEventSupport(data, { ...confirmAll(booth), localRules: 'no' }, evidence('Compliant')).outcome, 'not-permitted-as-proposed');
  assert.equal(evaluateEventSupport(data, { ...confirmAll(booth), commercialImage: 'no' }, evidence('Compliant')).outcome, 'review');
});

test('an unanswered or unknown fact is never treated as satisfied', () => {
  const grant = confirmAll(event({ activity: 'grant-running', eventType: 'conference', ...ACTIVITY_DETAILS['grant-running'] }));
  assert.equal(evaluateEventSupport(data, grant, evidence('Compliant')).ready, true);
  for (const question of getEventQuestions(data, grant).filter((item) => item.type === 'choice')) {
    const result = evaluateEventSupport(data, { ...grant, [question.id]: 'unknown' }, evidence('Compliant'));
    assert.equal(result.ready, false, question.id);
  }
});

// ---- Answer changes ------------------------------------------------------------------------------

test('choosing another activity keeps the Event facts and clears the previous proposal', () => {
  const previous = confirmAll(event({ activity: 'satellite', expenses: ['registration'], accessRequired: 'yes' }));
  const next = updateEventAnswer(data, previous, 'activity', 'grant-running');
  assert.equal(next.expenses, undefined);
  assert.equal(next.consultingAgreement, undefined);
  assert.equal(next.eventArea, 'in');
  assert.equal(next.audience, 'international');
  assert.equal(next.eventType, 'conference', 'a satellite symposium implies a conference');
  const company = updateEventAnswer(data, event({ activity: 'direct-faculty', eventType: 'company-services' }), 'activity', 'booth');
  assert.equal(company.eventType, undefined);
  assert.equal(company.eventArea, 'in');
});

test('changing an answer drops the answers that no longer apply', () => {
  const previous = event({ activity: 'satellite', expenses: ['registration'], accessRequired: 'yes' });
  assert.equal(updateEventAnswer(data, previous, 'expenses', ['fee']).accessRequired, undefined);
  const notMember = updateEventAnswer(data, previous, 'member', 'no');
  assert.equal(notMember.expenses, undefined);
  assert.equal(notMember.eventArea, 'in', 'Event facts are kept in case the answer is changed back');
});

test('each activity offers only the kinds of Event it applies to', () => {
  const options = (activity) => getEventQuestions(data, { activity, member: 'yes' })
    .find((question) => question.id === 'eventType')?.options.map(([value]) => value);
  assert.deepEqual(options('grant-running'), ['conference', 'tppt', 'unknown']);
  assert.deepEqual(options('direct-faculty'), ['conference', 'tppt', 'company-training', 'company-business', 'company-services', 'unknown']);
  assert.equal(options('booth'), undefined, 'booths are only offered at conferences, so the type is implied');
});

// ---- Every path through the questions ----------------------------------------------------------

const REPRESENTATIVE = {
  expenses: [['fee'], ['registration'], ['travel', 'accommodation', 'meals'], ['fee', 'registration', 'travel', 'meals'], []],
  inKindType: [['products'], ['invoices', 'speakers'], ['money']],
  sessions: [qualifiedTraining.sessions, [{ title: 'Streamed surgery', type: 'Streaming', durationMinutes: 80 }, { title: 'Lab', type: 'Hands-on', durationMinutes: 50 }], [{ title: 'Talk', type: 'General Educational', durationMinutes: 60 }]],
};

// Explores every branch, with at most one “I don’t know” per path to keep the walk short.
function* walk(answers, depth = 0) {
  const questions = getEventQuestions(data, answers);
  const next = questions.find((question) => !(question.id in answers));
  if (!next || depth > 24) {
    yield answers;
    return;
  }
  const unknownGiven = Object.values(answers).includes('unknown');
  const values = REPRESENTATIVE[next.id]
    || next.options.map(([value]) => value).filter((value) => value !== 'unknown' || !unknownGiven);
  for (const value of values) yield* walk({ ...answers, [next.id]: value }, depth + 1);
}

const WALK_STATUSES = [
  null, 'Compliant', 'Under Review', 'Not Compliant', 'Pre-Cleared',
  'Not assessed - Late Submission', 'Not assessed - Out Of Scope', 'A new status',
];
// Shown by the answer's CVS card rather than as reasons.
const CVS_CARD_MESSAGES = ['cvsRequired', 'cvsNotRequired', 'cvsInternal', 'cvsUnknown', 'cvsMecomed', 'cvsBindingCovered'];

test('every path through the questions gives a consistent, fully worded answer', () => {
  const messages = new Set(Object.keys(data.messages));
  const seenReasons = new Set();
  let paths = 0;
  for (const activity of data.activities) {
    for (const answers of walk({ activity: activity.id })) {
      paths += 1;
      const rotating = WALK_STATUSES[paths % WALK_STATUSES.length];
      for (const [variant, status] of [[answers, null], [confirmAll(answers), rotating]]) {
        {
          const result = evaluateEventSupport(data, variant, status ? evidence(status) : null);
          const where = `${JSON.stringify(variant)} / ${status}`;
          assert.ok(data.outcomes[result.outcome], `${where}: outcome ${result.outcome}`);
          for (const reason of result.reasons) {
            assert.ok(messages.has(reason.id), `${where}: message ${reason.id}`);
            seenReasons.add(reason.id);
          }
          for (const item of result.missing) {
            assert.ok(item.question ? data.questions[item.question] : messages.has(item.id), `${where}: missing ${JSON.stringify(item)}`);
            if (item.id) seenReasons.add(item.id);
          }
          for (const warning of result.warnings) {
            for (const key of ['titleId', 'messageId']) assert.ok(messages.has(warning[key]), `${where}: warning ${warning[key]}`);
          }
          for (const expense of result.expenses) assert.ok(messages.has(expense.reason) && data.expenseStates[expense.state], where);
          for (const source of result.sources) assert.ok(data.sources[source], `${where}: source ${source}`);
          if (result.outcome.startsWith('permitted')) {
            assert.deepEqual(result.missing, [], `${where}: permitted with missing facts`);
            assert.equal(result.permission, 'conditional', where);
            assert.deepEqual(result.warnings, [], where);
            assert.ok(['none', 'required'].includes(result.cvsRequirement), where);
            if (result.cvsRequirement === 'required') assert.equal(result.cvsState, 'positive', where);
          }
          if (result.ready) assert.equal(result.outcome, 'permitted-confirmed', where);
        }
      }
    }
  }
  assert.ok(paths > 1000, `only ${paths} paths explored`);
  // The walk reaches almost every reason; the rest are reached by the targeted tests above.
  const unreached = Object.keys(data.messages).filter((id) => !seenReasons.has(id)
    && !CVS_CARD_MESSAGES.includes(id)
    && !/^(exp|national|scopeUnconfirmed|conditions|outcomeIntro|missingActivity|chooseEventType)/.test(id));
  assert.deepEqual(unreached, []);
});

// ---- Linked wording ------------------------------------------------------------------------------

test('the checker’s wording links Code references and glossary terms, once per group', () => {
  const referenceIndex = createReferenceIndex({ codeChapters: chapters.filter((chapter) => chapter.part !== 'website') });
  const glossaryMap = Object.fromEntries(['Educational Grants', 'Healthcare Professional (HCP)'].map((headword) => {
    const entry = createGlossaryEntry(`${headword}:`, `<p><strong>${headword}:</strong> means …</p>`);
    return [entry.id, entry];
  }));
  const [first, second] = linkCheckerTexts([
    'An Educational Grant for HCPs (Chapter 4, Section 3; Q&A 20) <b>not bold</b>',
    'Another Educational Grant, under Annex I.',
  ], { glossaryMap, referenceIndex });
  assert.match(first, /<a href="\/code\/ch4#ch4-3-educational-grants" class="cross-reference" data-reference="code:ch4:ch4-3-educational-grants">Chapter 4, Section 3<\/a>/);
  assert.match(first, /data-reference="code:ch2:[^"]+:\d+">Q&amp;A 20<\/a>/);
  assert.match(first, /data-term="educational-grants">Educational Grant<\/span>/);
  assert.match(first, /data-term="healthcare-professional-hcp">HCPs<\/span>/);
  assert.match(first, /&lt;b&gt;not bold&lt;\/b&gt;/);
  assert.equal(second.includes('data-term="educational-grants"'), false, 'a term is linked once per group');
  assert.match(second, /data-reference="code:annex1">Annex I<\/a>/);
  assert.equal(formatMessage(data, 'cvsPending', { status: 'Under Review' }).includes('“Under Review”'), true);
});

// ---- Data validation ------------------------------------------------------------------------------

const validateRules = (rules) => validateProjectData({
  codeData: { chapters }, treeData: { trees: [] }, quizData: [], transparencyData: [], eventSupportRules: rules,
}).errors.filter((error) => error.startsWith('eventSupportRules.json'));

test('the rules file passes validation, and broken rules are reported', () => {
  assert.deepEqual(validateRules(data), []);
  const broken = structuredClone(data);
  broken.sources.scope = { chapter: 'missing', section: 0 };
  broken.conditions[0].appliesTo = ['nowhere'];
  broken.conditions[1].id = 'member';
  broken.messages.research = 'See Chapter 42.';
  broken.conferenceMatrix.booth = ['conditional:none'];
  const errors = validateRules(broken).join('\n');
  assert.match(errors, /sources\.scope/);
  assert.match(errors, /unknown tag "nowhere"/);
  assert.match(errors, /also a question ID/);
  assert.match(errors, /"Chapter 42" does not match anything/);
  assert.match(errors, /conferenceMatrix\.booth/);
});

// ---- Live CVS lookups ---------------------------------------------------------------------------

test('stale CVS responses cannot replace a newer selected event or a cleared lookup', async () => {
  const requests = [];
  const client = createCvsLookupClient(() => new Promise((resolve) => requests.push(resolve)));
  const accepted = [];
  const first = client.request('/first', {}, (value) => accepted.push(value), () => {});
  const second = client.request('/second', {}, (value) => accepted.push(value), () => {});
  requests[1]({ ok: true, json: async () => 'second' });
  await second;
  requests[0]({ ok: true, json: async () => 'first' });
  await first;
  assert.deepEqual(accepted, ['second']);
  const third = client.request('/third', {}, (value) => accepted.push(value), () => {});
  client.cancel();
  requests[2]({ ok: true, json: async () => 'third' });
  await third;
  assert.deepEqual(accepted, ['second']);
});

test('a failed refresh or a mismatched identity gives no accepted CVS evidence', async () => {
  assert.throws(() => validateCvsDetail(evidence('Compliant'), 'EMT-26-22222'), /identified/);
  const client = createCvsLookupClient(async () => ({ ok: false, json: async () => ({ error: { message: 'Unavailable' } }) }));
  let failure;
  assert.equal(await client.request('/event', {}, () => assert.fail('must not accept'), (message) => { failure = message; }), null);
  assert.equal(failure, 'Unavailable');
});
