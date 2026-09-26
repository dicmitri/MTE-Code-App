import { useEffect, useRef, useState } from 'react';
import { createCvsLookupClient, validCvsEvent, validateCvsDetail } from '../utils/cvsLookupClient.js';

export function useCvsLookup() {
  const [filters, setFilters] = useState({ name: '', country: '', from: '', to: '' });
  const [search, setSearch] = useState(null);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const clientRef = useRef(null);
  if (!clientRef.current) clientRef.current = createCvsLookupClient();
  useEffect(() => () => clientRef.current.cancel(), []);
  const clearLookup = () => {
    clientRef.current.cancel();
    setBusy(null); setError(null); setSearch(null); setSelected(null); setStatus(null);
  };
  const updateFilter = (key, value) => { clearLookup(); setFilters((previous) => ({ ...previous, [key]: value })); };
  const searchEvents = async (event) => {
    event?.preventDefault(); clearLookup();
    if (filters.from && filters.to && filters.from > filters.to) {
      setError({ kind: 'search', message: 'The end date must be on or after the start date.' }); return null;
    }
    setBusy('search');
    return clientRef.current.request('/api/cvs/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(filters),
    }, (data) => {
      if (!Array.isArray(data.results) || !data.results.every((result) => validCvsEvent(result)
        && ['from', 'to', 'city', 'country'].every((key) => typeof result[key] === 'string'))) throw new Error('The CVS search response was not recognized.');
      setSearch(data); setBusy(null);
    }, (message) => { setError({ kind: 'search', message }); setBusy(null); });
  };
  const selectEvent = async (event) => {
    setSelected(event); setStatus(null); setBusy('status'); setError(null);
    return clientRef.current.request(`/api/cvs/events/${event.emtId}`, {}, (data) => {
      validateCvsDetail(data, event.emtId); setStatus(data); setBusy(null);
    }, (message) => { setError({ kind: 'status', message }); setBusy(null); });
  };
  return { filters, search, selected, status, busy, error, updateFilter, searchEvents, selectEvent,
    clearLookup, refresh: () => selected ? selectEvent(selected) : Promise.resolve(null) };
}
