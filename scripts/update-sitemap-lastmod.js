#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const SITEMAP_PATH = path.join(process.cwd(), 'sitemap.xml');
const TODAY = new Date().toISOString().slice(0, 10);
const URLS_TO_UPDATE = [
  'https://johnnykao.com/',
  'https://johnnykao.com/data/substack.json'
];

async function main() {
  let xml = await fs.readFile(SITEMAP_PATH, 'utf8');

  for (const url of URLS_TO_UPDATE) {
    const pattern = new RegExp(`(<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/loc>\\s*<lastmod>)([^<]+)(<\\/lastmod>)`);
    xml = xml.replace(pattern, `$1${TODAY}$3`);
  }

  await fs.writeFile(SITEMAP_PATH, xml, 'utf8');
  console.log(`Updated sitemap lastmod to ${TODAY}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
