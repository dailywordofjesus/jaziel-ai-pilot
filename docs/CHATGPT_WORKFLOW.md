# ChatGPT → Jaziel AI Pilot → Jaziel

## Purpose

ChatGPT is the editorial layer. Jaziel AI Pilot is the controlled build and publishing layer. The Jaziel repository is the production website.

## Standard workflow

1. The editor sends ChatGPT an article draft in Indonesian.
2. The editor uploads up to four article photos.
3. ChatGPT rewrites and develops the draft into natural English for an American/global Christian audience while preserving the original meaning.
4. ChatGPT prepares the article using **Jaziel Article Schema v1**.
5. The article JSON is placed in `content/articles/` in the AI Pilot repository.
6. GitHub Actions validates the JSON against the schema.
7. `generate.py` renders the approved JSON into `generated/articles/<slug>/index.html`.
8. The generated HTML is checked for unresolved template placeholders.
9. The publisher can publish the generated article to `dailywordofjesus/jaziel` under `articles/<slug>/`.
10. The Jaziel repository deploys the website through its existing hosting setup.

## Editorial rules

- Do not change Jaziel Article Schema v1 unless explicitly approved.
- Do not let ChatGPT write production HTML as the source of truth; JSON is the content contract.
- Preserve the author's intended message and facts.
- Use natural English rather than literal translation.
- Keep Christian/Bible references accurate and contextually relevant.
- Use the supplied photos; do not invent photo filenames.
- Validate before publishing.
- Never store GitHub tokens, API keys, or other secrets in article JSON or source files.

## Human control

The workflow is intentionally not 100% autonomous. The editor approves the article before it is added to the AI Pilot content directory and can choose when to publish it.

## Recommended article handoff

Provide ChatGPT:

- Indonesian draft
- desired title or topic (optional)
- four photos (preferred)
- any specific Bible verse or message that must remain

ChatGPT returns:

- polished English article
- schema-compliant article JSON
- image mapping for the four supplied photos
- SEO/OG metadata
- Bible verse
- tags and related-article data when available

## Publishing safety

`Jaziel Publish` only performs a real publish when manually dispatched with `Publish = true`. The GitHub secret `JAZIEL_PUBLISH_TOKEN` is injected by GitHub Actions and is never stored in this repository.
