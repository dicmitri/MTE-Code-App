import { CVS_ORIGIN, CvsError, eventDetailUrl, parseSearchSession, parseSearchResults, parseEventDetail } from './cvs-parser.js';

const SEARCH_URL = `${CVS_ORIGIN}/all-events`;
const MAX_HTML_BYTES = 5 * 1024 * 1024; // Public form currently includes a ~2.3 MB EMT select.
const TIMEOUT_MS = 20000; // One budget for GET + POST + body consumption.

export async function readBoundedText(response, maxBytes) {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    throw new CvsError('CVS_RESPONSE_INVALID', 'The response exceeds the prototype’s size limit.');
  }
  if (!response.body) throw new CvsError('CVS_RESPONSE_INVALID', 'The response body is missing.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let text = '';
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new CvsError('CVS_RESPONSE_INVALID', 'The response exceeds the prototype’s size limit.');
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}

export function validateSearchInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new CvsError('INVALID_REQUEST', 'Provide an event name and optional country/date range.', 400);
  }
  const output = {};
  for (const key of ['name', 'country', 'from', 'to']) {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.length > (key === 'name' ? 200 : 100) || /[\x00-\x1f]/.test(value)) {
      throw new CvsError('INVALID_REQUEST', `The ${key} field is invalid.`, 400);
    }
    output[key] = value.trim();
  }
  if (!output.name) throw new CvsError('INVALID_REQUEST', 'Enter an event name.', 400);
  for (const key of ['from', 'to']) {
    const date = output[key];
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date)
      || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
      throw new CvsError('INVALID_REQUEST', 'Dates must be valid YYYY-MM-DD dates.', 400);
    }
  }
  if (output.from && output.to && output.from > output.to) {
    throw new CvsError('INVALID_REQUEST', 'The end date must be on or after the start date.', 400);
  }
  return output;
}

function sessionCookies(headers) {
  // Workers getAll preserves separate Set-Cookie headers (including Expires commas).
  const values = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie() : headers.getAll('Set-Cookie');
  return values.map((value) => value.split(';', 1)[0]).join('; ');
}

async function withSession(operation, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const getHtml = async (url, init = {}) => {
    const response = await fetchImpl(url, {
      ...init, signal: controller.signal, redirect: 'manual',
      headers: { Accept: 'text/html', 'User-Agent': 'MTE-Code-App-CVS-Prototype/1.0',
        'Cache-Control': 'no-cache, no-store', ...init.headers },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new CvsError('CVS_UNAVAILABLE', 'CVS could not serve the requested page. Please try again later.');
    }
    if (!/^text\/html\b/i.test(response.headers.get('content-type') || '')) {
      await response.body?.cancel();
      throw new CvsError('CVS_RESPONSE_INVALID', 'CVS returned an unexpected response format.');
    }
    return { html: await readBoundedText(response, MAX_HTML_BYTES), headers: response.headers };
  };
  try { return await operation(getHtml); }
  catch (error) {
    if (controller.signal.aborted) throw new CvsError('CVS_TIMEOUT', 'CVS did not respond in time. Please try again.', 504);
    if (error instanceof CvsError) throw error;
    if (error instanceof TypeError) throw new CvsError('CVS_UNAVAILABLE', 'CVS could not be reached. Please try again later.');
    throw new CvsError('CVS_RESPONSE_INVALID', 'The CVS response could not be read. Status is unknown.');
  } finally { clearTimeout(timer); }
}

// Fetch and timeout injection support deterministic tests; never caller-controlled URLs.
export function createCvsAdapter({ fetchImpl = fetch, timeoutMs = TIMEOUT_MS } = {}) {
  return {
    async searchEvents(input) {
      const filters = validateSearchInput(input);
      return withSession(async (getHtml) => {
        const session = await getHtml(SEARCH_URL);
        const token = await parseSearchSession(session.html);
        const body = new URLSearchParams({ _token: token });
        for (const key of ['name', 'from', 'to', 'organizer', 'therapeutic_area', 'country', 'city', 'status', 'type', 'emt']) {
          let value = filters[key] || '';
          // Actual CVS datepicker uses dd-mm-yyyy, unlike browser date inputs.
          if ((key === 'from' || key === 'to') && value) value = value.split('-').reverse().join('-');
          body.set(`public_event_filter_${key}`, value);
        }
        const response = await getHtml(SEARCH_URL, { method: 'POST', body,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: sessionCookies(session.headers), Referer: SEARCH_URL, Origin: CVS_ORIGIN } });
        return { ...await parseSearchResults(response.html), retrievedAt: new Date().toISOString() };
      }, fetchImpl, timeoutMs);
    },
    async getEventStatus(emtId) {
      const url = eventDetailUrl(emtId);
      return withSession(async (getHtml) => {
        const response = await getHtml(url);
        return { ...await parseEventDetail(response.html, emtId), retrievedAt: new Date().toISOString() };
      }, fetchImpl, timeoutMs);
    },
  };
}
