import React from 'react';
import { AppIcon } from './AppIcons';

const inputClass = 'w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-[#7654A1]';

export default function CvsEventLookup({ lookup }) {
  const { filters, search, selected, status, busy, error, updateFilter, searchEvents, selectEvent } = lookup;
  return <div>
        <form onSubmit={searchEvents} aria-busy={busy === 'search'} className="no-print mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="cvs-name" className="mb-1 block text-sm font-medium text-slate-700">Event name</label>
              <input id="cvs-name" required maxLength={200} value={filters.name} onChange={(e) => updateFilter('name', e.target.value)} className={inputClass} placeholder="e.g. Heart Rhythm Meeting" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cvs-country" className="mb-1 block text-sm font-medium text-slate-700">Country <span className="font-normal text-slate-500">(optional)</span></label>
              <input id="cvs-country" maxLength={100} value={filters.country} onChange={(e) => updateFilter('country', e.target.value)} className={inputClass} placeholder="e.g. Belgium" />
            </div>
            {['from', 'to'].map((key) => (
              <div key={key}>
                <label htmlFor={`cvs-${key}`} className="mb-1 block text-sm font-medium text-slate-700">{key === 'from' ? 'From date' : 'To date'} <span className="font-normal text-slate-500">(optional)</span></label>
                <input id={`cvs-${key}`} type="date" value={filters[key]} onChange={(e) => updateFilter(key, e.target.value)} className={inputClass} />
              </div>
            ))}
          </div>
          <button type="submit" disabled={busy === 'search' || !filters.name.trim()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7654A1] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            <AppIcon name={busy === 'search' ? 'Loader2' : 'Search'} size={18} className={busy === 'search' ? 'animate-spin' : ''} />
            {busy === 'search' ? 'Searching CVS...' : 'Search CVS'}
          </button>
        </form>

        <div aria-live="polite" aria-atomic="true" className="mt-4 text-sm text-slate-600">
          {busy === 'search' && 'Searching the public CVS platform...'}
          {search?.results.length === 0 && <p>No matching CVS events were found. Try another name or broaden the country/date range. No CVS status has been determined.</p>}
        </div>
        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p>{error.message}</p>
            <p className="mt-1 font-medium">CVS status is unknown.</p>
            {error.kind === 'status' && selected && <button type="button" onClick={() => selectEvent(selected)} className="no-print mt-2 font-semibold underline">Retry status lookup</button>}
          </div>
        )}

        {search?.results.length > 0 && (
          <fieldset className="no-print mt-6 space-y-3">
            <legend className="mb-3 text-lg font-semibold text-slate-800">Matching CVS events ({search.results.length})</legend>
            {search.mayBeLimited && <p className="mb-3 text-sm text-amber-800">CVS may limit broad searches to 50 events. Narrow the name, country or date range if your event is missing.</p>}
            {search.results.map((event) => (
              <label key={event.emtId} className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 ${selected?.emtId === event.emtId ? 'border-[#7654A1]' : 'border-slate-200'}`}>
                <input type="radio" name="cvs-event" value={event.emtId} checked={selected?.emtId === event.emtId} onChange={() => selectEvent(event)} className="mt-1 accent-[#7654A1]" />
                <span>
                  <span className="block font-semibold text-slate-800">{event.name}</span>
                  <span className="mt-1 block text-sm text-slate-600">{event.from}{event.to !== event.from ? ` – ${event.to}` : ''} · {[event.city, event.country].filter(Boolean).join(', ')}</span>
                  <span className="mt-1 block text-xs text-slate-500">{event.emtId}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {selected && (
          <section aria-live="polite" aria-busy={busy === 'status'} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
            <h2 className="text-lg font-semibold text-slate-800">{status?.name || selected.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{selected.emtId}</p>
            <p className="mt-4 text-slate-700">CVS status: <strong>{busy === 'status' ? 'Retrieving current status...' : status?.status.raw || 'Unknown'}</strong></p>
            {status && <p className="mt-2 text-xs text-slate-500">Retrieved {new Date(status.retrievedAt).toLocaleString()}. Status may change after this check.</p>}
            <div className="no-print mt-4 flex flex-wrap items-center gap-4">
              <a href={`https://cvs.solutions.iqvia.com/event/detail/${selected.emtId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-[#0099A7] hover:underline">View event in CVS <AppIcon name="ExternalLink" size={14} /></a>
              {status && <button type="button" onClick={() => selectEvent(selected)} className="text-sm font-semibold text-[#7654A1] hover:underline">Refresh status</button>}
            </div>
          </section>
        )}
  </div>;
}
