import { getApplicableConditions, isSupportService as services } from './eventSupportConditions.js';
import { getEventQuestions } from './eventSupportQuestions.js';
import { calculateTpptEligibility } from './tpptParser.js';

const normalizeStatus = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : '';
const known = (value) => value && value !== 'unknown';
const thirdParty = (a) => ['conference', 'tppt', 'exhibition'].includes(a.eventType);
const companyEvent = (a) => a.eventType?.startsWith('company-');

export const isNationalAudience = (a) => a.crossBorder === 'no';

export function classifyCvsStatus(data, raw) {
  const status = normalizeStatus(raw);
  if (data.cvsExemptionStatuses.some((label) => normalizeStatus(label) === status)) return 'exempt';
  if (status === 'compliant') return 'positive';
  if (status === 'not compliant') return 'negative';
  if (['waiting for information', 'under review', 'under correction notice', 'under appeal', 'to be reviewed', 'pending review', 'pending', 'pre-cleared'].includes(status)) return 'pending';
  return 'unknown';
}

export function getCvsScopeWarning(data, answers, evidence) {
  if (!thirdParty(answers) || !isNationalAudience(answers) || !evidence) return null;
  const state = classifyCvsStatus(data, evidence.status?.raw);
  if (state === 'exempt') return null;
  const assessment = state === 'negative' ? 'A negative assessment is already recorded.'
    : state === 'positive' ? 'The current decision is positive, but the record still indicates that CVS scope needs to be confirmed.'
      : 'A negative assessment could still be issued.';
  return {
    id: 'national-cvs-record',
    text: `Although you indicated that no HCPs from different countries will attend, this event may still be in scope of CVS. ${assessment} Confirm its CVS scope and current decision before proceeding.`,
    precaution: true,
  };
}

export function getCodeScope(a) {
  if (a.companyApplies === 'no') return 'review';
  if (!known(a.companyApplies)) return 'unknown';
  if (a.eventArea === 'in' || a.hcpArea === 'in' || a.hcoArea === 'in') return 'in';
  if ([a.eventArea, a.hcpArea, a.hcoArea].includes('mecomed')) return 'review';
  if (a.eventArea === 'out' && ['out', 'none'].includes(a.hcpArea) && ['out', 'none'].includes(a.hcoArea)) return 'outside';
  return 'unknown';
}

export function getConferenceColumn(a) {
  if (a.eventArea === 'in') {
    if (a.crossBorder === 'no' && a.localDelegates === 'yes') return 0;
    if (a.crossBorder === 'yes' && a.twoAreaCountries === 'yes') return 1;
  }
  if (a.eventArea === 'out') {
    if (a.hcpArea === 'in') return 2;
    if (a.hcpArea === 'out' || a.hcpArea === 'none') return 3;
  }
  return null;
}

export function getConferencePosition(data, a, activity = a.activity) {
  const column = getConferenceColumn(a);
  const cell = column === null ? null : data.conferenceMatrix[activity]?.[column];
  if (!cell) return { permission: 'review', cvs: 'unknown', ruleId: 'annex1-unclassified' };
  const [permission, cvs] = cell.split(':');
  // Annex I footnote 5 includes the recipient HCO, not only the audience.
  if (permission === 'outside' && a.hcoArea === 'in') return { permission: 'review', cvs: 'unknown', ruleId: 'annex1-footnote5' };
  return { permission, cvs, ruleId: `annex1-${activity}-${column + 1}` };
}

export function getDirectSupportPosition(data, a) {
  let context = a.eventType;
  if (a.eventType === 'conference' && ['satellite', 'booth'].includes(a.role)) context = a.role;
  if (companyEvent(a) && a.overlap === 'yes') context = `${a.eventType}-overlap`;
  if (a.eventType === 'company-consulting') context = a.overlap === 'yes' ? 'company-training-overlap' : 'company-training';
  const role = ['delegate', 'poster'].includes(a.role) ? 'delegate' : known(a.role) ? 'faculty' : null;
  if (!role) return 'review';
  const position = data.directSupportMatrix[context]?.[role];
  if (position === 'equipment-exception') return a.nonPortable === 'yes' ? 'conditional' : a.nonPortable === 'no' ? 'prohibited' : 'review';
  return position || 'review';
}

export function getTpptQualification(a) {
  const agenda = calculateTpptEligibility(a.sessions || []);
  if (a.handsOnChanged === 'yes') return { state: 'changed', agenda };
  if (a.format === 'virtual') return { state: 'failed', agenda };
  const qualitative = [a.procedureSkills, a.clinicalVenue, a.standalone, a.activeStations];
  if (a.sessions?.some((s) => s.type === 'Streaming')) qualitative.push(a.streamingFollowed);
  if (qualitative.includes('no') || (a.sessions?.length && agenda.valid && !agenda.passesAgenda)) return { state: 'failed', agenda };
  if (!agenda.valid || !agenda.passesAgenda || qualitative.some((value) => value !== 'yes')) return { state: 'unknown', agenda };
  return { state: 'qualified', agenda };
}

export function evaluateEventSupport(data, a, evidence = null) {
  const activity = data.activities.find((item) => item.id === a.activity);
  const scope = getCodeScope(a);
  const result = {
    version: data.version, codeVersion: data.codeVersion, activity: a.activity,
    permission: 'review', cvsRequirement: 'unknown', cvsState: evidence ? classifyCvsStatus(data, evidence.status?.raw) : 'missing',
    codeScope: scope, ruleIds: activity ? [`activity-${activity.id}`] : [], reasons: [], sources: [...(activity?.sources || []), 'scope'],
    warnings: [], conditions: [], missing: [], expenses: [], evidence,
  };
  const note = (text, source) => { result.reasons.push(text); if (source) result.sources.push(source); };
  const prohibit = (text, source) => { result.permission = 'prohibited'; note(text, source); };
  const review = (text, source) => { if (result.permission !== 'prohibited') result.permission = 'review'; note(text, source); };
  if (!activity) { result.missing.push('Choose the planned support.'); return finish(result); }
  const earlyWarning = getCvsScopeWarning(data, a, evidence);
  if (scope === 'outside' && !['company-attendance', 'booth'].includes(a.activity)) {
    result.permission = a.eventType === 'conference' ? getConferencePosition(data, a).permission : 'outside';
    if (!['outside', 'na'].includes(result.permission)) result.permission = 'outside';
    result.cvsRequirement = 'none';
    if (earlyWarning) result.warnings.push(earlyWarning);
    note('The facts place both the activity and the relevant HCP/HCO interactions outside the Code area. Other applicable requirements still need review.', 'footnotes');
    return finish(result);
  }
  if (scope === 'unknown') result.missing.push('Confirm Code applicability and the relevant event, HCP and HCO geography.');
  if (scope === 'review') note('Company applicability or Mecomed geography needs internal review against the applicable association rules.', 'geography');
  if (!known(a.eventType) || !known(a.format)) result.missing.push('Confirm the event type and format.');

  if (a.activity === 'research' || a.activity === 'donation') {
    result.permission = 'handoff'; result.cvsRequirement = 'none';
    note(a.activity === 'research' ? 'Research funding and royalties require their dedicated Code provisions, rather than an event-support conclusion.' : 'Assess a genuine charitable donation under Chapter 4. Calling event sponsorship a donation does not remove the event rules; company-funded social celebrations remain prohibited.', activity.sources[0]);
  } else if (['items', 'demos', 'hospitality', 'in-kind', 'proctorship'].includes(a.activity)) {
    result.permission = ['in-kind', 'proctorship'].includes(a.activity) ? 'review' : 'conditional';
    result.cvsRequirement = 'none';
    note('Assess the specific arrangement and the conditions below; related event sponsorship must be checked separately.', activity.sources[0]);
    if (a.activity === 'proctorship') {
      if (a.onHcoPremises === 'yes') { result.cvsRequirement = 'none'; note('Proctorships/preceptorships on HCO premises are not subject to CVS as procedure training or a conference.', 'training'); }
      else review('Confirm a genuine proctorship/preceptorship on HCO premises; another event type may apply.', 'training');
    }
    if (a.activity === 'in-kind') {
      result.cvsRequirement = thirdParty(a) ? getConferencePosition(data, a, 'grant-running').cvs : 'unknown';
      if (a.paymentRoute === 'personal') prohibit('Funds must never be transferred to an individual organiser’s personal bank account.', 'training');
      else note('Individual-organiser support carries significant risks. Supplier payments or products require internal review and must not fund identifiable HCP conference attendance.', 'training');
    }
  } else if (a.eventType === 'conference') {
    const matrixActivity = (a.activity === 'direct-faculty' && ['satellite', 'booth'].includes(a.role)) ? 'satellite' : a.activity;
    const position = getConferencePosition(data, a, matrixActivity);
    result.permission = position.permission; result.cvsRequirement = position.cvs; result.ruleIds.push(position.ruleId);
    note('The applicable Annex I activity and event setting determine the initial position; further Code conditions still apply.', 'annex1');
    if (a.activity === 'direct-faculty' || a.activity === 'direct-delegate') {
      result.permission = getDirectSupportPosition(data, a);
      if (result.permission === 'prohibited') { result.cvsRequirement = 'none'; note('Direct support of passive conference attendance or the main programme’s faculty is not permitted. A positive CVS result does not change this.', 'annex6'); }
    }
    if (a.activity === 'company-meeting') review('Classify your company meeting separately, then indicate whether it takes place around the third-party event.', 'overlap');
  } else if (a.eventType === 'tppt') {
    result.permission = 'conditional';
    const column = getConferenceColumn(a);
    result.cvsRequirement = column === 0 ? 'none' : column === 1 || column === 2 ? 'required' : 'unknown';
    result.tppt = getTpptQualification(a);
    note('Procedure training must satisfy the qualitative criteria as well as the shared agenda thresholds; CVS does not establish this qualification.', 'tppt');
    result.sources.push('tpptOperational');
    if (result.tppt.state === 'failed') {
      if (['direct-delegate', 'direct-faculty'].includes(a.activity)) prohibit('The event does not qualify for the procedure-training exception on the supplied facts. Reassess it as a conference or change the arrangement.', 'training');
      else review('The event does not qualify as procedure training. Check conference support instead.', 'tppt');
    } else if (result.tppt.state === 'changed') {
      note('With the hands-on element cancelled or made virtual, only educational grants and registration/access to recordings may support this changed event; travel may not be paid.', 'training');
      if (a.expenses?.some((x) => !['registration'].includes(x)) && ['direct-delegate', 'direct-faculty'].includes(a.activity)) prohibit('The proposed expenses exceed the changed-training exception.', 'training');
      if (!['grant-running', 'grant-attendance', 'grant-faculty', 'direct-delegate'].includes(a.activity)) review('Reassess this changed event under the conference rules.', 'training');
    } else if (result.tppt.state !== 'qualified') result.missing.push('Confirm the procedure-training programme and qualitative criteria.');
    if (a.activity === 'company-attendance') result.permission = 'review';
  } else if (companyEvent(a)) {
    result.cvsRequirement = 'none'; result.permission = 'conditional';
    note('Apply the company-event provisions. A nearby congress does not make passive attendance support permissible.', 'company');
    if (['direct-delegate', 'direct-faculty'].includes(a.activity) || (a.activity === 'company-meeting' && a.expenses?.length)) {
      result.permission = getDirectSupportPosition(data, a);
      if (result.permission === 'prohibited') note('Direct support of this participant in this setting is not permitted under the Annex VI chart.', 'annex6');
    }
    if (['grant-running', 'grant-attendance', 'grant-faculty', 'booth', 'satellite'].includes(a.activity)) review('This support choice is framed for third-party events. Confirm the company arrangement and use the company-meeting or direct-support scenario.', 'classification');
    if (!known(a.overlap)) result.missing.push('Confirm the timing and location relative to a third-party event.');
    if (a.eventType === 'company-consulting' && ['delegate', 'poster'].includes(a.role)) review('A consulting meeting requires actual services, not passive attendance.', 'consulting');
  } else if (a.eventType === 'exhibition') {
    result.permission = 'review'; result.cvsRequirement = 'none';
    note('A purely promotional exhibition without educational sessions generally falls outside CVS assessment. Confirm the actual programme and assess the intended commercial activity internally.', 'conference');
  } else review('Classify the event before determining the support position.', 'classification');

  if (activity.group === 'grant') {
    if (a.supportStage === 'planning' && result.cvsRequirement === 'required') note('A grant arrangement may include a condition requiring the appropriate positive CVS assessment. This does not authorise providing support before that condition is fulfilled.', 'educationalGrants');
    if (a.recipient === 'individual' || a.paymentRoute === 'personal') prohibit('Educational grants must go to the qualifying organisation, not an individual HCP or personal bank account.', 'grants');
    if (a.paymentRoute === 'supplier') review('Educational grants are paid to the qualifying organisation. Review a proposed direct supplier payment as a separate in-kind arrangement.', 'grants');
    if (!known(a.recipient)) result.missing.push('Identify the grant recipient.');
    if (a.recipient === 'other') review('Confirm that the recipient qualifies; a travel agency alone is not a way to bypass grant rules.', 'educationalGrants');
    if (a.recipient === 'pco') note('Educational funds earmarked through a PCO need educational-grant safeguards even when the PCO is a commercial organisation.', 'educationalGrants');
    if (a.packageMixed === 'yes') review('Separate educational funding from commercial consideration and assess each element independently.', 'educationalGrants');
    if (a.identifiedBeneficiary === 'yes') review('Identifiable beneficiaries, including a one-person HCO or overly narrow criteria, require review to avoid indirect direct sponsorship.', 'educationalGrants');
    if (a.activity === 'grant-attendance' && a.eventArea === 'out' && a.areaBeneficiaries !== 'yes') review('Confirm the educational-grant beneficiaries and Annex I footnote 3 before relying on the overseas attendance-funding classification.', 'footnotes');
  }
  if (a.eventType === 'conference' && a.activity === 'in-kind' && a.identifiableAttendance === 'yes') prohibit('In-kind support must not circumvent the ban on funding identifiable HCP conference attendance.', 'conference');
  if (a.activity === 'demos' && a.demoKind === 'demo' && a.clinicalUse === 'yes') prohibit('Demonstration products are not for clinical patient use or onward sale. Genuine samples have different rules.', 'demoUse');
  if (a.activity === 'demos' && (!known(a.demoKind) || !known(a.clinicalUse))) result.missing.push('Confirm whether these are demos or samples and whether patient care is intended.');
  if (a.activity === 'booth' && a.packageMixed === 'yes') review('Separate any educational funding from the booth/advertising package and assess each element independently.', 'educationalGrants');
  if (a.format === 'virtual' && a.expenses?.some((x) => ['travel', 'accommodation'].includes(x))) prohibit('Travel or accommodation is not justified for virtual participation.', 'virtual');
  if (a.format === 'virtual') { result.cvsRequirement = 'none'; note('Virtual events are outside CVS assessment; relevant Code requirements still apply.', 'virtual'); }
  if (scope === 'review' && result.permission !== 'prohibited') result.permission = 'review';

  // Unknown answers remain unresolved even when the initial matrix cell allows support.
  for (const question of getEventQuestions(data, a)) {
    if (question.type === 'choice' && (!known(a[question.id]) || !question.options.some(([value]) => value === a[question.id]))) {
      result.missing.push(question.label);
    }
    if (question.type === 'multi' && (!Array.isArray(a[question.id]) || a[question.id].some((value) => !question.options.some(([option]) => option === value)))) {
      result.missing.push(question.label);
    }
  }
  applyExpenses(a, result);
  if ((['direct-delegate', 'direct-faculty', 'satellite', 'hospitality'].includes(a.activity) && !a.expenses?.length)
    || (a.activity === 'company-meeting' && !Array.isArray(a.expenses))) result.missing.push('Specify the payment or expense to be assessed.');
  if (a.intermediary !== 'yes' && a.intermediary !== 'no') result.missing.push('Confirm whether an intermediary is involved.');
  for (const condition of getApplicableConditions(data, a)) {
    const answer = a[condition.id];
    result.conditions.push({ ...condition, answer: answer || 'unknown' });
    result.sources.push(condition.source);
    if (answer === 'no' && condition.failure === 'prohibited') prohibit(`The proposed support must change: ${condition.label}.`, condition.source);
    else if (answer === 'no' && condition.failure === 'review') review(`Internal review is needed: ${condition.label}.`, condition.source);
  }
  if (thirdParty(a)) {
    if (!known(a.crossBorder)) result.missing.push('Confirm whether HCP delegates from different countries will attend.');
    if (a.format === 'hybrid') review('Assess the in-person and virtual components separately; the displayed CVS position concerns the in-person event.', 'virtual');
    const warning = getCvsScopeWarning(data, a, evidence);
    if (warning) result.warnings.push(warning);
    if (isNationalAudience(a) && !evidence) {
      result.warnings.push({ id: 'scope-unconfirmed', text: 'CVS scope not confirmed. A national-audience answer or an unsuccessful search does not establish that the event is outside CVS scope.' });
    }
  }
  if (result.cvsRequirement === 'required' && result.cvsState === 'negative') prohibit('The required CVS assessment is negative; this proposed event support cannot proceed on that basis.', 'conference');
  if (result.cvsRequirement === 'required' && result.cvsState === 'exempt') review('The CVS record and the entered event facts disagree on scope. Confirm the classification before proceeding.', 'annex1');
  return finish(result);
}

function applyExpenses(a, result) {
  const overlap = (companyEvent(a) && a.overlap === 'yes') || ['satellite', 'booth'].includes(a.role) || a.activity === 'satellite';
  const baseProhibited = result.permission === 'prohibited';
  for (const expense of a.expenses || []) {
    let state = baseProhibited ? 'not permitted' : 'subject to conditions';
    let reason = 'Reasonable, documented and limited to the permitted attendance or actual services.';
    if (expense === 'fee' && !services(a)) { state = 'not permitted'; reason = 'An honorarium requires genuine services, not passive attendance.'; }
    if (overlap && services(a) && expense === 'registration') {
      if (a.activity === 'satellite' || ['satellite', 'booth'].includes(a.role)) {
        state = a.accessRequired === 'yes' ? 'subject to conditions' : a.accessRequired === 'no' ? 'not permitted' : 'needs confirmation';
        reason = 'Only when registration is required to access the contracted services; prorate where possible.';
      } else { state = 'not permitted'; reason = 'No incremental congress registration costs for a separate company services meeting.'; }
    }
    if (overlap && services(a) && ['travel', 'accommodation'].includes(expense)) {
      if (a.activity === 'satellite' || ['satellite', 'booth'].includes(a.role)) {
        state = a.grantAlreadyCovers === 'no' ? 'subject to conditions' : a.grantAlreadyCovers === 'yes' ? 'not permitted' : 'needs confirmation';
        reason = 'No duplicate support where an educational grant already covers attendance.';
      } else {
        state = a.incrementalCongressCosts === 'no' ? 'subject to conditions' : a.incrementalCongressCosts === 'yes' ? 'not permitted' : 'needs confirmation';
        reason = 'Only actual service expenses; no incremental costs of congress attendance.';
      }
    }
    if (expense === 'meals' && overlap && a.grantAlreadyCovers !== 'no') {
      state = 'needs confirmation'; reason = 'Review existing grant hospitality, legitimate meeting purpose and perception; avoid duplicate benefits.';
    }
    if (baseProhibited) { state = 'not permitted'; reason = 'The underlying proposed support is prohibited on the supplied facts.'; }
    result.expenses.push({ id: expense, state, reason });
    if (state === 'not permitted') { result.permission = 'prohibited'; result.reasons.push(`${expense}: ${reason}`); }
    if (state === 'needs confirmation') result.missing.push(`${expense}: ${reason}`);
  }
  if (overlap) result.sources.push('overlap');
}

function finish(result) {
  result.sources = [...new Set(result.sources)];
  const outstanding = result.conditions.some((c) => c.answer !== 'yes');
  if (result.permission === 'prohibited') result.outcome = 'Not permitted under the Code';
  else if (result.permission === 'outside') result.outcome = 'Outside the Code’s scope';
  else if (result.permission === 'na') result.outcome = 'This scenario is not applicable';
  else if (result.permission === 'handoff') result.outcome = 'Use the dedicated Code provisions';
  else if (result.cvsRequirement === 'required' && result.cvsState !== 'positive') result.outcome = 'CVS assessment outstanding';
  else if (result.missing.length) result.outcome = 'More information needed';
  else if (result.permission === 'review' || result.warnings.length || result.cvsRequirement === 'unknown') result.outcome = 'Internal review required';
  else result.outcome = 'Permitted subject to conditions';
  result.ready = result.permission === 'conditional' && !outstanding && !result.missing.length && !result.warnings.length
    && (['none', 'internal'].includes(result.cvsRequirement) || (result.cvsRequirement === 'required' && result.cvsState === 'positive'));
  return result;
}

export function validateEventSupportData(data, chapters) {
  const errors = [];
  const unique = (items, label) => { if (new Set(items).size !== items.length) errors.push(`Duplicate ${label}.`); };
  unique(data.activities.map((a) => a.id), 'activity IDs'); unique(data.conditions.map((c) => c.id), 'condition IDs');
  if (!data.version || !data.codeVersion || Object.keys(data.conferenceMatrix).length !== 8 || Object.keys(data.directSupportMatrix).length !== 8) errors.push('Missing rule version or incomplete baseline matrices.');
  for (const [id, source] of Object.entries(data.sources)) {
    if (source.url) {
      if (!source.label || !source.url.startsWith('https://www.ethicalmedtech.eu/')) errors.push(`Invalid operational source ${id}.`);
    } else if (!chapters.find((chapter) => chapter.id === source.chapter)?.sections[source.section]) errors.push(`Invalid event-support source ${id}.`);
  }
  for (const item of [...data.activities, ...data.conditions]) {
    if (!item.label || !item.id) errors.push('Missing event-support item ID or label.');
    if (item.groups && !['conditional', 'review', 'prohibited'].includes(item.failure)) errors.push(`Invalid condition failure ${item.id}.`);
    for (const source of item.sources || [item.source]) if (!data.sources[source]) errors.push(`Unknown source ${source} in ${item.id}.`);
  }
  for (const [id, cells] of Object.entries(data.conferenceMatrix)) {
    if (!data.activities.some((a) => a.id === id) || cells.length !== 4 || cells.some((cell) => !/^(conditional|prohibited|review|outside|na):(none|required|internal)$/.test(cell))) errors.push(`Invalid Annex I row ${id}.`);
  }
  for (const [id, row] of Object.entries(data.directSupportMatrix)) {
    if (Object.keys(row).length !== 2 || !['faculty', 'delegate'].every((role) => ['conditional', 'prohibited', 'equipment-exception'].includes(row[role]))) errors.push(`Invalid Annex VI row ${id}.`);
  }
  for (const [id, question] of Object.entries(data.questions || {})) {
    if (question.id !== id || !question.label || !['choice', 'multi', 'agenda'].includes(question.type) || !Array.isArray(question.options)) errors.push(`Invalid question ${id}.`);
    if (new Set(question.options.map(([value]) => value)).size !== question.options.length) errors.push(`Duplicate options in ${id}.`);
  }
  if (!data.questions?.companyApplies || !data.questions?.eventType || !data.questions?.crossBorder) errors.push('Incomplete event-support question registry.');
  return errors;
}
