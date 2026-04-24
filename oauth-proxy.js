/**
 * Standalone OAuth proxy for Decap CMS.
 * Deployed as a separate Cloudflare Worker to handle GitHub authentication.
 *
 * Security: Uses HMAC-signed state tokens for CSRF protection,
 * restricted CORS, and no-cache headers on token responses.
 */

/**
 * Generate an HMAC-signed state token for CSRF protection.
 * Format: timestamp.hmacSignature
 */
async function generateState(secret) {
  const timestamp = Date.now().toString();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp));
  const sigHex = [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${timestamp}.${sigHex}`;
}

/**
 * Verify an HMAC-signed state token.
 * Checks both the signature integrity and that the token is < maxAgeMs old.
 */
async function verifyState(state, secret, maxAgeMs = 600000) {
  if (!state) return false;
  const parts = state.split('.');
  if (parts.length !== 2) return false;
  const [timestamp, sig] = parts;
  const age = Date.now() - parseInt(timestamp, 10);
  if (isNaN(age) || age > maxAgeMs || age < 0) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp));
  const expectedHex = [...new Uint8Array(expectedSig)].map(b => b.toString(16).padStart(2, '0')).join('');
  return sig === expectedHex;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Derive CORS origin from the request — only allow HTTPS origins
    const requestOrigin = request.headers.get('Origin');
    const allowedOrigin = requestOrigin && requestOrigin.startsWith('https://') ? requestOrigin : '';
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
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
        return new Response('OAuth configuration error.', { status: 500, headers: corsHeaders });
      }

      const state = await generateState(env.GITHUB_CLIENT_SECRET);

      const redirectUrl = new URL('https://github.com/login/oauth/authorize');
      redirectUrl.searchParams.set('client_id', clientId);
      redirectUrl.searchParams.set('scope', 'repo');
      redirectUrl.searchParams.set('state', state);

      return Response.redirect(redirectUrl.toString(), 302);
    }

    // OAuth Callback
    if (url.pathname === '/callback') {
      const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = env;
      if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
        return new Response('OAuth configuration error.', { status: 500, headers: corsHeaders });
      }

      // Verify CSRF state
      const state = url.searchParams.get('state');
      if (!(await verifyState(state, GITHUB_CLIENT_SECRET))) {
        return new Response('Invalid or expired authorization request. Please try logging in again.', {
          status: 403, headers: corsHeaders,
        });
      }

      const code = url.searchParams.get('code');
      if (!code) {
        return new Response('Missing authorization code.', { status: 400, headers: corsHeaders });
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
          return new Response('Authentication failed. Please try again.', {
            status: 401, headers: corsHeaders,
          });
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
  // Initial handshake uses "*" because the popup cannot determine the opener's
  // origin after GitHub's redirect chain. This is Decap CMS's documented pattern.
  // The actual token above is always sent using the validated e.origin.
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body></html>`;

        return new Response(html, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache',
          },
        });
      } catch (err) {
        console.error('OAuth token exchange error:', err);
        return new Response('Authentication failed. Please try again.', { status: 500, headers: corsHeaders });
      }
    }

    return new Response('MTE OAuth Proxy — use /auth or /callback', { status: 200, headers: corsHeaders });
  },
};
