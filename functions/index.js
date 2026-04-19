export async function onRequest(context) {
  const { request, env } = context;
  const accept = request.headers.get('Accept') || '';

  if (accept.includes('text/markdown')) {
    const mdResponse = await env.ASSETS.fetch(
      new Request(new URL('/index.md', request.url), { method: 'GET' })
    );
    if (mdResponse.ok) {
      const headers = new Headers(mdResponse.headers);
      headers.set('Content-Type', 'text/markdown; charset=utf-8');
      headers.set('Vary', 'Accept');
      return new Response(mdResponse.body, { status: 200, headers });
    }
  }

  return env.ASSETS.fetch(request);
}
