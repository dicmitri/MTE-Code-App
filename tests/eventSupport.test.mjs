import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadSplitCodeData } from '../scripts/lib/code-content.mjs';
import { fileURLToPath } from 'node:url';
import { evaluateEventSupport, getConferencePosition, getDirectSupportPosition, getCodeScope, getCvsScopeWarning, getTpptQualification, validateEventSupportData, classifyCvsStatus } from '../src/utils/eventSupportRules.js';
import { getEventQuestions, updateEventAnswer } from '../src/utils/eventSupportQuestions.js';
import { createCvsLookupClient, validateCvsDetail } from '../src/utils/cvsLookupClient.js';
import { calculateTpptEligibility } from '../src/utils/tpptParser.js';

const data = JSON.parse(readFileSync(new URL('../src/data/eventSupportRules.json', import.meta.url)));
const evidence = (raw) => ({ emtId: 'EMT-26-11175', name: 'Example meeting', status: { raw }, retrievedAt: '2026-09-26T10:00:00Z' });
const base = {
  companyApplies: 'yes', supportStage: 'providing', eventType: 'conference', format: 'in-person', eventArea: 'in', hcpArea: 'in', hcoArea: 'in',
  crossBorder: 'yes', twoAreaCountries: 'yes', role: 'main-faculty', recipient: 'hco', paymentRoute: 'organisation',
  areaBeneficiaries: 'yes', packageMixed: 'no', identifiedBeneficiary: 'no', intermediary: 'no', expenses: ['registration'],
  ...Object.fromEntries(data.conditions.map((c) => [c.id, 'yes'])),
};
const columns = [
  { eventArea: 'in', crossBorder: 'no', localDelegates: 'yes' },
  { eventArea: 'in', crossBorder: 'yes', twoAreaCountries: 'yes' },
  { eventArea: 'out', hcpArea: 'in', hcoArea: 'out' },
  { eventArea: 'out', hcpArea: 'out', hcoArea: 'out' },
];
// Independent expectations transcribed from the Annex I source matrix.
const rows = {
  'grant-running': ['conditional:none','conditional:required','conditional:none','outside:none'],
  'grant-attendance': ['conditional:none','conditional:required','conditional:required','na:none'],
  'grant-faculty': ['conditional:none','conditional:required','conditional:none','na:none'],
  satellite: ['conditional:none','conditional:required','conditional:none','na:none'],
  'company-attendance': ['review:internal','review:internal','review:internal','review:internal'],
  booth: ['conditional:none','conditional:required','conditional:none','review:internal'],
  'direct-delegate': ['prohibited:none','prohibited:none','prohibited:none','na:none'],
  'direct-faculty': ['prohibited:none','prohibited:none','prohibited:none','na:none'],
};
for (const [activity, cells] of Object.entries(rows)) cells.forEach((cell, column) => {
  test(`Annex I: ${activity}, setting ${column + 1}`, () => {
    const a = { ...base, ...columns[column], activity, role: activity === 'direct-delegate' ? 'delegate' : activity === 'satellite' ? 'satellite' : 'main-faculty', accessRequired: 'yes' };
    const position = getConferencePosition(data, a);
    assert.equal(`${position.permission}:${position.cvs}`, cell);
    const result = evaluateEventSupport(data, a, evidence(column === 0 ? 'Not assessed - National event' : 'Compliant'));
    assert.equal(`${result.permission}:${result.cvsRequirement}`, cell);
  });
});
const directRows = [
  ['conference','no','main-faculty','prohibited','prohibited'],
  ['conference','no','satellite','conditional','prohibited'],
  ['conference','no','booth','conditional','prohibited'],
  ['tppt','no','main-faculty','conditional','conditional'],
  ['company-training','no','company-faculty','conditional','conditional'],
  ['company-training','yes','company-faculty','conditional','prohibited'],
  ['company-business','no','company-faculty','conditional','prohibited'],
  ['company-business','yes','company-faculty','conditional','prohibited'],
];
for (const [eventType, overlap, facultyRole, faculty, delegate] of directRows) {
  for (const [role, expected] of [[facultyRole, faculty], ['delegate', delegate]]) test(`Annex VI: ${eventType}/${facultyRole}, overlap ${overlap}, role ${role}`, () => {
    assert.equal(getDirectSupportPosition(data, { ...base, eventType, overlap, role, nonPortable: 'no' }), expected);
    const result = evaluateEventSupport(data, { ...base, activity: role === 'delegate' ? 'direct-delegate' : 'direct-faculty', eventType, overlap, role, expenses: role === 'delegate' ? ['registration'] : ['fee'], nonPortable: 'no', accessRequired:'yes',
      sessions: [{type:'Hands-on',durationMinutes:70},{type:'General Educational',durationMinutes:50}], procedureSkills:'yes', clinicalVenue:'yes', standalone:'yes', activeStations:'yes', handsOnChanged:'no' }, evidence('Compliant'));
    assert.equal(result.permission, expected);
  });
}
test('non-portable equipment exception applies to stand-alone business meetings only', () => {
  assert.equal(getDirectSupportPosition(data, { eventType: 'company-business', role: 'delegate', overlap: 'no', nonPortable: 'yes' }), 'conditional');
  assert.equal(getDirectSupportPosition(data, { eventType: 'company-business', role: 'delegate', overlap: 'yes', nonPortable: 'yes' }), 'prohibited');
});
test('poster presenters remain delegates', () => {
  assert.equal(getDirectSupportPosition(data, { eventType: 'conference', role: 'poster' }), 'prohibited');
});
test('Code scope includes HCO interactions abroad and treats Mecomed uncertainty explicitly', () => {
  assert.equal(getCodeScope({ ...base, eventArea: 'out', hcpArea: 'out', hcoArea: 'in' }), 'in');
  assert.equal(getCodeScope({ ...base, eventArea: 'mecomed', hcpArea: 'out', hcoArea: 'out' }), 'review');
  assert.equal(getCodeScope({ ...base, eventArea: 'out', hcpArea: 'unknown', hcoArea: 'out' }), 'unknown');
  assert.equal(evaluateEventSupport(data, { ...base, activity: 'grant-running', eventArea: 'out', hcpArea: 'out', hcoArea: 'in' }).permission, 'review');
});
test('an unclassified mixed audience never becomes a national exemption', () => {
  const result = evaluateEventSupport(data, { ...base, activity: 'booth', twoAreaCountries: 'no' }, evidence('Compliant'));
  assert.equal(result.permission, 'review'); assert.equal(result.ready, false);
});
for (const raw of ['Under Review', 'Pre-Cleared', 'Not assessed - Late Submission', 'A new status', 'Compliant', 'Not Compliant']) test(`national audience with ${raw} retains the requested warning`, () => {
  const a = { ...base, activity: 'booth', crossBorder: 'no', localDelegates: 'yes' };
  const result = evaluateEventSupport(data, a, evidence(raw));
  assert.equal(result.warnings[0].id, 'national-cvs-record'); assert.equal(result.ready, false);
  if (raw === 'Under Review') assert.match(result.warnings[0].text, /negative assessment could still/);
  if (raw === 'Not Compliant') assert.match(result.warnings[0].text, /already recorded/);
  if (raw === 'Compliant') assert.match(result.warnings[0].text, /current decision is positive/);
});
for (const raw of ['Not assessed - Out of scope', 'Not assessed - National event', '  NOT assessed - OUT OF SCOPE  ']) test(`only named full exemption label suppresses discrepancy: ${raw}`, () => {
  assert.equal(getCvsScopeWarning(data, { ...base, crossBorder: 'no' }, evidence(raw)), null);
  assert.equal(classifyCvsStatus(data, `${raw} (unverified)`), 'unknown');
});
test('missing match/evidence cannot establish a national exemption', () => {
  const result = evaluateEventSupport(data, { ...base, activity: 'booth', crossBorder: 'no', localDelegates: 'yes' });
  assert.equal(result.warnings[0].id, 'scope-unconfirmed'); assert.equal(result.ready, false);
});
test('audience and refreshed status changes recompute the warning without changing scope facts', () => {
  const a = { ...base, crossBorder: 'no' };
  assert.ok(getCvsScopeWarning(data, a, evidence('Under Review')));
  assert.equal(getCvsScopeWarning(data, a, evidence('Not assessed - National event')), null);
  assert.equal(getCvsScopeWarning(data, { ...a, crossBorder: 'yes' }, evidence('Under Review')), null);
});
test('positive CVS cannot legalise direct conference support; negative CVS does not ban staff attendance automatically', () => {
  assert.equal(evaluateEventSupport(data, { ...base, activity: 'direct-delegate', role: 'delegate' }, evidence('Compliant')).permission, 'prohibited');
  assert.equal(evaluateEventSupport(data, { ...base, activity: 'company-attendance' }, evidence('Not Compliant')).permission, 'review');
  assert.equal(evaluateEventSupport(data, { ...base, activity: 'booth' }, evidence('Not Compliant')).permission, 'prohibited');
  assert.equal(evaluateEventSupport(data, { ...base, activity: 'booth' }, evidence('Pre-Cleared')).outcome, 'CVS assessment outstanding');
});
test('satellite expenses require access and cannot duplicate grant-funded travel', () => {
  const result = evaluateEventSupport(data, { ...base, activity: 'satellite', role: 'satellite', expenses: ['fee','registration','travel'], accessRequired: 'no', grantAlreadyCovers: 'yes' }, evidence('Compliant'));
  assert.equal(result.expenses[0].state, 'subject to conditions');
  assert.equal(result.expenses[1].state, 'not permitted'); assert.equal(result.expenses[2].state, 'not permitted');
  assert.equal(result.permission, 'prohibited');
});
test('separate company services around a congress cannot fund incremental congress costs', () => {
  const result = evaluateEventSupport(data, { ...base, eventType: 'company-consulting', activity: 'direct-faculty', role: 'company-faculty', overlap: 'yes', expenses: ['fee','travel'], incrementalCongressCosts: 'yes' });
  assert.equal(result.permission, 'prohibited');
});
test('grant payment, beneficiary selection and mixed packages receive the relevant checks', () => {
  assert.equal(evaluateEventSupport(data, { ...base, activity: 'grant-running', recipient: 'individual', paymentRoute: 'personal' }).permission, 'prohibited');
  assert.equal(evaluateEventSupport(data, { ...base, activity: 'grant-attendance', grantIndependent: 'no' }).permission, 'prohibited');
  assert.equal(evaluateEventSupport(data, { ...base, activity: 'grant-running', packageMixed: 'yes' }, evidence('Compliant')).permission, 'review');
  assert.equal(evaluateEventSupport(data, { ...base, activity: 'grant-attendance', identifiedBeneficiary: 'yes' }, evidence('Compliant')).permission, 'review');
});
test('training qualification combines the agenda and qualitative checks; changed hands-on limits costs', () => {
  const training = { ...base, eventType: 'tppt', activity: 'direct-delegate', role: 'delegate', sessions: [{type:'Hands-on',durationMinutes:70},{type:'General Educational',durationMinutes:50}], procedureSkills:'yes', clinicalVenue:'yes', standalone:'yes', activeStations:'yes', handsOnChanged:'no' };
  assert.equal(getTpptQualification(training).state, 'qualified');
  assert.equal(evaluateEventSupport(data, training, evidence('Compliant')).permission, 'conditional');
  assert.equal(getTpptQualification({ ...training, standalone:'no' }).state, 'failed');
  assert.equal(evaluateEventSupport(data, { ...training, standalone:'no' }, evidence('Compliant')).permission, 'prohibited');
  assert.equal(evaluateEventSupport(data, { ...training, handsOnChanged:'yes', expenses:['travel'] }, evidence('Compliant')).permission, 'prohibited');
  assert.equal(evaluateEventSupport(data, { ...training, handsOnChanged:'yes', expenses:['registration'] }, evidence('Compliant')).permission, 'conditional');
});
test('streamed practical training requires the following hands-on exercise', () => {
  const training = { ...base, activity:'direct-delegate', role:'delegate', eventType:'tppt', handsOnChanged:'no',
    sessions:[{type:'Hands-on',durationMinutes:40},{type:'Streaming',durationMinutes:30},{type:'General Educational',durationMinutes:50}],
    procedureSkills:'yes', clinicalVenue:'yes', standalone:'yes', activeStations:'yes' };
  assert.equal(getTpptQualification(training).state, 'unknown');
  assert.equal(getTpptQualification({ ...training, streamingFollowed:'no' }).state, 'failed');
  assert.equal(getTpptQualification({ ...training, streamingFollowed:'yes' }).state, 'qualified');
  assert.equal(evaluateEventSupport(data, { ...training, streamingFollowed:'yes' }, evidence('Compliant')).ready, true);
});
test('each visible unknown fact prevents an otherwise complete grant assessment from being ready', () => {
  const proposal = { ...base, activity:'grant-running' };
  assert.equal(evaluateEventSupport(data, proposal, evidence('Compliant')).ready, true);
  for (const question of getEventQuestions(data, proposal).filter((q)=>q.type==='choice')) {
    const result = evaluateEventSupport(data, { ...proposal, [question.id]:'unknown' }, evidence('Compliant'));
    assert.equal(result.ready, false, question.id);
    assert.ok(result.missing.length, question.id);
  }
  assert.equal(evaluateEventSupport(data, { ...proposal, paymentRoute:'unrecognised' }, evidence('Compliant')).ready, false);
});
test('commercial packages containing educational funding require a separate grant assessment', () => {
  const result = evaluateEventSupport(data, { ...base, activity:'booth', packageMixed:'yes' }, evidence('Compliant'));
  assert.equal(result.permission, 'review'); assert.equal(result.ready, false);
  assert.match(result.reasons.join(' '), /Separate any educational funding/);
});
test('invalid and negative programme values cannot create a passing calculation', () => {
  for (const durationMinutes of [-120, Infinity, NaN, '', null, true, '   ']) {
    const calculation = calculateTpptEligibility([{ type:'Hands-on', durationMinutes:60 },{ type:'General Educational', durationMinutes }]);
    assert.equal(calculation.valid, false); assert.equal(calculation.passesAgenda, false);
  }
});
test('virtual support retains Code checks and hybrid needs component review', () => {
  assert.equal(evaluateEventSupport(data, { ...base, activity:'booth', format:'virtual' }).cvsRequirement, 'none');
  assert.equal(evaluateEventSupport(data, { ...base, activity:'direct-faculty', role:'satellite', format:'virtual', expenses:['travel'] }).permission, 'prohibited');
  assert.equal(evaluateEventSupport(data, { ...base, activity:'booth', format:'hybrid' }, evidence('Compliant')).permission, 'review');
});
test('items, demos, individual organisers and intermediaries have separate safeguards', () => {
  assert.equal(evaluateEventSupport(data, { ...base, activity:'items', itemRules:'no' }).permission, 'prohibited');
  assert.equal(evaluateEventSupport(data, { ...base, activity:'demos', demoKind:'demo', clinicalUse:'yes' }).permission, 'prohibited');
  assert.equal(evaluateEventSupport(data, { ...base, activity:'in-kind', recipient:'individual', paymentRoute:'personal' }).permission, 'prohibited');
  assert.equal(evaluateEventSupport(data, { ...base, activity:'booth', intermediary:'yes', intermediaryRules:'no' }, evidence('Compliant')).permission, 'review');
  assert.equal(evaluateEventSupport(data, { ...base, activity:'proctorship', onHcoPremises:'yes' }).cvsRequirement, 'none');
});
test('editing a branch clears dependent and proposal-specific answers', () => {
  const previous = { ...base, activity:'direct-faculty', role:'satellite', expenses:['registration'], accessRequired:'yes' };
  const next = updateEventAnswer(data, previous, 'expenses', ['fee']);
  assert.equal(next.accessRequired, undefined); assert.equal(next.consultingAgreement, undefined);
  const changed = updateEventAnswer(data, previous, 'activity', 'grant-running');
  assert.equal(changed.expenses, undefined); assert.equal(changed.consultingAgreement, undefined); assert.equal(changed.eventArea, 'in');
  assert.ok(getEventQuestions(data, { ...base, eventType:'tppt' }).some((q)=>q.type==='agenda'));
});
test('rule sources resolve to existing sections and invalid references fail validation', () => {
  const chapters = loadSplitCodeData(fileURLToPath(new URL('..', import.meta.url))).chapters;
  assert.deepEqual(validateEventSupportData(data, chapters), []);
  assert.ok(validateEventSupportData({ ...data, sources: { ...data.sources, scope: { chapter:'missing', section:0 } } }, chapters).length);
});
test('stale CVS responses cannot replace a newer selected event or a cleared lookup', async () => {
  const requests = [];
  const client = createCvsLookupClient(() => new Promise((resolve)=>requests.push(resolve)));
  const accepted = [];
  const first = client.request('/first', {}, (value)=>accepted.push(value), ()=>{});
  const second = client.request('/second', {}, (value)=>accepted.push(value), ()=>{});
  requests[1]({ ok:true, json:async()=> 'second' }); await second;
  requests[0]({ ok:true, json:async()=> 'first' }); await first;
  assert.deepEqual(accepted, ['second']);
  const third = client.request('/third', {}, (value)=>accepted.push(value), ()=>{});
  client.cancel(); requests[2]({ ok:true, json:async()=> 'third' }); await third;
  assert.deepEqual(accepted, ['second']);
});
test('failed refresh and mismatched identity provide no accepted current evidence', async () => {
  assert.throws(()=>validateCvsDetail(evidence('Compliant'),'EMT-26-22222'), /identified/);
  const client=createCvsLookupClient(async()=>({ok:false,json:async()=>({error:{message:'Unavailable'}})}));
  let failure;
  assert.equal(await client.request('/event',{},()=>assert.fail('must not accept'),(message)=>failure=message),null);
  assert.equal(failure,'Unavailable');
});
