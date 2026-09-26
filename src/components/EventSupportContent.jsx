import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppIcon } from './AppIcons';
import CvsEventLookup from './CvsEventLookup';
import EventSupportAgenda from './EventSupportAgenda';
import EventSupportResult from './EventSupportResult';
import { useCvsLookup } from '../hooks/useCvsLookup';
import EVENT_SUPPORT_DATA from '../data/eventSupportRules.json';
import { evaluateEventSupport } from '../utils/eventSupportRules';
import { getConditionQuestions, getEventQuestions, updateEventAnswer } from '../utils/eventSupportQuestions';

const stages = ['Planned support', 'Event details', 'Conditions', 'CVS check', 'Your answer'];
const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#7654A1] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40';
const secondary = 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:border-[#7654A1]';
const hasAnswer = (question, answers) => question.type === 'agenda' || question.type === 'multi' || Boolean(answers[question.id]);

function Question({ question, answers, onChange }) {
  if (question.type === 'agenda') return <EventSupportAgenda sessions={answers.sessions} onChange={(sessions) => onChange('sessions', sessions)} />;
  return <fieldset>
    <legend className="text-xl font-semibold text-slate-800">{question.label}</legend>
    {question.help && <p className="mt-3 text-sm leading-relaxed text-slate-500">{question.help}</p>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {question.options.map(([value, label]) => {
        const checked = question.type === 'multi' ? answers[question.id]?.includes(value) || false : answers[question.id] === value;
        return <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm ${checked ? 'border-[#7654A1] bg-purple-50 text-[#634488]' : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300'}`}>
          <input type={question.type === 'multi' ? 'checkbox' : 'radio'} name={question.id} value={value} checked={checked} onChange={() => onChange(question.id, question.type === 'multi'
            ? checked ? answers[question.id].filter((item) => item !== value) : [...(answers[question.id] || []), value]
            : value)} className="mt-0.5 accent-[#7654A1]" /><span>{label}</span>
        </label>;
      })}
    </div>
    {question.type === 'multi' && <button type="button" onClick={() => onChange(question.id, [])} className="mt-3 text-sm text-[#7654A1] underline">No attendance costs proposed</button>}
  </fieldset>;
}

export default function EventSupportContent({ onGoHome, scrollRef }) {
  const [answers, setAnswers] = useState({});
  const [stage, setStage] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [overview, setOverview] = useState(false);
  const [assessedAt, setAssessedAt] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [identityNotice, setIdentityNotice] = useState(false);
  const headingRef = useRef(null);
  const mounted = useRef(true);
  const eventIdentity = useRef(null);
  const assessmentRequest = useRef(0);
  const lookup = useCvsLookup();
  const data = EVENT_SUPPORT_DATA;
  const result = useMemo(() => evaluateEventSupport(data, answers, lookup.status), [answers, lookup.status]);
  const activity = data.activities.find((item) => item.id === answers.activity);
  const eventQuestions = getEventQuestions(data, answers);
  const conditions = getConditionQuestions(data, answers);
  const question = eventQuestions[Math.min(questionIndex, eventQuestions.length - 1)];
  const isThirdParty = ['conference', 'tppt', 'exhibition'].includes(answers.eventType);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { scrollRef?.current?.scrollTo({ top: 0 }); headingRef.current?.focus(); }, [stage, questionIndex]);
  useEffect(() => {
    const nextId = lookup.selected?.emtId;
    if (!nextId) return;
    if (eventIdentity.current && eventIdentity.current !== nextId) {
      assessmentRequest.current += 1;
      setPreparing(false); setPrinting(false); setIdentityNotice(true);
      setAnswers((previous) => ({ activity: previous.activity, companyApplies: previous.companyApplies }));
      setStage(1); setQuestionIndex(1); setAssessedAt(null); setOverview(false);
    }
    eventIdentity.current = nextId;
  }, [lookup.selected?.emtId]);
  useEffect(() => {
    if (!printing || lookup.busy) return;
    const timer = setTimeout(() => { window.print(); setPrinting(false); }, 100);
    return () => clearTimeout(timer);
  }, [printing, lookup.busy]);

  const change = (key, value) => {
    assessmentRequest.current += 1; setPreparing(false); setPrinting(false);
    setAnswers((previous) => updateEventAnswer(data, previous, key, value));
    setAssessedAt(null); setOverview(false);
  };
  const choose = (id) => {
    assessmentRequest.current += 1; setPreparing(false); setPrinting(false); setIdentityNotice(false);
    const next = updateEventAnswer(data, answers, 'activity', id);
    setAnswers(next); setOverview(false); setAssessedAt(null);
    const index = getEventQuestions(data, next).findIndex((item) => !hasAnswer(item, next));
    setQuestionIndex(Math.max(0, index)); setStage(index < 0 ? 2 : 1);
  };
  const nextQuestion = () => {
    if (questionIndex < eventQuestions.length - 1) setQuestionIndex(questionIndex + 1);
    else setStage(2);
  };
  const back = () => {
    assessmentRequest.current += 1; setPreparing(false); setPrinting(false);
    if (stage === 1 && questionIndex > 0) setQuestionIndex(questionIndex - 1);
    else if (stage === 4) setStage(isThirdParty ? 3 : 2);
    else if (stage === 2) { setStage(1); setQuestionIndex(eventQuestions.length - 1); }
    else setStage(Math.max(0, stage - 1));
  };
  const showAnswer = async () => {
    const request = ++assessmentRequest.current;
    setPreparing(true);
    if (lookup.selected) await lookup.refresh();
    if (!mounted.current || assessmentRequest.current !== request) return;
    setIdentityNotice(false);
    setAssessedAt(new Date().toISOString()); setStage(4); setPreparing(false);
  };
  const printSummary = async () => {
    const request = ++assessmentRequest.current;
    setPreparing(true);
    if (lookup.selected) await lookup.refresh();
    if (!mounted.current || assessmentRequest.current !== request) return;
    setAssessedAt(new Date().toISOString()); setPreparing(false); setPrinting(true);
  };
  const reset = () => { assessmentRequest.current += 1; setPreparing(false); setPrinting(false); setIdentityNotice(false); eventIdentity.current = null; lookup.clearLookup(); setAnswers({}); setStage(0); setQuestionIndex(0); setOverview(false); setAssessedAt(null); };

  return <main ref={scrollRef} className="h-full flex-1 overflow-y-auto bg-slate-50 custom-scrollbar print:h-auto print:overflow-visible print:bg-white">
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 print:p-0">
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <button type="button" onClick={onGoHome} className="flex items-center gap-1 text-sm text-slate-500"><AppIcon name="ChevronLeft" size={16} /> Home</button>
        {!!answers.activity && <button type="button" onClick={reset} className="text-sm font-semibold text-[#7654A1]">Start again</button>}
      </div>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-widest text-[#7654A1]">Event support · Code {data.codeVersion}</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl font-bold tracking-tight text-slate-800 outline-none sm:text-4xl">Can I support this event?</h1>
        <p className="mt-3 text-slate-500">Check the company’s specific proposal, then explore other support options.</p>
      </div>
      <nav aria-label="Assessment progress" className="no-print mb-7 flex flex-wrap gap-2">{stages.map((label, index) => <span key={label} aria-current={stage === index ? 'step' : undefined} className={`rounded-full px-3 py-2 text-xs font-semibold ${stage === index ? 'bg-[#7654A1] text-white' : 'bg-white text-slate-400'}`}>{index + 1}. {label}</span>)}</nav>
      {stage === 0 && <div className="no-print">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">What does the company plan to provide?</h2>
        <p className="mb-5 text-sm text-slate-500">Choose one activity. For a package, check each element separately using the alternatives after your answer.</p>
        <div className="grid gap-3 sm:grid-cols-2">{data.activities.map((item) => <button key={item.id} type="button" onClick={() => choose(item.id)} className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#7654A1] hover:shadow-md">
          <span className="mt-1 rounded-lg bg-purple-50 p-2 text-[#7654A1]"><AppIcon name={item.group === 'grant' ? 'Gift' : item.group === 'consulting' ? 'FileText' : 'Compass'} size={20} /></span>
          <span><strong className="block text-sm text-slate-800">{item.label}</strong><span className="mt-2 block text-xs leading-relaxed text-slate-500">{item.description}</span></span>
        </button>)}</div>
      </div>}
      {stage === 1 && <div className="no-print rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {identityNotice && <p role="status" className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">You selected a different CVS event. Reconfirm its event details and support conditions before obtaining an answer.</p>}
        <p className="mb-5 text-xs font-semibold text-[#7654A1]">{activity?.label} · Question {Math.min(questionIndex + 1, eventQuestions.length)} of {eventQuestions.length}</p>
        <Question key={question.id} question={question} answers={answers} onChange={change} />
        <div className="mt-8 flex justify-between"><button type="button" onClick={back} className={secondary}><AppIcon name="ChevronLeft" size={16} /> Back</button><button type="button" disabled={!hasAnswer(question, answers)} onClick={nextQuestion} className={primary}>Continue <AppIcon name="ChevronRight" size={16} /></button></div>
      </div>}
      {stage === 2 && <div className="no-print rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold">Confirm the relevant conditions</h2><p className="mt-2 text-sm text-slate-500">Unconfirmed conditions will remain visible in your answer. They do not count as satisfied.</p>
        <div className="mt-6 space-y-6">{conditions.map((condition) => <fieldset key={condition.id} className="border-b border-slate-100 pb-5"><legend className="mb-3 text-sm font-medium text-slate-700">{condition.label}</legend><div className="flex flex-wrap gap-3">{condition.options.map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"><input type="radio" name={condition.id} checked={answers[condition.id] === value} onChange={() => change(condition.id, value)} className="accent-[#7654A1]" />{label}</label>)}</div></fieldset>)}</div>
        <div className="mt-7 flex flex-wrap justify-between gap-3"><button type="button" onClick={back} className={secondary}>Back</button><button type="button" disabled={preparing} onClick={() => isThirdParty ? setStage(3) : showAnswer()} className={primary}>{isThirdParty ? 'Continue to CVS check' : 'Show my answer'}</button></div>
      </div>}
      {stage === 3 && <div className="no-print">
        <h2 className="text-xl font-semibold">Check the event in CVS</h2>
        <p className="mt-3 text-sm text-slate-600">{result.permission === 'prohibited' ? 'This activity is already prohibited on the facts entered. A CVS decision will not change that answer; you can continue directly.' : result.cvsRequirement === 'required' ? 'Your proposed support requires a positive assessment. Identify the exact event and edition.' : answers.crossBorder === 'no' ? 'Even with a national audience, a CVS record may indicate the event is still in scope. Check the record before relying on an exemption.' : 'CVS may help confirm the event’s scope. A missing match does not establish an exemption.'}</p>
        <CvsEventLookup lookup={lookup} />
        <div className="mt-7 flex flex-wrap justify-between gap-3"><button type="button" onClick={back} className={secondary}>Back</button><button type="button" disabled={Boolean(lookup.busy) || preparing} onClick={showAnswer} className={primary}>{preparing ? 'Refreshing current status…' : 'Show my answer'}</button></div>
        <p className="mt-3 text-xs text-slate-500">You can continue without a confirmed match. Missing required evidence will remain unresolved.</p>
      </div>}
      {stage === 4 && <>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-800">{activity?.label}</h2><p className="mt-1 text-xs text-slate-500">Rule version {result.version} · Assessment {assessedAt ? new Date(assessedAt).toLocaleString() : 'being updated'}</p></div><div className="no-print flex flex-wrap gap-2"><button type="button" onClick={() => { assessmentRequest.current += 1; setPreparing(false); setPrinting(false); setStage(1); setQuestionIndex(0); }} className={secondary}>Edit answers</button><button type="button" disabled={preparing || Boolean(lookup.busy)} onClick={printSummary} className={secondary}><AppIcon name="Printer" size={16} /> {preparing ? 'Refreshing…' : 'Print summary'}</button></div></div>
        {lookup.error && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{lookup.error.message} Current CVS evidence is not confirmed.</p>}
        <EventSupportResult data={data} result={result} />
        {lookup.selected && <button type="button" className="no-print mt-4 text-sm font-semibold text-[#7654A1] underline" disabled={Boolean(lookup.busy)} onClick={() => lookup.refresh()}>Refresh CVS status</button>}
        <details className="mt-6 rounded-xl border border-slate-200 bg-white p-5 print:hidden"><summary className="cursor-pointer text-sm font-semibold">Review the facts entered</summary><AnswerFacts questions={[...eventQuestions, ...conditions]} answers={answers} /></details>
        <div className="hidden print:block"><h3 className="mt-6 font-semibold">Facts entered</h3><AnswerFacts questions={[...eventQuestions, ...conditions]} answers={answers} /></div>
        <div className="no-print mt-7"><button type="button" aria-expanded={overview} onClick={() => setOverview(!overview)} className={primary}>{overview ? 'Hide other support options' : 'What other support could we provide?'} <AppIcon name="ChevronDown" size={16} /></button></div>
        {overview && <section className="no-print mt-6"><h2 className="mb-3 text-xl font-semibold">Other support options for this event</h2><p className="mb-5 text-sm text-slate-500">These use the same event facts and CVS evidence. Activity-specific costs, recipients and conditions must be confirmed for each new proposal.</p><div className="grid gap-3 sm:grid-cols-2">{data.activities.filter((item) => item.id !== answers.activity).map((item) => {
          const candidate = evaluateEventSupport(data, updateEventAnswer(data, answers, 'activity', item.id), lookup.status);
          return <button key={item.id} type="button" onClick={() => choose(item.id)} className="rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-[#7654A1]"><strong className="block text-sm text-slate-800">{item.label}</strong><span className={`mt-2 block text-xs font-semibold ${candidate.permission === 'prohibited' ? 'text-red-700' : 'text-amber-800'}`}>{candidate.outcome}</span><span className="mt-2 block text-xs text-slate-500">{candidate.cvsRequirement === 'required' ? 'Positive CVS assessment required.' : candidate.warnings.length ? 'CVS scope warning also applies.' : 'Check this proposal’s conditions.'}</span><span className="mt-3 block text-xs font-semibold text-[#7654A1]">Check this option →</span></button>;
        })}</div></section>}
      </>}
    </div>
  </main>;
}

function AnswerFacts({ questions, answers }) {
  return <dl className="mt-4 space-y-3 text-sm">{questions.map((question) => <div key={question.id}><dt className="font-semibold text-slate-700">{question.label}</dt><dd className="mt-1 text-slate-500">{question.type === 'agenda' ? (answers.sessions || []).map((s) => `${s.title}: ${s.type}, ${s.durationMinutes} min`).join('; ') || 'Not confirmed' : question.type === 'multi' ? (answers[question.id] || []).join(', ') || 'No costs specified' : question.options.find(([value]) => value === answers[question.id])?.[1] || 'Not confirmed'}</dd></div>)}</dl>;
}
