/**
 * Standalone OAuth proxy for Decap CMS.
 * Deployed as a separate Cloudflare Worker to handle GitHub authentication.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers for cross-origin requests from the main site
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // OAuth Initiation
    if (url.pathname === '/auth' || url.pathname === '/') {
      const clientId = env.GITHUB_CLIENT_ID;
      if (!clientId) {
        return new Response('GITHUB_CLIENT_ID not configured', { status: 500, headers: corsHeaders });
      }

      const redirectUrl = new URL('https://github.com/login/oauth/authorize');
      redirectUrl.searchParams.set('client_id', clientId);
      redirectUrl.searchParams.set('scope', 'repo,user');

      return Response.redirect(redirectUrl.toString(), 302);
    }

    // OAuth Callback
    if (url.pathname === '/callback') {
      const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = env;
      if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
        return new Response('GitHub OAuth credentials not configured', { status: 500, headers: corsHeaders });
      }

      const code = url.searchParams.get('code');
      if (!code) {
        return new Response('Missing authorization code', { status: 400, headers: corsHeaders });
      }

      try {
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
          return new Response(
            `OAuth error: ${tokenData.error_description || tokenData.error}`,
            { status: 401, headers: corsHeaders }
          );
        }

        // Send the token back to the Decap CMS window via postMessage
        const content = JSON.stringify({ token: tokenData.access_token, provider: 'github' });
        const html = `<!doctype html>
<html><head><title>Authorizing...</title></head>
<body>
<script>
(function() {
  function sendMsg(e) {
    window.opener.postMessage(
      'authorization:github:success:${content}',
      e.origin
    );
  }
  window.addEventListener("message", sendMsg, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body></html>`;

        return new Response(html, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html;charset=UTF-8' },
        });
      } catch (err) {
        return new Response('Token exchange failed: ' + err.message, { status: 500, headers: corsHeaders });
      }
    }

    return new Response('MTE OAuth Proxy — use /auth or /callback', { status: 200, headers: corsHeaders });
  },
};
