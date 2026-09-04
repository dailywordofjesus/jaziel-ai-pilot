import json
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "articles"
TEMPLATE = ROOT / "templates" / "article.html"
OUTPUT = ROOT / "generated" / "articles"

def paragraphs(items):
    return "\n".join(f"<p>{escape(p)}</p>" for p in items)

def render_sections(sections):
    blocks = []
    for section in sections:
        blocks.append(f'<h2 class="article-section-title">{escape(section["heading"])}</h2>')
        blocks.append(paragraphs(section.get("paragraphs", [])))
        image = section.get("image")
        if image:
            blocks.append(
                '<figure class="article-inline-image">'
                f'<img class="article-photo" src="../../{escape(image["src"])}" '
                f'alt="{escape(image["alt"])}" loading="lazy">'
                f'<figcaption>{escape(image.get("caption", ""))}</figcaption>'
                '</figure>'
            )
    return "\n\n".join(blocks)

def render_verse(verse):
    if not verse:
        return ""
    return (
        '<div class="verse-card">'
        '<span>“</span>'
        f'<blockquote>{escape(verse["text"])}</blockquote>'
        f'<p>{escape(verse["reference"])}</p>'
        '</div>'
    )

def render_article(data):
    intro = paragraphs(data.get("intro", []))
    sections = render_sections(data.get("sections", []))
    verse = render_verse(data.get("verse"))
    closing = paragraphs(data.get("closing", []))

    values = {
        "{{TITLE}}": escape(data["title"]),
        "{{DESCRIPTION}}": escape(data["description"]),
        "{{CATEGORY}}": escape(data["category"]),
        "{{DATE}}": escape(data["date"]),
        "{{READ_TIME}}": escape(data["read_time"]),
        "{{COVER_IMAGE}}": escape(data["cover_image"]),
        "{{COVER_ALT}}": escape(data["cover_alt"]),
        "{{COVER_CAPTION}}": escape(data.get("cover_caption", "")),
        "{{DEK}}": escape(data.get("dek", "")),
        "{{INTRO}}": intro,
        "{{SECTIONS}}": sections,
        "{{VERSE}}": verse,
        "{{CLOSING}}": closing
    }

    html = TEMPLATE.read_text(encoding="utf-8")
    for key, value in values.items():
        html = html.replace(key, value)

    out = OUTPUT / f'{data["slug"]}.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    return out

def main():
    files = sorted(CONTENT.glob("*.json"))
    if not files:
        print("No article JSON files found.")
        return

    for path in files:
        if path.name == "example.json":
            data = json.loads(path.read_text(encoding="utf-8"))
            data.setdefault("intro", [
                "There are seasons when tomorrow feels difficult to imagine. In those moments, even a small reminder of hope can change the way we see the road ahead.",
                "For Christians, hope is not simply positive thinking. It is the confidence that Jesus remains present, even when circumstances are beyond our control."
            ])
            out = render_article(data)
            print(f"Generated: {out}")
        else:
            data = json.loads(path.read_text(encoding="utf-8"))
            out = render_article(data)
            print(f"Generated: {out}")

if __name__ == "__main__":
    main()
