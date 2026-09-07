# Jaziel AI Pilot V2 — Setup

## 1. Keep repositories separate

Use two repositories:
- `jaziel` — public website
- `jaziel-ai-pilot` — private content automation engine

Do not replace the current Jaziel website yet.

## 2. Install

Install Python 3.10+ and the dependency listed in `requirements.txt`.

## 3. Validate

Run the validator before every build. A failing article is not generated.

## 4. Build

Run the generator after validation. The local output is stored under `generated/articles/` so the live website is untouched.

## 5. Next phase

The next implementation is the GitHub Publisher. It will copy only validated generated output into the separate Jaziel repository and create a controlled commit.

## Cloudflare later

Cloudflare Worker will call the same deterministic pipeline. API credentials will be stored as Cloudflare Secrets. Cron will be added only after the publisher has been tested locally.
