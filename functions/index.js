export async function onRequest(context) {
  const { request, env } = context;
  const pathname = new URL(request.url).pathname;

  if (pathname === '/n8n' || pathname.startsWith('/n8n/')) {
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }

  if (pathname === '/.well-known/security.txt') {
    return new Response(
      [
        'Contact: https://www.linkedin.com/in/johnnykao-finance/',
        'Expires: 2027-10-22T00:00:00.000Z',
        'Preferred-Languages: zh-TW, en',
        'Canonical: https://johnnykao.com/.well-known/security.txt'
      ].join('\n') + '\n',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    );
  }

  if (pathname === '/.well-known/mta-sts.txt') {
    return new Response(
      [
        'version: STSv1',
        'mode: testing',
        'mx: mx01.mail.icloud.com',
        'mx: mx02.mail.icloud.com',
        'max_age: 86400'
      ].join('\n') + '\n',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    );
  }

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
