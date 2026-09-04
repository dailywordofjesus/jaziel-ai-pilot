# Jaziel AI Pilot

Internal content workspace for the Jaziel — Faith • Hope • Jesus website.

## Current structure

- `index.html` — Pilot dashboard
- `assets/style.css` — Pilot interface
- `scripts/app.js` — article builder and HTML export
- `content/articles.json` — article registry
- `templates/article-template.html` — master article structure
- `config.json` — project settings

## Current workflow

1. Open `index.html`.
2. Enter an article brief.
3. Add the cover image path used by the Jaziel website.
4. Click **Build article**.
5. Copy or download the generated HTML.
6. Put the article and its images into the main `JAZIEL-main` repository.

## Important

This is the safe static foundation. It does **not** place an AI API key in browser code.

The next phase can connect the Pilot to a secure backend/worker so an AI model can generate article drafts without exposing the API key.
