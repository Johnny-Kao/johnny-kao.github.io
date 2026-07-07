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

function sortOrderFor(sourceTag, index) {
  const base = sourceTag === 'substack'
    ? 0
    : sourceTag === 'article'
      ? 10_000
      : 20_000;
  return base + index;
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

  for (const [index, rawItem] of archiveItems.entries()) {
    const item = normalizeItem(rawItem);
    if (!item.title || !item.url) continue;
    item.source = inferSource(item.url, item.source);
    merged.set(item.url, {
      ...item,
      __sortOrder: sortOrderFor('archive', index)
    });
  }

  for (const [index, rawItem] of substackItems.entries()) {
    const item = normalizeItem(rawItem, 'Substack');
    if (!item.title || !item.url) continue;
    item.source = inferSource(item.url, item.source);
    const existing = merged.get(item.url) || {};
    merged.set(item.url, {
      ...existing,
      ...item,
      summary: item.summary || existing.summary || '',
      __sortOrder: sortOrderFor('substack', index)
    });
  }

  for (const [index, rawItem] of articleItems.entries()) {
    const item = normalizeItem(rawItem, 'LinkedIn');
    if (!item.title || !item.url) continue;
    item.source = inferSource(item.url, item.source);
    const existing = merged.get(item.url) || {};
    merged.set(item.url, {
      ...existing,
      ...item,
      summary: item.summary || existing.summary || '',
      __sortOrder: existing.__sortOrder ?? sortOrderFor('article', index)
    });
  }

  const sorted = Array.from(merged.values()).sort((a, b) => {
    const timestampDiff = asTimestamp(b.date) - asTimestamp(a.date);
    if (timestampDiff !== 0) return timestampDiff;

    const sortOrderDiff = (a.__sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.__sortOrder ?? Number.MAX_SAFE_INTEGER);
    if (sortOrderDiff !== 0) return sortOrderDiff;

    return a.title.localeCompare(b.title, 'en');
  }).map(({ __sortOrder, ...item }) => item);

  await fs.mkdir(path.dirname(ARCHIVE_PATH), { recursive: true });
  await fs.writeFile(ARCHIVE_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  console.log(`Merged ${sorted.length} articles into ${ARCHIVE_PATH}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
