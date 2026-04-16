/**
 * Cloudflare Worker entry point for MTE Code App.
 * Handles both the Decap CMS OAuth flow and serves the static assets (React app).
 * 
 * Documentation: https://developers.cloudflare.com/workers/static-assets/routing/
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Handle OAuth Initiation: /api/auth
    if (url.pathname === '/api/auth') {
      const clientId = env.GITHUB_CLIENT_ID;

      if (!clientId) {
        return new Response('GITHUB_CLIENT_ID not configured in Cloudflare dashboad', { status: 500 });
      }

      const redirectUrl = new URL('https://github.com/login/oauth/authorize');
      redirectUrl.searchParams.set('client_id', clientId);
      redirectUrl.searchParams.set('scope', 'repo');

      return Response.redirect(redirectUrl.toString(), 302);
    }

    // 2. Handle OAuth Callback: /api/auth/callback
    if (url.pathname === '/api/auth/callback') {
      const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = env;

      if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
        return new Response('GitHub OAuth credentials not configured in Cloudflare dashboad', { status: 500 });
      }

      const code = url.searchParams.get('code');
      if (!code) {
        return new Response('Missing authorization code from GitHub', { status: 400 });
      }

      // Exchange the code for an access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        return new Response(`OAuth error: ${tokenData.error_description || tokenData.error}`, {
          status: 401,
        });
      }

      // Send the token back to the Decap CMS window via postMessage
      const html = `<!doctype html>
<html>
<head><title>Authorizing...</title></head>
<body>
  <script>
    (function() {
      function receiveMessage(e) {
        if (window.opener) {
          window.opener.postMessage(
            'authorization:github:success:${JSON.stringify({ token: tokenData.access_token, provider: 'github' })}',
            e.origin
          );
        }
      }
      window.addEventListener("message", receiveMessage, false);
      if (window.opener) {
        window.opener.postMessage("authorizing:github", "*");
      }
    })();
  </script>
</body>
</html>`;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      });
    }

    // 3. Fallback: Serve static assets
    // Cloudflare Workers with Assets feature uses env.ASSETS.fetch to serve your React app
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      // In case env.ASSETS is missing or failed (development or old setup)
      return new Response('Assets not found or incorrectly configured in the worker.', { status: 404 });
    }
  },
};
