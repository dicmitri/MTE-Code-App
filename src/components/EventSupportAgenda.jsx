import React, { useEffect, useRef, useState } from 'react';
import { AppIcon } from './AppIcons';
import { calculateTpptEligibility, parseTpptSessions } from '../utils/tpptParser.js';

const types = ['Hands-on', 'Streaming', 'Case Study', 'General Educational', 'Other'];
export default function EventSupportAgenda({ sessions = [], onChange }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const token = useRef(0);
  useEffect(() => () => { token.current += 1; }, []);
  const result = calculateTpptEligibility(sessions);
  const changeSessions = (next) => { token.current += 1; setBusy(false); setError(''); onChange(next); };
  const update = (index, key, value) => changeSessions(sessions.map((s, i) => i === index ? { ...s, [key]: value } : s));
  const importPdf = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const identity = ++token.current;
    setBusy(true); setError('');
    let pdf;
    try {
      const [pdfjs, extraction, worker] = await Promise.all([
        import('pdfjs-dist'), import('../utils/tpptExtraction.js'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      ]);
      if (file.size > 25 * 1024 * 1024) throw new Error('Use a PDF smaller than 25 MB.');
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
      const extracted = await extraction.extractPdfTextFromPdf(pdf);
      if (token.current === identity) { setText(extracted); onChange(parseTpptSessions(extracted)); }
    } catch (failure) { if (token.current === identity) setError(failure.message || 'Could not read this PDF. Paste the agenda or enter sessions below.'); }
    finally { await pdf?.destroy(); if (token.current === identity) setBusy(false); }
  };
  return <div className="space-y-4">
    <label className="block text-sm font-medium text-slate-700">Paste a timed agenda
      <textarea value={text} onChange={(e) => { token.current += 1; setBusy(false); setText(e.target.value); }} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder={'09:00 - 10:00 Hands-on lab\n10:00 - 10:30 Interactive case study'} />
    </label>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy || !text.trim()} onClick={() => changeSessions(parseTpptSessions(text))} className="rounded-lg bg-[#7654A1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Read agenda</button>
      <label className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">{busy ? 'Reading PDF…' : 'Import PDF'}<input className="mt-1 block max-w-52 text-xs" type="file" accept="application/pdf" disabled={busy} onChange={importPdf} /></label>
    </div>
    {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}
    <p className="text-sm text-slate-500">Check every session, including non-practical time. Suggested categories need your review.</p>
    {sessions.map((session, index) => <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_160px_90px_32px]">
      <input aria-label={`Session ${index + 1} title`} value={session.title || ''} onChange={(e) => update(index, 'title', e.target.value)} className="min-w-0 rounded border border-slate-200 p-2 text-sm" />
      <select aria-label={`Session ${index + 1} type`} value={session.type} onChange={(e) => update(index, 'type', e.target.value)} className="rounded border border-slate-200 p-2 text-sm">{types.map((type) => <option key={type}>{type}</option>)}</select>
      <label className="text-xs text-slate-500">Minutes<input type="number" min="0" aria-label={`Session ${index + 1} minutes`} value={session.durationMinutes} onChange={(e) => update(index, 'durationMinutes', e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded border border-slate-200 p-2 text-sm" /></label>
      <button type="button" aria-label={`Remove session ${index + 1}`} onClick={() => changeSessions(sessions.filter((_, i) => i !== index))}><AppIcon name="X" /></button>
    </div>)}
    <button type="button" onClick={() => changeSessions([...sessions, { title: 'New session', type: 'General Educational', durationMinutes: 0 }])} className="text-sm font-semibold text-[#7654A1]">+ Add session</button>
    <div role="status" className="rounded-xl bg-slate-50 p-4 text-sm">
      {!result.valid ? 'Correct invalid or negative durations before using this calculation.' : result.total > 0
        ? `${result.total} minutes total · ${Math.round(result.handsOn / result.total * 100)}% hands-on · ${Math.round(result.practical / result.total * 100)}% practical. ${result.passesAgenda ? 'Numerical thresholds met.' : 'Numerical thresholds not met.'}`
        : 'Enter the full programme to check the numerical thresholds.'}
      <p className="mt-2 text-slate-500">Required: hands-on ≥ one third; practical &gt; one half. This calculation does not establish procedure-training qualification.</p>
    </div>
  </div>;
}
