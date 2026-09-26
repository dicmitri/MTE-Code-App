import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../server.js';

const APP_SHELL = '<!doctype html><title>The Code App</title>';

// Mirrors Cloudflare Workers Static Assets with the default
// html_handling ("auto-trailing-slash"): "/index.html" is not served directly
// but redirected to "/", and missing files are plain 404s.
function createAssetsBinding() {
  const requestedPaths = [];

  return {
    requestedPaths,
    async fetch(request) {
      const { pathname } = new URL(request.url);
      requestedPaths.push(pathname);

      if (pathname === '/') {
        return new Response(APP_SHELL, { headers: { 'Content-Type': 'text/html' } });
      }
      if (pathname === '/index.html') {
        return new Response(null, { status: 307, headers: { Location: '/' } });
      }
      if (pathname === '/logo.png') {
        return new Response('png', { headers: { 'Content-Type': 'image/png' } });
      }
      return new Response('Not found', { status: 404 });
    },
  };
}

async function fetchFromWorker(path, init) {
  const env = { ASSETS: createAssetsBinding() };
  const response = await worker.fetch(new Request(`https://medtecheurope-code.org${path}`, init), env);
  return { response, env };
}

test('serves the app shell for nested app routes instead of redirecting home', async () => {
  for (const path of [
    '/code',
    '/code/ch7',
    '/transparency/disclosure-guidelines/dg-chapter-1',
    '/transparency/historical-declarations',
    '/trees/dt-ch1-event-location',
    '/quiz',
    '/tppt',
    '/event-support',
  ]) {
    const { response } = await fetchFromWorker(path);

    assert.equal(response.status, 200, `${path} should not redirect`);
    assert.equal(await response.text(), APP_SHELL, `${path} should receive the app shell`);
  }
});

test('passes real static files through, including 404s for missing chunks', async () => {
  const logo = await fetchFromWorker('/logo.png');
  assert.equal(logo.response.status, 200);
  assert.deepEqual(logo.env.ASSETS.requestedPaths, ['/logo.png']);

  const staleChunk = await fetchFromWorker('/assets/TPPTContent-stale.js');
  assert.equal(staleChunk.response.status, 404);
});

test('handles declarations API routes before the app-shell fallback', async () => {
  const { response, env } = await fetchFromWorker('/api/historical-declarations/search', {
    method: 'POST',
  });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.deepEqual(env.ASSETS.requestedPaths, []);
});
