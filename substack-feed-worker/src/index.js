const MAX_ITEMS = 5;
const CACHE_KEY = 'substack:latest';
const META_KEY = 'substack:meta';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse({ ok: true }, 200);
    }

    if (request.method === 'GET' && url.pathname === '/refresh') {
      const result = await updateFeed(env);
      return jsonResponse(result, 200);
    }

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/substack.json')) {
      let payload = await env.SUBSTACK_CACHE.get(CACHE_KEY, 'text');

      if (!payload) {
        const result = await updateFeed(env);
        payload = JSON.stringify(result.items, null, 2);
      }

      return new Response(payload, {
        status: 200,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400'
        }
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders() });
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(updateFeed(env));
  }
};

async function updateFeed(env) {
  const response = await fetch(env.FEED_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://johnnykao.substack.com/'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

  const items = itemMatches
    .slice(0, MAX_ITEMS)
    .map((match) => {
      const block = match[1];
      const title = stripHtml(decodeXmlEntities(extractTag(block, 'title')));
      const link = stripHtml(decodeXmlEntities(extractTag(block, 'link')));
      const descriptionRaw = decodeXmlEntities(extractTag(block, 'description'));
      const description = truncateText(stripHtml(descriptionRaw), 280);
      const pubDate = extractTag(block, 'pubDate');

      return {
        date: formatDate(pubDate),
        title,
        summary: description,
        url: link
      };
    })
    .filter((item) => item.title && item.url);

  if (!items.length) {
    throw new Error('No valid RSS items found.');
  }

  const meta = {
    updatedAt: new Date().toISOString(),
    count: items.length,
    source: env.FEED_URL
  };

  await env.SUBSTACK_CACHE.put(CACHE_KEY, JSON.stringify(items, null, 2));
  await env.SUBSTACK_CACHE.put(META_KEY, JSON.stringify(meta, null, 2));

  return {
    ok: true,
    ...meta,
    items
  };
}

function decodeXmlEntities(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const codePoint = parseInt(hex, 16);
      return Number.isNaN(codePoint) ? _ : String.fromCodePoint(codePoint);
    })
    .replace(/&#([0-9]+);/g, (_, dec) => {
      const codePoint = parseInt(dec, 10);
      return Number.isNaN(codePoint) ? _ : String.fromCodePoint(codePoint);
    })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripHtml(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength).replace(/\s+\S*$/, '').trim() + '...';
}

function extractTag(block, tagName) {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(pattern);
  return match ? match[1].trim() : '';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
