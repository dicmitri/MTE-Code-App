/** Explicit manual smoke check against your running Worker, never npm test. */
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const name = option('name');
if (!name) {
  console.error('Usage: node scripts/check-cvs-live.mjs --name "Heart" [--country Belgium] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--select 1] [--base http://127.0.0.1:8787]');
  process.exitCode = 1;
} else {
  const base = option('base') || 'http://127.0.0.1:8787';
  async function call(path, init) {
    const response = await fetch(new URL(path, base), { ...init, signal: AbortSignal.timeout(25000) });
    const data = await response.json();
    if (!response.ok) throw new Error(`${data.error?.code}: ${data.error?.message}`);
    return data;
  }
  try {
    const search = await call('/api/cvs/search', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, country: option('country') || '', from: option('from') || '', to: option('to') || '' }) });
    console.log(JSON.stringify(search, null, 2));
    const selection = option('select') || (search.results.length === 1 ? '1' : null);
    if (selection) {
      if (!/^[1-9]\d*$/.test(selection) || !search.results[Number(selection) - 1]) throw new Error('Select a listed result number.');
      const selected = search.results[Number(selection) - 1];
      console.log(JSON.stringify(await call(`/api/cvs/events/${selected.emtId}`), null, 2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
