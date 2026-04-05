#!/usr/bin/env node

const JSON_URL = process.env.SUBSTACK_JSON_URL || '';
const FEED_FILE = process.env.SUBSTACK_FEED_FILE || '';
const OUTPUT_PATH = 'data/substack.json';
const MAX_ITEMS = 5;

function decodeXmlEntities(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, function(_, hex) {
      var codePoint = parseInt(hex, 16);
      return Number.isNaN(codePoint) ? _ : String.fromCodePoint(codePoint);
    })
    .replace(/&#([0-9]+);/g, function(_, dec) {
      var codePoint = parseInt(dec, 10);
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

async function main() {
  const fs = await import('node:fs/promises');

  try {
    let items = [];

    if (FEED_FILE) {
      try {
        const json = await fs.readFile(FEED_FILE, 'utf8');
        items = JSON.parse(json);
        console.log(`Using local JSON feed file: ${FEED_FILE}`);
      } catch (error) {
        console.warn(`Local JSON feed file unavailable, falling back to remote fetch: ${FEED_FILE}`);
      }
    }

    if (!items.length && JSON_URL) {
      const response = await fetch(JSON_URL, {
        headers: {
          'User-Agent': 'Johnny-Kao-Substack-JSON-Updater/1.0',
          'Accept': 'application/json, text/plain;q=0.9, */*;q=0.8'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch JSON: ${response.status} ${response.statusText}`);
      }

      items = await response.json();
      console.log(`Fetched JSON from ${JSON_URL}`);
    }

    const normalizedItems = normalizeItems(items, MAX_ITEMS);

    if (!normalizedItems.length) {
      throw new Error('No valid JSON items found.');
    }

    await fs.mkdir('data', { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(normalizedItems, null, 2) + '\n', 'utf8');

    console.log(`Generated ${OUTPUT_PATH} with ${normalizedItems.length} items.`);
  } catch (error) {
    try {
      await fs.access(OUTPUT_PATH);
      console.warn(`RSS fetch failed, keeping existing ${OUTPUT_PATH}: ${error.message}`);
      process.exit(0);
    } catch (accessError) {
      throw error;
    }
  }
}

function normalizeItems(items, limit) {
  return (items || [])
    .slice(0, limit || MAX_ITEMS)
    .map((item) => ({
      date: formatDate(item.date || ''),
      title: stripHtml(decodeXmlEntities((item.title || '').trim())),
      summary: truncateText(stripHtml(decodeXmlEntities((item.summary || '').trim())), 280),
      url: (item.url || '').trim()
    }))
    .filter((item) => item.title && item.url);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
