#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const ARCHIVE_PATH = path.join(process.cwd(), 'data', 'articles-archive.json');
const SUBSTACK_PATH = path.join(process.cwd(), 'data', 'substack.json');
const ARTICLE_PATH = path.join(process.cwd(), 'data', 'article.json');

function normalizeItem(item, fallbackSource = '') {
  return {
    date: (item.date || '').trim(),
    title: (item.title || '').trim(),
    summary: (item.summary || '').trim(),
    url: (item.url || '').trim(),
    source: (item.source || fallbackSource || '').trim()
  };
}

function inferSource(url, fallbackSource = '') {
  if (fallbackSource) return fallbackSource;
  if (/substack\.com/i.test(url || '')) return 'Substack';
  if (/linkedin\.com/i.test(url || '')) return 'LinkedIn';
  return '';
}

function asTimestamp(dateValue) {
  const parsed = new Date(dateValue).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return [];
  }
}

async function main() {
  const [archiveItems, substackItems, articleItems] = await Promise.all([
    readJson(ARCHIVE_PATH),
    readJson(SUBSTACK_PATH),
    readJson(ARTICLE_PATH)
  ]);

  const merged = new Map();

  for (const rawItem of archiveItems) {
    const item = normalizeItem(rawItem);
    if (!item.title || !item.url) continue;
    item.source = inferSource(item.url, item.source);
    merged.set(item.url, item);
  }

  for (const rawItem of substackItems) {
    const item = normalizeItem(rawItem, 'Substack');
    if (!item.title || !item.url) continue;
    item.source = inferSource(item.url, item.source);
    const existing = merged.get(item.url) || {};
    merged.set(item.url, {
      ...existing,
      ...item,
      summary: item.summary || existing.summary || ''
    });
  }

  for (const rawItem of articleItems) {
    const item = normalizeItem(rawItem, 'LinkedIn');
    if (!item.title || !item.url) continue;
    item.source = inferSource(item.url, item.source);
    const existing = merged.get(item.url) || {};
    merged.set(item.url, {
      ...existing,
      ...item,
      summary: item.summary || existing.summary || ''
    });
  }

  const sorted = Array.from(merged.values()).sort((a, b) => {
    return asTimestamp(b.date) - asTimestamp(a.date);
  });

  await fs.mkdir(path.dirname(ARCHIVE_PATH), { recursive: true });
  await fs.writeFile(ARCHIVE_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  console.log(`Merged ${sorted.length} articles into ${ARCHIVE_PATH}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
