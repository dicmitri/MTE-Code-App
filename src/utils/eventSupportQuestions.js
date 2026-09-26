import { getApplicableConditions } from './eventSupportConditions.js';

const yesNo = [['yes', 'Yes'], ['no', 'No'], ['unknown', 'I don’t know']];
const q = (id, label, options = yesNo, help = '', type = 'choice') => ({ id, label, options, help, type });
export function getEventQuestions(data, a) {
  const q = (id) => ({ ...data.questions[id], help: data.questions[id].help.replace('{countries}', data.listedCountries.join(', ')) });
  const questions = [
    q('companyApplies'),
    q('supportStage'),
    q('eventType'),
    q('format'),
    q('eventArea'),
    q('hcpArea'),
    q('hcoArea'),
  ];
  if (['conference', 'tppt', 'exhibition'].includes(a.eventType)) {
    questions.push(q('crossBorder'));
    if (a.crossBorder === 'no') questions.push(q('localDelegates'));
    if (a.crossBorder === 'yes' && a.eventArea === 'in') questions.push(q('twoAreaCountries'));
    if (a.activity === 'grant-attendance' && a.eventArea === 'out') questions.push(q('areaBeneficiaries'));
  }
  if (a.eventType?.startsWith('company-') || a.activity === 'hospitality') questions.push(q('overlap'));
  if (a.activity === 'booth') questions.push(q('packageMixed'));
  if (['direct-delegate', 'direct-faculty', 'company-meeting'].includes(a.activity)) questions.push(q('role'));
  if (a.eventType === 'company-business' && ['delegate', 'poster'].includes(a.role)) questions.push(q('nonPortable'));
  if (data.activities.find((item) => item.id === a.activity)?.group === 'grant' || a.activity === 'in-kind') {
    questions.push(q('recipient'));
    questions.push(q('paymentRoute'));
    questions.push(q('packageMixed'));
    if (a.activity !== 'in-kind') questions.push(q('identifiedBeneficiary'));
    else questions.push(q('identifiableAttendance'));
  }
  if (['direct-delegate', 'direct-faculty', 'satellite', 'company-meeting', 'hospitality'].includes(a.activity)) {
    questions.push(q('expenses'));
    if (a.expenses?.includes('registration') && (a.activity === 'satellite' || ['satellite', 'booth'].includes(a.role))) questions.push(q('accessRequired'));
    if (a.expenses?.some((x) => ['travel', 'accommodation', 'meals'].includes(x)) && (a.activity === 'satellite' || ['satellite', 'booth'].includes(a.role) || a.overlap === 'yes')) questions.push(q('grantAlreadyCovers'));
    if (a.overlap === 'yes' && !['satellite', 'booth'].includes(a.role) && a.expenses?.some((x) => ['travel', 'accommodation'].includes(x))) questions.push(q('incrementalCongressCosts'));
  }
  if (a.eventType === 'tppt') {
    questions.push(q('handsOnChanged'));
    if (a.handsOnChanged !== 'yes') {
      questions.push(q('sessions'));
      questions.push(q('procedureSkills'));
      if (a.sessions?.some((session) => session.type === 'Streaming')) questions.push(q('streamingFollowed'));
      questions.push(q('clinicalVenue'));
      questions.push(q('standalone'));
      questions.push(q('activeStations'));
    }
  }
  if (a.activity === 'proctorship') questions.push(q('onHcoPremises'));
  if (a.activity === 'demos') {
    questions.push(q('demoKind'));
    questions.push(q('clinicalUse'));
  }
  questions.push(q('intermediary'));
  return questions;
}

export function getConditionQuestions(data, answers) {
  return getApplicableConditions(data, answers).map((condition) => q(condition.id, condition.label, [
    ['yes', 'Confirmed'], ['no', 'Not met'], ['unknown', 'Not yet confirmed'],
  ]));
}

export function updateEventAnswer(data, answers, key, value) {
  const next = { ...answers, [key]: value };
  // Answers to conditions belong to the particular proposal, not all alternatives.
  if (key === 'activity' || getEventQuestions(data, answers).some((question) => question.id === key)) {
    for (const condition of data.conditions) delete next[condition.id];
  }
  if (key === 'activity') {
    for (const id of ['role', 'expenses', 'recipient', 'paymentRoute', 'packageMixed', 'identifiedBeneficiary', 'identifiableAttendance', 'accessRequired', 'grantAlreadyCovers', 'incrementalCongressCosts', 'demoKind', 'clinicalUse', 'onHcoPremises']) delete next[id];
    if (key === 'activity' && value === 'direct-delegate') next.role = 'delegate';
    if (value === 'satellite') next.role = 'satellite';
    if (value === 'hospitality') next.expenses = ['meals'];
  }
  if (key === 'crossBorder') { delete next.localDelegates; delete next.twoAreaCountries; }
  if (key === 'eventType') {
    for (const id of ['role', 'overlap', 'expenses', 'sessions', 'procedureSkills', 'clinicalVenue', 'standalone', 'activeStations', 'handsOnChanged']) delete next[id];
    if (next.activity === 'direct-delegate') next.role = 'delegate';
  }
  const visible = new Set([...getEventQuestions(data, next), ...getConditionQuestions(data, next)].map((question) => question.id));
  for (const id of Object.keys(next)) if (id !== 'activity' && !visible.has(id)) delete next[id];
  return next;
}
