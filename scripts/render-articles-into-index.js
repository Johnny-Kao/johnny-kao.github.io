#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const INDEX_PATH = path.join(process.cwd(), 'index.html');
const SUBSTACK_JSON_PATH = path.join(process.cwd(), 'data', 'substack.json');
const ARTICLE_JSON_PATH = path.join(process.cwd(), 'data', 'article.json');
const START_MARKER = '<!-- ARTICLES:BEGIN -->';
const END_MARKER = '<!-- ARTICLES:END -->';
const MAX_ITEMS = 5;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatArticleDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
}

function normalizeArticles(items, limit) {
  return (items || [])
    .slice(0, limit || MAX_ITEMS)
    .map((item) => ({
      date: formatArticleDate(item.date || ''),
      title: (item.title || '').trim(),
      summary: (item.summary || '').trim(),
      url: (item.url || '').trim()
    }))
    .filter((item) => item.title && item.url);
}

function buildArticleMarkup(article, index) {
  const delay = index + 1;
  return [
    `        <a href="${escapeHtml(article.url)}" class="writing-item" target="_blank" rel="noopener noreferrer" data-reveal data-delay="${delay}">`,
    `          <span class="writing-date">${escapeHtml(article.date)}</span>`,
    '          <div class="writing-item-content">',
    `            <h3 class="writing-title">${escapeHtml(article.title)}</h3>`,
    `            <div class="writing-excerpt">${escapeHtml(article.summary)}<span class="writing-readmore">Read more<span class="external-mark" aria-hidden="true">↗</span></span></div>`,
    '          </div>',
    '        </a>'
  ].join('\n');
}

function buildArticlesBlock(articles) {
  const body = articles.map(buildArticleMarkup).join('\n');
  return [
    '<nav class="writing-list" id="article-list" data-static-source="data/substack.json">',
    body,
    '      </nav>'
  ].join('\n');
}

async function readArticles() {
  try {
    const substackRaw = await fs.readFile(SUBSTACK_JSON_PATH, 'utf8');
    const substackItems = normalizeArticles(JSON.parse(substackRaw), MAX_ITEMS);
    if (substackItems.length) return substackItems;
  } catch (error) {
    // Fall through to article.json
  }

  const fallbackRaw = await fs.readFile(ARTICLE_JSON_PATH, 'utf8');
  return normalizeArticles(JSON.parse(fallbackRaw), MAX_ITEMS);
}

async function main() {
  const [indexHtml, articles] = await Promise.all([
    fs.readFile(INDEX_PATH, 'utf8'),
    readArticles()
  ]);

  if (!articles.length) {
    throw new Error('No valid articles available to render.');
  }

  const startIndex = indexHtml.indexOf(START_MARKER);
  const endIndex = indexHtml.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error('Articles markers not found in index.html.');
  }

  const before = indexHtml.slice(0, startIndex + START_MARKER.length);
  const after = indexHtml.slice(endIndex);
  const replacement = '\n' + buildArticlesBlock(articles) + '\n      ';
  const output = before + replacement + after;

  await fs.writeFile(INDEX_PATH, output, 'utf8');
  console.log(`Rendered ${articles.length} articles into ${INDEX_PATH}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
