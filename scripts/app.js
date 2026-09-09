const form = document.getElementById("articleForm");
const title = document.getElementById("title");
const category = document.getElementById("category");
const readTime = document.getElementById("readTime");
const dek = document.getElementById("dek");
const cover = document.getElementById("cover");
const body = document.getElementById("body");
const output = document.getElementById("output");
const result = document.getElementById("result");
const empty = document.getElementById("empty");

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function slug(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function paragraphs(value) {
  return value.trim().split(/\n\s*\n/).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");
}

function build() {
  const t = title.value.trim();
  const d = dek.value.trim();
  const img = cover.value.trim();
  const categoryValue = category.value.trim();
  const readTimeValue = readTime.value.trim();
  const bodyHtml = paragraphs(body.value);
  const articleSlug = slug(t);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t)} — Jaziel</title>
<meta name="description" content="${esc(d)}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(t)}">
<meta property="og:description" content="${esc(d)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t)}">
<meta name="twitter:description" content="${esc(d)}">
<meta name="twitter:image" content="${esc(img)}">
<link rel="stylesheet" href="../style.css">
</head>
<body>
<header class="site-header"><div class="container nav-wrap">
<a class="brand" href="../index.html"><span>✦</span><strong>JAZIEL</strong><small>Faith • Hope • Jesus</small></a>
<button class="menu-btn" aria-label="Open menu">☰</button>
<nav><a href="../index.html">Home</a><a href="#">Bible</a><a href="#">Devotional</a><a class="active" href="#">Stories</a><a href="#">Prayer</a><a href="#">About</a></nav>
</div></header>
<main>
<div class="container breadcrumb"><a href="../index.html">Home</a><span>›</span><span>${esc(categoryValue)}</span><span>›</span><span>${esc(t)}</span></div>
<article class="article-layout container">
<div class="article-main">
<header class="article-header">
<p class="eyebrow">${esc(categoryValue).toUpperCase()}</p>
<h1>${esc(t)}</h1>
<p class="article-dek">${esc(d)}</p>
<div class="article-meta">${new Date().toLocaleDateString("en-US", {year:"numeric", month:"long", day:"numeric"})} <span>•</span> ${esc(readTimeValue)}</div>
</header>
<figure class="article-cover"><img class="article-photo" src="${esc(img)}" alt="${esc(t)}" loading="eager"><figcaption>Jaziel · Faith • Hope • Jesus</figcaption></figure>
<div class="article-body">${bodyHtml}</div>
</div>
<aside class="article-sidebar"><div class="side-ad ad-slot" aria-label="Advertisement">ADVERTISEMENT</div></aside>
</article>
</main>
<footer class="site-footer"><div class="container footer-bottom">© 2026 Jaziel. All rights reserved.</div></footer>
</body></html>`;

  output.value = html;
  document.getElementById("resultTitle").textContent = t;
  document.getElementById("resultMeta").textContent = `${categoryValue} · ${readTimeValue}`;
  empty.hidden = true;
  result.hidden = false;
  return articleSlug;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  build();
});

document.getElementById("copyBtn").addEventListener("click", async () => {
  await navigator.clipboard.writeText(output.value);
  const button = document.getElementById("copyBtn");
  button.textContent = "Copied ✓";
  setTimeout(() => { button.textContent = "Copy HTML"; }, 1400);
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  const filename = `${slug(title.value) || "jaziel-article"}.html`;
  const url = URL.createObjectURL(new Blob([output.value], {type: "text/html"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById("sampleBtn").addEventListener("click", () => {
  title.value = "Finding Hope When Life Feels Impossible";
  category.value = "Inspiring Stories";
  readTime.value = "5 min read";
  dek.value = "When the road ahead feels uncertain, faith can remind us that Jesus is still near.";
  cover.value = "images/articles/finding-hope/photo-1-cover.jpg";
  body.value = `There are seasons when tomorrow feels difficult to imagine. In those moments, even a small reminder of hope can change the way we see the road ahead.

For Christians, hope is not simply positive thinking. It is the confidence that Jesus remains present, even when circumstances are beyond our control.

Sometimes the first step is simply to stop, breathe, and remember that we do not have to carry every burden alone. Prayer gives us space to bring our fears to God and listen for His peace.

Faith does not promise an easy road. It gives us a reason to keep walking it. Whatever today holds, we can choose to place our trust in Jesus one step at a time.`;
});
