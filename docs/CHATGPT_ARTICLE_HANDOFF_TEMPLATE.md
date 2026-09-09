# ChatGPT → Jaziel AI Pilot: Article Handoff Template

Use this workflow when the editor wants ChatGPT to turn an Indonesian draft into a Jaziel-ready article.

## What the editor sends ChatGPT

```text
JAZIEL ARTICLE

Original title/topic:
[optional]

Indonesian draft:
[paste the article here]

Bible verse that must remain:
[optional]

Notes / facts that must remain:
[optional]

Photos:
1. [upload photo]
2. [upload photo]
3. [upload photo]
4. [upload photo]
```

## What ChatGPT prepares

ChatGPT should:

1. Preserve the author's core meaning and factual claims.
2. Improve structure, clarity, emotional flow, and readability.
3. Rewrite into natural English for a broad English-speaking Christian audience, with a U.S.-friendly tone where appropriate.
4. Choose one allowed Jaziel category.
5. Create a clean lowercase hyphenated slug.
6. Create the introduction, sections, closing, Bible verse, SEO metadata, Open Graph metadata, tags, and related article slugs.
7. Map the supplied photos to `cover` and `images` without inventing files.
8. Produce JSON that conforms exactly to **Jaziel Article Schema v1**.

## Handoff contract

The final machine-readable output must contain only the schema fields defined by `schemas/article.schema.json`. That schema currently requires:

- `title`
- `slug`
- `description`
- `category`
- `date`
- `read_time`
- `dek`
- `cover`
- `intro`
- `sections`
- `bible_verse`
- `closing`
- `seo`
- `og`
- `tags`
- `related_articles`

The optional `images` field may contain the remaining supplied photos. The schema rejects unknown properties, so do not add custom fields.

## Photo handling

Recommended mapping for four photos:

- Photo 1 → `cover`
- Photos 2–4 → `images`

If fewer photos are supplied, do not fabricate additional image paths. If a photo cannot be safely mapped to a repository path yet, keep the article package in an editor-ready state rather than inventing a path.

## Date

Use the publication date supplied by the editor. If none is supplied, the editor should approve the intended publication date before the JSON is committed.

## Final handoff

The approved JSON goes into:

`content/articles/<slug>.json`

Then the AI Pilot pipeline handles:

`validate.py → generate.py → build check → publisher → Jaziel`

ChatGPT should not bypass validation or directly publish production HTML.
