import { createCvsAdapter, readBoundedText } from './cvs-adapter.js';
import { CvsError } from './cvs-parser.js';

function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, { status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extraHeaders,
  } });
}

export async function handleCvsRequest(request, adapter = createCvsAdapter()) {
  const url = new URL(request.url);
  const search = url.pathname === '/api/cvs/search';
  const detail = /^\/api\/cvs\/events\/(EMT-\d{2}-\d{5})$/.exec(url.pathname);
  if (!search && !detail) return json({ error: { code: 'NOT_FOUND', message: 'Unknown CVS endpoint.' } }, 404);
  const method = search ? 'POST' : 'GET';
  if (request.method !== method) return json({ error: { code: 'METHOD_NOT_ALLOWED', message: `Use ${method}.` } }, 405, { Allow: method });
  // Same-origin integration: no public CORS proxy and no forwarding browser cookies.
  if ((request.headers.has('origin') && request.headers.get('origin') !== url.origin)
    || request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ error: { code: 'INVALID_ORIGIN', message: 'Use the CVS prototype in this app.' } }, 403);
  }
  try {
    if (detail) return json(await adapter.getEventStatus(detail[1]));
    if (!/^application\/json\b/i.test(request.headers.get('content-type') || '')) {
      throw new CvsError('INVALID_REQUEST', 'Send a JSON search request.', 400);
    }
    let input;
    try { input = JSON.parse(await readBoundedText(request, 4096)); }
    catch { throw new CvsError('INVALID_REQUEST', 'The search request is invalid or too large.', 400); }
    return json(await adapter.searchEvents(input));
  } catch (error) {
    if (error instanceof CvsError) return json({ error: { code: error.code, message: error.message } }, error.httpStatus);
    // Never leak upstream HTML, tokens, cookies, or exception details.
    return json({ error: { code: 'CVS_UNKNOWN', message: 'The CVS lookup could not be completed. Status is unknown.' } }, 502);
  }
}
