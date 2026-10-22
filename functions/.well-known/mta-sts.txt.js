export function onRequest() {
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
