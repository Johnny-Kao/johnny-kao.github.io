#!/usr/bin/env node

const fs = require('node:fs/promises');

const OUTPUT_PATH = 'data/substack-sync.json';
const SOURCE_URL = process.env.SUBSTACK_JSON_URL || 'https://substack-feed-worker.at12885.workers.dev/substack.json';
const CONTENT_CHANGED = process.env.CONTENT_CHANGED === 'true';

async function main() {
  const payload = {
    checkedAt: new Date().toISOString(),
    source: SOURCE_URL,
    contentChanged: CONTENT_CHANGED
  };

  await fs.mkdir('data', { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Updated ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
