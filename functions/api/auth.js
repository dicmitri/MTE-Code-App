/**
 * OAuth initiation endpoint for Decap CMS.
 * Redirects the user to GitHub's OAuth authorization page.
 *
 * Environment variables required:
 *   GITHUB_CLIENT_ID — from your GitHub OAuth App
 */
export async function onRequest(context) {
  const clientId = context.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response('GITHUB_CLIENT_ID not configured', { status: 500 });
  }

  const redirectUrl = new URL('https://github.com/login/oauth/authorize');
  redirectUrl.searchParams.set('client_id', clientId);
  redirectUrl.searchParams.set('scope', 'repo');

  return Response.redirect(redirectUrl.toString(), 302);
}
