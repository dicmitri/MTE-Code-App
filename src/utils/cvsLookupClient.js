// One current request per lookup. Identity checks protect against fetch mocks or
// transports which complete after cancellation, as well as ordinary races.
export function createCvsLookupClient(fetcher = fetch) {
  let current = null;
  return {
    cancel() { current?.abort(); current = null; },
    async request(path, options, accept, fail) {
      current?.abort();
      const controller = new AbortController();
      current = controller;
      const timer = setTimeout(() => controller.abort('timeout'), 25000);
      try {
        const response = await fetcher(path, { ...options, signal: controller.signal, cache: 'no-store' });
        let data;
        try { data = await response.json(); }
        catch { throw new Error('The CVS service returned an unreadable response. Please try again.'); }
        if (!response.ok) throw new Error(data.error?.message || 'CVS could not complete the lookup.');
        if (current !== controller) return null;
        accept(data);
        return data;
      } catch (error) {
        if (current === controller) fail(controller.signal.aborted ? 'The CVS lookup timed out. Please try again.' : error.message);
        return null;
      } finally {
        clearTimeout(timer);
        if (current === controller) current = null;
      }
    },
  };
}

export function validCvsEvent(event) {
  return event && /^EMT-\d{2}-\d{5}$/.test(event.emtId) && typeof event.name === 'string' && event.name.trim();
}
export function validateCvsDetail(data, emtId) {
  if (!validCvsEvent(data) || data.emtId !== emtId || typeof data.status?.raw !== 'string' || !data.status.raw.trim()
    || !Number.isFinite(Date.parse(data.retrievedAt))) throw new Error('The selected event’s current CVS status could not be identified.');
}
