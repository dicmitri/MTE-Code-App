import React from 'react';
import { AppIcon } from './AppIcons';
import { FULL_CODE_DATA } from '../data/codeData';
import { generateSectionId } from '../utils/textUtils';
import { buildCodeSectionPath } from '../utils/routeUtils';

export function sourceLink(data, key) {
  const source = data.sources[key];
  if (source?.url) return { href: source.url, label: source.label };
  const chapter = FULL_CODE_DATA.find((item) => item.id === source?.chapter);
  const section = chapter?.sections[source.section];
  if (!section) return null;
  return { href: buildCodeSectionPath(chapter.id, generateSectionId(chapter.id, section.title, source.section)), label: `${chapter.title} — ${section.title}` };
}

export default function EventSupportResult({ data, result, compact = false }) {
  const prohibited = result.permission === 'prohibited';
  const colour = prohibited ? 'border-red-200 bg-red-50 text-red-900' : result.ready ? 'border-teal-200 bg-teal-50 text-teal-900' : 'border-amber-200 bg-amber-50 text-amber-950';
  return <section className="space-y-5" aria-label="Support assessment">
    <div className={`rounded-2xl border p-5 ${colour}`}>
      <div className="flex items-start gap-3"><AppIcon name={prohibited ? 'XCircle' : result.ready ? 'CheckCircle' : 'AlertTriangle'} size={24} /><div>
        <h2 className="text-xl font-bold">{result.outcome}</h2>
        {!compact && <p className="mt-2 text-sm">This is the Code position for the proposed arrangement. Company approval and applicable local requirements remain part of the review.</p>}
      </div></div>
    </div>
    {result.warnings.map((warning) => <div key={warning.id} role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
      <p className="font-bold">{warning.id === 'national-cvs-record' ? 'The CVS record needs attention' : 'CVS scope not confirmed'}</p>
      <p className="mt-2">{warning.text}</p>
      {warning.precaution && <p className="mt-2 text-xs">This precaution compares your answer with the live CVS record; it does not replace the Code rules.</p>}
    </div>)}
    {!compact && <>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-800">Why this answer?</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">{result.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-800">CVS position</h3>
        <p className="mt-2 text-sm text-slate-600">{result.cvsRequirement === 'required' ? 'A positive CVS assessment is required for this activity.' : result.cvsRequirement === 'internal' ? 'Company attendance requires prior internal review.' : result.cvsRequirement === 'unknown' ? 'CVS requirement needs confirmation from the event facts.' : result.warnings.length ? 'The audience answers suggest CVS may not be required, but its scope is not confirmed.' : 'This activity does not require CVS on the supplied facts.'}</p>
        {result.evidence ? <div className="mt-3 text-sm">
          <p className="font-semibold">{result.evidence.name} · {result.evidence.emtId}</p>
          <p className="mt-1">Current overall status: <strong>{result.evidence.status.raw}</strong></p>
          <p className="mt-1 text-xs text-slate-500">Retrieved {new Date(result.evidence.retrievedAt).toLocaleString()}. The status can change.</p>
          <a href={`https://cvs.solutions.iqvia.com/event/detail/${result.evidence.emtId}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[#0099A7] underline">View this event in CVS</a>
        </div> : <p className="mt-2 text-sm text-amber-800">No current CVS detail-page evidence has been confirmed.</p>}
      </div>
      {!!result.missing.length && <div className="rounded-xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-semibold">Still to confirm</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{[...new Set(result.missing)].map((text) => <li key={text}>{text}</li>)}</ul></div>}
      {!!result.expenses.length && <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><caption className="p-4 text-left font-semibold">Proposed payments</caption><thead><tr className="bg-slate-50"><th className="p-3">Cost</th><th className="p-3">Position</th><th className="p-3">Condition/reason</th></tr></thead><tbody>{result.expenses.map((expense) => <tr key={expense.id} className="border-t border-slate-100"><td className="p-3 capitalize">{expense.id}</td><td className="p-3">{expense.state}</td><td className="p-3">{expense.reason}</td></tr>)}</tbody></table></div>}
      {!!result.conditions.length && <div className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Conditions</h3><ul className="mt-3 space-y-3 text-sm">{result.conditions.map((condition) => <li key={condition.id} className="flex gap-2"><AppIcon name={condition.answer === 'yes' ? 'Check' : 'HelpCircle'} size={16} className="mt-0.5 shrink-0" /><span><strong>{condition.answer === 'yes' ? 'Confirmed' : condition.answer === 'no' ? 'Not met' : 'Not yet confirmed'}:</strong> {condition.label}</span></li>)}</ul></div>}
      <div className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Code provisions</h3><ul className="mt-3 space-y-2 text-sm">{result.sources.map((key) => {
        const link = sourceLink(data, key); return link && <li key={key}><a href={link.href} target="_blank" rel="noopener noreferrer" className="text-[#0099A7] hover:underline">{link.label} <span className="no-print text-xs">(opens in a new tab)</span></a></li>;
      })}</ul></div>
    </>}
  </section>;
}
