# Jaziel AI Pilot V2

Cloudflare-ready content automation foundation for Jaziel.

## Current scope
- Jaziel Article Schema v1 is locked.
- Deterministic article validation.
- Deterministic HTML generation.
- Output uses `/articles/<slug>/index.html`.
- SEO, canonical, Open Graph, Twitter Card, and Article JSON-LD are generated from schema data.
- No API keys are stored in the repository.
- No changes are made to the JAZIEL website repository automatically yet.

## Roadmap
1. Schema v1 — LOCKED
2. AI Pilot V2 — THIS PACKAGE
3. Validator — INCLUDED
4. GitHub Publisher — NEXT
5. Test with JAZIEL V1 — NEXT
6. Cloudflare Worker — AFTER LOCAL TEST
7. Cron — AFTER WORKER TEST
8. Auto Publish
9. JAZIEL V2

## Local use
Requires Python 3.10+.

Install dependency:
`pip install -r requirements.txt`

Validate all articles:
`python scripts/validate.py`

Build all valid articles:
`python scripts/generate.py`

Generated files appear in `generated/articles/<slug>/index.html` by default. This is deliberately separate from the live Jaziel repository until the publisher phase.

## Important
- Keep `jaziel` and `jaziel-ai-pilot` as separate repositories.
- Do not paste AI API keys or GitHub tokens into JSON, HTML, Python, or Git files.
- Keep `site_url` blank until the live Jaziel domain is confirmed.
- The generator is deterministic: the same article JSON produces the same HTML structure.
