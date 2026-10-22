#!/usr/bin/env node

const SITE_URL = 'https://johnnykao.com/';
const KEY = '36b6a2a8-2334-4d4a-94cb-759902020bff';
const KEY_LOCATION = `https://johnnykao.com/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

async function main() {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      host: 'johnnykao.com',
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList: [SITE_URL]
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`IndexNow request failed: ${response.status} ${response.statusText} ${text}`.trim());
  }

  console.log('IndexNow notified for homepage update.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
