# Jaziel AI Pilot Backend Bridge

This Cloudflare Worker is the secure bridge between the public GitHub Pages Pilot and the private GitHub Actions/Gemini workflow.

## What it does

1. Receives the article draft and 1 cover + up to 4 article images from the Pilot.
2. Stores the images and `content/drafts/current.json` in `dailywordofjesus/jaziel-ai-pilot`.
3. Sends a `repository_dispatch` event named `jaziel_ai_build`.
4. GitHub Actions reads `GEMINI_API_KEY` and runs the AI Writer.
5. Publishing remains disabled for this path.

The browser never receives `GITHUB_TOKEN` or `GEMINI_API_KEY`.

## Deploy

Install Wrangler and authenticate with Cloudflare:

```bash
npm install -g wrangler
wrangler login
```

From the `bridge` directory:

```bash
npx wrangler secret put GITHUB_TOKEN
npx wrangler deploy
```

Use a GitHub fine-grained personal access token scoped only to `dailywordofjesus/jaziel-ai-pilot` with:

- Contents: Read and write
- Actions: Read and write

The token is stored only as the Cloudflare Worker secret `GITHUB_TOKEN`.

Cloudflare documents `wrangler secret put` for encrypted Worker secrets. Do not put the token in `wrangler.toml` or source code.

After deployment, copy the Worker URL. It will look similar to:

`https://jaziel-ai-bridge.<your-subdomain>.workers.dev`

Then set that URL in the Pilot configuration as `window.JAZIEL_BRIDGE_URL`.
