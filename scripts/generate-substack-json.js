#!/usr/bin/env node

const RSS_URL = 'https://johnnykao.substack.com/feed';
const OUTPUT_PATH = 'data/substack.json';
const MAX_ITEMS = 5;

function decodeXmlEntities(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2018;/gi, "'")
    .replace(/&#x2019;/gi, "'")
    .replace(/&#x201C;/gi, '"')
    .replace(/&#x201D;/gi, '"')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/&#8212;/g, '-')
    .replace(/&#8211;/g, '-');
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
  const response = await fetch(RSS_URL, {
    headers: {
      'User-Agent': 'Johnny-Kao-Substack-Feed-Updater/1.0'
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

  const fs = await import('node:fs/promises');
  await fs.mkdir('data', { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(items, null, 2) + '\n', 'utf8');

  console.log(`Generated ${OUTPUT_PATH} with ${items.length} items.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
