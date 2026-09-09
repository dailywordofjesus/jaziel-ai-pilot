import json
import re
import sys
from datetime import date
from html import escape
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "articles"
SCHEMA = ROOT / "schemas" / "article.schema.json"
TEMPLATE = ROOT / "templates" / "article.html"
CONFIG = ROOT / "config.json"
OUTPUT = ROOT / "generated" / "articles"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate(data):
    schema = read_json(SCHEMA)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    return sorted(validator.iter_errors(data), key=lambda e: list(e.path))


def absolute_url(site_url, path):
    if not path:
        return ""
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if not site_url:
        return path
    return site_url.rstrip("/") + "/" + path.lstrip("/")


def article_asset_url(site_url, path):
    if not path:
        return ""
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if site_url:
        return absolute_url(site_url, path)
    # Generated articles live at /articles/<slug>/index.html.
    # From that location, the site root is three levels up:
    # /articles/<slug>/index.html -> /articles/<slug>/ -> /articles/ -> /
    # Therefore root-relative content paths such as /content/images/... need ../../../.
    return "../../../" + path.lstrip("/")


def display_date(value):
    y, m, d = map(int, value.split("-"))
    return date(y, m, d).strftime("%B %-d, %Y")


def paragraphs(items):
    return "\n".join(f"<p>{escape(item)}</p>" for item in items)


def render_sections(sections):
    blocks = []
    for section in sections:
        blocks.append(f'<h2 class="article-section-title">{escape(section["heading"])}</h2>')
        blocks.append(paragraphs(section["paragraphs"]))
    return "\n\n".join(blocks)


def render_images(images, site_url):
    blocks = []
    for image in images:
        caption = image.get("caption", "")
        figcaption = f'<figcaption>{escape(caption)}</figcaption>' if caption else ""
        src = article_asset_url(site_url, image["src"])
        blocks.append(
            '<figure class="article-inline-image">'
            f'<img class="article-photo" src="{escape(src, quote=True)}" '
            f'alt="{escape(image["alt"], quote=True)}" loading="lazy">'
            f'{figcaption}</figure>'
        )
    return "\n".join(blocks)


def render_verse(verse):
    return (
        '<div class="verse-card">'
        '<span>“</span>'
        f'<blockquote>{escape(verse["text"])}</blockquote>'
        f'<p>{escape(verse["reference"])}</p>'
        '</div>'
    )


def render_cover_caption(value):
    return f'<figcaption>{escape(value)}</figcaption>' if value else ""


def build_json_ld(data, article_url, image_url):
    payload = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": data["title"],
        "description": data["description"],
        "image": [image_url],
        "datePublished": data["date"],
        "dateModified": data["date"],
        "mainEntityOfPage": {"@type": "WebPage", "@id": article_url},
        "author": {"@type": "Organization", "name": "Jaziel"},
        "publisher": {"@type": "Organization", "name": "Jaziel"}
    }
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def render_article(data, site_url):
    article_url = absolute_url(site_url, f"/articles/{data['slug']}/") or f"/articles/{data['slug']}/"
    cover_url = article_asset_url(site_url, data["cover"]["src"])
    og_image = article_asset_url(site_url, data["og"]["image"])
    home_url = absolute_url(site_url, "/") or "../../index.html"
    category_url = f"../../category/{data['category']}/index.html"

    values = {
        "{{SEO_TITLE}}": escape(data["seo"]["title"], quote=True),
        "{{SEO_DESCRIPTION}}": escape(data["seo"]["description"], quote=True),
        "{{CANONICAL}}": f'<link rel="canonical" href="{escape(article_url, quote=True)}">',
        "{{OG_TITLE}}": escape(data["og"]["title"], quote=True),
        "{{OG_DESCRIPTION}}": escape(data["og"]["description"], quote=True),
        "{{OG_IMAGE}}": escape(og_image, quote=True),
        "{{ARTICLE_URL}}": escape(article_url, quote=True),
        "{{JSON_LD}}": escape(build_json_ld(data, article_url, cover_url), quote=False),
        "{{HOME_URL}}": escape(home_url, quote=True),
        "{{CATEGORY_URL}}": escape(category_url, quote=True),
        "{{CATEGORY}}": escape(data["category"]),
        "{{TITLE}}": escape(data["title"]),
        "{{DEK}}": escape(data["dek"]),
        "{{DATE_DISPLAY}}": escape(display_date(data["date"])),
        "{{READ_TIME}}": escape(data["read_time"]),
        "{{COVER_IMAGE}}": escape(cover_url, quote=True),
        "{{COVER_ALT}}": escape(data["cover"]["alt"], quote=True),
        "{{COVER_CAPTION}}": render_cover_caption(data["cover"].get("caption", "")),
        "{{INTRO}}": paragraphs(data["intro"]),
        "{{SECTIONS}}": render_sections(data["sections"]),
        "{{IMAGES}}": render_images(data.get("images", []), site_url),
        "{{VERSE}}": render_verse(data["bible_verse"]),
        "{{CLOSING}}": paragraphs(data["closing"])
    }

    html = TEMPLATE.read_text(encoding="utf-8")
    for key, value in values.items():
        html = html.replace(key, value)
    return html


def main():
    config = read_json(CONFIG)
    site_url = config.get("site_url", "").strip()
    files = sorted(CONTENT.glob("*.json"))
    if not files:
        print("No article JSON files found.")
        return 1

    failed = False
    for path in files:
        data = read_json(path)
        errors = validate(data)
        if errors:
            failed = True
            print(f"SKIP {path.name}: schema validation failed")
            for error in errors:
                location = ".".join(str(x) for x in error.path) or "root"
                print(f"  - {location}: {error.message}")
            continue

        out_dir = OUTPUT / data["slug"]
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / "index.html"
        out_file.write_text(render_article(data, site_url), encoding="utf-8")
        print(f"BUILT {out_file.relative_to(ROOT)}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
