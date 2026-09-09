import argparse
import json
import os
import re
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")

OUTPUT_SCHEMA = {
    "type": "object",
    "required": ["title", "description", "dek", "intro", "sections", "bible_verse", "closing", "keywords", "tags"],
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "dek": {"type": "string"},
        "intro": {"type": "array", "items": {"type": "string"}, "minItems": 1, "maxItems": 2},
        "sections": {
            "type": "array",
            "minItems": 2,
            "maxItems": 5,
            "items": {
                "type": "object",
                "required": ["heading", "paragraphs"],
                "properties": {
                    "heading": {"type": "string"},
                    "paragraphs": {"type": "array", "items": {"type": "string"}, "minItems": 1},
                },
            },
        },
        "bible_verse": {
            "type": "object",
            "required": ["reference", "text"],
            "properties": {"reference": {"type": "string"}, "text": {"type": "string"}},
        },
        "closing": {"type": "array", "items": {"type": "string"}, "minItems": 1, "maxItems": 3},
        "keywords": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
        "tags": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 8},
    },
}


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"^-+|-+$", "", value) or "jaziel-article"


def call_gemini(prompt: str) -> dict:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not available in the GitHub Actions environment.")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{DEFAULT_MODEL}:generateContent"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": OUTPUT_SCHEMA,
            "temperature": 0.4,
        },
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini API HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Gemini API connection failed: {exc.reason}") from exc

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Gemini returned an unexpected response: {json.dumps(data)[:2000]}") from exc


def build_prompt(draft: dict) -> str:
    supplied_verse = draft.get("verse_reference", "").strip()
    supplied_text = draft.get("verse_text", "").strip()
    verse_instruction = (
        "The draft supplies a Bible verse. Preserve its reference and wording exactly; do not replace it."
        if supplied_verse and supplied_text
        else "If the draft clearly names a Bible verse, use that verse. Otherwise choose one fitting Bible verse. Do not invent a reference."
    )

    return f"""
You are the AI Writer for Jaziel, a Christian publication for an English-speaking audience.

The user supplies an Indonesian draft. Rewrite it into polished, natural English suitable for a thoughtful Christian article.
Preserve the factual story, names, dates, numbers, and meaning. Do not invent new factual events.
Translate the title into natural English when appropriate.
Create a strong but honest description and dek for SEO/social sharing.
Use a warm, hopeful, biblical tone without sensationalism.
{verse_instruction}

IMPORTANT IMAGE RULE:
Images are selected by the user. Do not choose, reorder, remove, or generate images.
This AI task is text-only.

TITLE:
{draft.get('title', '')}

CATEGORY:
{draft.get('category', 'inspiring-stories')}

READ TIME:
{draft.get('read_time', '5 min read')}

USER-PROVIDED VERSE REFERENCE:
{supplied_verse}

USER-PROVIDED VERSE TEXT:
{supplied_text}

INDONESIAN DRAFT:
{draft.get('body', '')}
""".strip()


def build_article(draft: dict, ai: dict) -> dict:
    title = ai["title"].strip()
    cover = draft.get("cover", {})
    images = draft.get("images", [])

    fixed_images = []
    for index, image in enumerate(images[:4], start=1):
        fixed_images.append({
            "src": image.get("src", ""),
            "alt": image.get("alt", f"Article photo {index}"),
            "caption": image.get("caption", ""),
        })

    return {
        "title": title,
        "slug": slugify(title),
        "description": ai["description"].strip(),
        "category": draft.get("category", "inspiring-stories"),
        "date": date.today().isoformat(),
        "read_time": draft.get("read_time", "5 min read"),
        "dek": ai["dek"].strip(),
        "cover": {
            "src": cover.get("src", ""),
            "alt": cover.get("alt", title),
            "caption": cover.get("caption", ""),
        },
        "intro": [item.strip() for item in ai["intro"] if item.strip()],
        "sections": ai["sections"],
        "images": fixed_images,
        "bible_verse": {
            "reference": ai["bible_verse"]["reference"].strip(),
            "text": ai["bible_verse"]["text"].strip(),
        },
        "closing": [item.strip() for item in ai["closing"] if item.strip()],
        "seo": {
            "title": f"{title} | Jaziel",
            "description": ai["description"].strip(),
            "keywords": ai["keywords"],
        },
        "og": {
            "title": title,
            "description": ai["description"].strip(),
            "image": cover.get("src", ""),
        },
        "tags": ai["tags"],
        "related_articles": [],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Use Gemini to turn an Indonesian Jaziel draft into Schema v1 JSON.")
    parser.add_argument("--input", required=True, help="Draft JSON file")
    parser.add_argument("--output", required=True, help="Output Schema v1 JSON file")
    args = parser.parse_args()

    draft = json.loads(Path(args.input).read_text(encoding="utf-8"))
    print(f"Calling Gemini model: {DEFAULT_MODEL}")
    ai = call_gemini(build_prompt(draft))
    article = build_article(draft, ai)

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(article, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"AI ARTICLE READY: {output}")
    print(f"TITLE: {article['title']}")
    print(f"VERSE: {article['bible_verse']['reference']}")
    print(f"IMAGES PRESERVED: {len(article['images'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
