# substack-feed-worker

Cloudflare Worker for turning the Substack RSS feed into a stable JSON endpoint that GitHub Actions can fetch.

## What it does

- Fetches `https://johnnykao.substack.com/feed`
- Normalizes the latest 5 posts to:
  - `date`
  - `title`
  - `summary`
  - `url`
- Stores the latest JSON in Workers KV
- Serves a cached JSON response from:
  - `/`
  - `/substack.json`
- Refreshes automatically with a Cron Trigger

## Why this setup

This avoids relying on GitHub Actions to fetch Substack RSS directly, which can return `403 Forbidden`.

Recommended flow:

```text
Substack RSS
→ Cloudflare Worker
→ stable JSON endpoint
→ GitHub Actions
→ data/substack.json
→ index.html Articles
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a KV namespace

```bash
npx wrangler kv namespace create SUBSTACK_CACHE
npx wrangler kv namespace create SUBSTACK_CACHE --preview
```

Copy the returned IDs into `wrangler.jsonc`:

- `id`
- `preview_id`

### 3. Deploy

```bash
npx wrangler deploy
```

### 4. Test

Open:

- `/health`
- `/refresh`
- `/substack.json`

## Suggested next step

Once deployed, update the GitHub workflow to fetch your Worker JSON endpoint instead of fetching Substack directly.
