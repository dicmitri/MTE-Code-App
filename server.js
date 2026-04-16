/**
 * Cloudflare Worker entry point for MTE Code App.
 * Handles the Decap CMS OAuth flow and serves the React app as static assets.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Handle OAuth Initiation: /api/auth
    if (url.pathname === '/api/auth') {
      const clientId = env.GITHUB_CLIENT_ID;

      if (!clientId) {
        return new Response('GITHUB_CLIENT_ID not configured in Cloudflare environment variables.', { status: 500 });
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
        return new Response('GitHub OAuth credentials not configured in Cloudflare environment variables.', { status: 500 });
      }

      const code = url.searchParams.get('code');
      if (!code) {
        return new Response('Missing authorization code from GitHub', { status: 400 });
      }

      try {
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
      } catch (err) {
        return new Response('Failed to exchange token with GitHub: ' + err.message, { status: 500 });
      }
    }

    // 3. Fallback: Serve static assets
    // Ensure the Decap CMS admin interface is served correctly
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      return env.ASSETS.fetch(new Request(new URL('/admin/index.html', request.url), request));
    }

    // For any other SPA route, serve the main index.html
    let assetReq = request;
    if (!url.pathname.includes('.')) {
      assetReq = new Request(new URL('/index.html', request.url), request);
    }

    return env.ASSETS.fetch(assetReq);
  },
};
