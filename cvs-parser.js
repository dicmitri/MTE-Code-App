/**
 * Public CVS HTML contract, inspected 2026-09-26. No browser DOM or Node APIs.
 * Keep selectors/labels here: upstream markup is not a supported API.
 * HTMLRewriter supplies text in chunks and does not decode HTML entities.
 */
export const CVS_ORIGIN = 'https://cvs.solutions.iqvia.com';
export const CVS_SELECTORS = Object.freeze({
  form: 'form#public_event_filter_form',
  token: 'form#public_event_filter_form input[name="_token"]',
  listing: '.table-listing',
  count: '.table-listing > h3',
  card: '.table-listing > .card',
  title: '.table-listing > .card .card-title',
  link: '.table-listing > .card a[href]',
  field: '.table-listing > .card p.card-text',
  detailRow: 'main .row.mb-2',
  detailLabel: 'main .row.mb-2 > .label-text',
  detailValue: 'main .row.mb-2 > .col-md-8',
});

export class CvsError extends Error {
  constructor(code, message, httpStatus = 502) {
    super(message);
    this.name = 'CvsError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function changed() {
  throw new CvsError('CVS_HTML_CHANGED', 'The CVS page structure is no longer recognized. Status is unknown.');
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  hellip: '…', bull: '•', laquo: '«', raquo: '»', copy: '©', reg: '®', trade: '™' };
// Latin-1 names commonly used in European event names/locations.
const LATIN_ENTITIES = 'Agrave À Aacute Á Acirc Â Atilde Ã Auml Ä Aring Å AElig Æ Ccedil Ç Egrave È Eacute É Ecirc Ê Euml Ë Igrave Ì Iacute Í Icirc Î Iuml Ï ETH Ð Ntilde Ñ Ograve Ò Oacute Ó Ocirc Ô Otilde Õ Ouml Ö Oslash Ø Ugrave Ù Uacute Ú Ucirc Û Uuml Ü Yacute Ý THORN Þ szlig ß agrave à aacute á acirc â atilde ã auml ä aring å aelig æ ccedil ç egrave è eacute é ecirc ê euml ë igrave ì iacute í icirc î iuml ï eth ð ntilde ñ ograve ò oacute ó ocirc ô otilde õ ouml ö oslash ø ugrave ù uacute ú ucirc û uuml ü yacute ý thorn þ yuml ÿ'.split(' ');
for (let i = 0; i < LATIN_ENTITIES.length; i += 2) ENTITIES[LATIN_ENTITIES[i]] = LATIN_ENTITIES[i + 1];

function plainText(raw) {
  return raw.replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi, (_, entity) => {
    if (!entity.startsWith('#')) {
      // Never silently corrupt an event name or a status we cannot decode.
      if (!(entity in ENTITIES)) changed();
      return ENTITIES[entity];
    }
    const hex = entity[1].toLowerCase() === 'x';
    const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) changed();
    return String.fromCodePoint(code);
  }).replace(/\s+/g, ' ').trim();
}

function textHandler(start) {
  let append;
  return { element(element) { append = start(element); }, text(chunk) { append?.(chunk.text); } };
}

async function consume(rewriter, html) {
  // Parsing only bounded HTML supplied by the adapter; drain to run handlers.
  const reader = rewriter.transform(new Response(html)).body.getReader();
  try {
    while (!(await reader.read()).done) { /* discard rewritten output */ }
  } catch {
    // HTMLRewriter can wrap exceptions raised by selector callbacks, losing
    // custom properties. Keep parser failures classified as changed HTML.
    changed();
  } finally { reader.releaseLock(); }
}

export function eventDetailUrl(emtId) {
  if (!/^EMT-\d{2}-\d{5}$/.test(emtId)) {
    throw new CvsError('INVALID_REQUEST', 'A valid CVS event identifier is required.', 400);
  }
  return `${CVS_ORIGIN}/event/detail/${emtId}`;
}

export function extractEmtId(href) {
  let url;
  try { url = new URL(href, CVS_ORIGIN); } catch { changed(); }
  const match = /^\/event\/detail\/(EMT-\d{2}-\d{5})$/.exec(url.pathname);
  if (url.origin !== CVS_ORIGIN || url.search || url.hash || !match) changed();
  return match[1];
}

export async function parseSearchSession(html) {
  let forms = 0;
  const tokens = [];
  await consume(new HTMLRewriter()
    .on(CVS_SELECTORS.form, { element(e) {
      forms++;
      if (e.getAttribute('method')?.toLowerCase() !== 'post'
        || new URL(e.getAttribute('action'), CVS_ORIGIN).href !== `${CVS_ORIGIN}/all-events`) changed();
    } })
    .on(CVS_SELECTORS.token, { element(e) { tokens.push(e.getAttribute('value')); } }), html);
  if (forms !== 1) changed();
  if (tokens.length !== 1 || !tokens[0]?.trim()) {
    throw new CvsError('CVS_CSRF_MISSING', 'The public CVS search token could not be found. Please try again.');
  }
  return tokens[0];
}

export async function parseSearchResults(html) {
  const cards = [];
  let current;
  let listings = 0;
  const counts = [];
  await consume(new HTMLRewriter()
    .on(CVS_SELECTORS.listing, { element() { listings++; } })
    .on(CVS_SELECTORS.count, textHandler(() => {
      const item = { text: '' }; counts.push(item); return (text) => { item.text += text; };
    }))
    .on(CVS_SELECTORS.card, { element(e) {
      current = { title: '', links: [], fields: [], closed: false };
      const card = current;
      cards.push(card);
      e.onEndTag(() => { card.closed = true; current = null; });
    } })
    .on(CVS_SELECTORS.title, textHandler(() => {
      const card = current; if (!card) changed();
      return (text) => { card.title += text; };
    }))
    .on(CVS_SELECTORS.link, { element(e) {
      const href = e.getAttribute('href');
      if (href?.includes('/event/detail/')) current?.links.push(extractEmtId(href));
    } })
    .on(CVS_SELECTORS.field, textHandler(() => {
      const item = { text: '' }; if (!current) changed(); current.fields.push(item);
      return (text) => { item.text += text; };
    })), html);
  const count = counts.length === 1 && /^Search Results (\d+) Events? Found$/.exec(plainText(counts[0].text));
  if (listings !== 1 || !count) changed();
  // CVS uses singular "Event" for 0/1 and renders a message card for zero.
  // A missing/changed result card must never masquerade as an empty search.
  if (Number(count[1]) === 0) {
    if (cards.length !== 1 || !cards[0].closed || cards[0].links.length || cards[0].fields.length
      || plainText(cards[0].title) !== 'No Events Found For This Search Criteria.') changed();
    return { results: [], mayBeLimited: false };
  }
  if (Number(count[1]) !== cards.length) changed();
  const seen = new Set();
  const results = cards.map((card) => {
    if (!card.closed || card.links.length !== 1) changed();
    const emtId = card.links[0];
    if (seen.has(emtId)) changed(); seen.add(emtId);
    const title = plainText(card.title);
    const suffix = `(${emtId})`;
    if (!title.endsWith(suffix)) changed();
    const name = title.slice(0, -suffix.length).trim();
    if (!name) changed();
    const fields = new Map();
    for (const item of card.fields) {
      const match = /^(Start date|End date|City|Country|Status)\s*:\s*(.*)$/.exec(plainText(item.text));
      if (match) {
        if (fields.has(match[1])) changed();
        fields.set(match[1], match[2]);
      }
    }
    for (const key of ['Start date', 'End date', 'City', 'Country']) {
      if (!fields.has(key)) changed();
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.get('Start date'))
      || !/^\d{4}-\d{2}-\d{2}$/.test(fields.get('End date'))) changed();
    // Preserve the complete search status, including CVS's own annotations.
    const status = fields.get('Status') ? { raw: fields.get('Status') } : null;
    return { emtId, name, from: fields.get('Start date'), to: fields.get('End date'),
      city: fields.get('City'), country: fields.get('Country'), status, detailUrl: eventDetailUrl(emtId) };
  });
  // Observed CVS searches cap the returned list at 50. Do not crawl next pages.
  return { results, mayBeLimited: results.length >= 50 };
}

export async function parseEventDetail(html, expectedEmtId) {
  eventDetailUrl(expectedEmtId);
  const rows = [];
  const stack = [];
  await consume(new HTMLRewriter()
    .on(CVS_SELECTORS.detailRow, { element(e) {
      const row = { label: '', value: '', closed: false }; rows.push(row); stack.push(row);
      e.onEndTag(() => { row.closed = true; stack.pop(); });
    } })
    .on(CVS_SELECTORS.detailLabel, textHandler(() => {
      const row = stack.at(-1); if (!row) changed(); return (text) => { row.label += text; };
    }))
    .on(CVS_SELECTORS.detailValue, textHandler(() => {
      const row = stack.at(-1); if (!row) changed(); return (text) => { row.value += text; };
    })), html);
  const valueFor = (label) => {
    const matches = rows.filter((row) => plainText(row.label) === label);
    if (matches.length > 1 || matches.some((row) => !row.closed)) changed();
    return matches.length ? plainText(matches[0].value) : '';
  };
  const emtId = valueFor('Emt ID:');
  const name = valueFor('Name of the event:');
  if (emtId !== expectedEmtId || !name) changed();
  // Criteria badges are NOT the event's overall status. Only this exact label.
  const raw = valueFor('Overall status of event:');
  if (!raw) throw new CvsError('CVS_STATUS_UNKNOWN', 'The selected event’s overall CVS status could not be identified.');
  return { emtId, name, status: { raw }, detailUrl: eventDetailUrl(emtId) };
}
