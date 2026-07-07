#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const ARCHIVE_PAGE_PATH = path.join(process.cwd(), 'articles', 'index.html');
const ARCHIVE_JSON_PATH = path.join(process.cwd(), 'data', 'articles-archive.json');
const START_MARKER = '<!-- ARCHIVE:BEGIN -->';
const END_MARKER = '<!-- ARCHIVE:END -->';

function formatArticleDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildArchiveItem(article, index) {
  const summaryMarkup = article.summary
    ? `<div class="writing-excerpt">${escapeHtml(article.summary)}<span class="writing-readmore">Read more<span class="external-mark" aria-hidden="true">↗</span></span></div>`
    : `<div class="writing-excerpt"><span class="writing-readmore">Read more<span class="external-mark" aria-hidden="true">↗</span></span></div>`;

  return [
    `        <a href="${escapeHtml(article.url)}" class="writing-item" target="_blank" rel="noopener noreferrer">`,
    `          <span class="writing-date">${escapeHtml(formatArticleDate(article.date || ''))}</span>`,
    '          <div class="writing-item-content">',
    `            <h3 class="writing-title">${escapeHtml(article.title)}</h3>`,
    `            ${summaryMarkup}`,
    '          </div>',
    '        </a>'
  ].join('\n');
}

async function main() {
  const [archiveHtml, rawJson] = await Promise.all([
    fs.readFile(ARCHIVE_PAGE_PATH, 'utf8'),
    fs.readFile(ARCHIVE_JSON_PATH, 'utf8')
  ]);

  const articles = JSON.parse(rawJson).filter((item) => item.title && item.url);
  if (!articles.length) {
    throw new Error('No valid archive articles found.');
  }

  const startIndex = archiveHtml.indexOf(START_MARKER);
  const endIndex = archiveHtml.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error('Archive markers not found in archive page.');
  }

  const before = archiveHtml.slice(0, startIndex + START_MARKER.length);
  const after = archiveHtml.slice(endIndex);
  const replacement = '\n      <nav class="writing-list" id="article-list" data-static-source="/data/articles-archive.json">\n' + articles.map(buildArchiveItem).join('\n') + '\n      </nav>\n      ';
  const output = before + replacement + after;

  await fs.writeFile(ARCHIVE_PAGE_PATH, output, 'utf8');
  console.log(`Rendered ${articles.length} archived articles into ${ARCHIVE_PAGE_PATH}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
