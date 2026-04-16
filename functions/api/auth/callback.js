/**
 * OAuth callback endpoint for Decap CMS.
 * Exchanges the GitHub authorization code for an access token,
 * then sends it back to the CMS window via postMessage.
 *
 * Environment variables required:
 *   GITHUB_CLIENT_ID     — from your GitHub OAuth App
 *   GITHUB_CLIENT_SECRET — from your GitHub OAuth App
 */
export async function onRequest(context) {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = context.env;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return new Response('GitHub OAuth credentials not configured', { status: 500 });
  }

  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
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
        window.opener.postMessage(
          'authorization:github:success:${JSON.stringify({ token: tokenData.access_token, provider: 'github' })}',
          e.origin
        );
      }
      window.addEventListener("message", receiveMessage, false);
      window.opener.postMessage("authorizing:github", "*");
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}
