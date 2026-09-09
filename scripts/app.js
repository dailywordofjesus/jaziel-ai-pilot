const form = document.getElementById("articleForm");
const title = document.getElementById("title");
const category = document.getElementById("category");
const readTime = document.getElementById("readTime");
const dek = document.getElementById("dek");
const body = document.getElementById("body");
const verseReference = document.getElementById("verseReference");
const verseText = document.getElementById("verseText");
const coverFile = document.getElementById("coverFile");
const coverPreview = document.getElementById("coverPreview");
const coverCount = document.getElementById("coverCount");
const imageFiles = document.getElementById("imageFiles");
const imagePreview = document.getElementById("imagePreview");
const articleImageCount = document.getElementById("articleImageCount");
const output = document.getElementById("output");
const jsonOutput = document.getElementById("jsonOutput");
const result = document.getElementById("result");
const empty = document.getElementById("empty");
const imagePlan = document.getElementById("imagePlan");

let coverImage = null;
let articleImages = [];

function esc(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function slug(value) {
  return String(value || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function paragraphs(value) {
  return String(value || "").trim().split(/\n\s*\n/).filter(Boolean);
}

function paragraphHtml(items) {
  return items.map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");
}

function titleCase(value) {
  return String(value || "").replace(/[-_]+/g, " ")
    .replace(/\.[^.]+$/, "").replace(/\b\w/g, (m) => m.toUpperCase());
}

function imagePath(file) {
  if (!file) return "";
  return `/images/articles/${slug(title.value)}/${file.name}`;
}

function renderCoverPreview() {
  coverCount.textContent = coverImage ? "1 / 1" : "0 / 1";
  if (!coverImage) {
    coverPreview.className = "image-preview empty-images";
    coverPreview.innerHTML = "<p>Select one cover photo.</p>";
    return;
  }
  const url = URL.createObjectURL(coverImage);
  coverPreview.className = "image-preview";
  coverPreview.innerHTML = `<div class="image-card">
    <img src="${url}" alt="${esc(coverImage.name)}">
    <div class="image-card-body"><b>Cover</b><small>${esc(coverImage.name)}</small></div>
  </div>`;
}

function renderArticleImages() {
  articleImageCount.textContent = `${articleImages.length} / 4`;
  if (!articleImages.length) {
    imagePreview.className = "image-preview empty-images";
    imagePreview.innerHTML = "<p>Add up to four article photos.</p>";
    return;
  }
  imagePreview.className = "image-preview";
  imagePreview.innerHTML = articleImages.map((item, index) => {
    const url = URL.createObjectURL(item.file);
    return `<div class="image-card">
      <img src="${url}" alt="${esc(item.file.name)}">
      <div class="image-card-body">
        <b>Article photo ${index + 1}</b>
        <small>${esc(item.file.name)}</small>
        <input data-image-description="${index}" value="${esc(item.description)}" placeholder="Optional caption / alt text">
      </div>
    </div>`;
  }).join("");

  imagePreview.querySelectorAll("[data-image-description]").forEach((input) => {
    input.addEventListener("input", () => {
      articleImages[Number(input.dataset.imageDescription)].description = input.value;
    });
  });
}

coverFile.addEventListener("change", () => {
  coverImage = Array.from(coverFile.files || []).find((file) => file.type.startsWith("image/")) || null;
  renderCoverPreview();
});

imageFiles.addEventListener("change", () => {
  articleImages = Array.from(imageFiles.files || [])
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, 4)
    .map((file) => ({ file, description: "" }));
  renderArticleImages();
});

function buildSchema() {
  const t = title.value.trim();
  const d = dek.value.trim() || `A Christian reflection on ${t.toLowerCase()}.`;
  const bodyItems = paragraphs(body.value);
  const articleSlug = slug(t);
  const coverSrc = coverImage ? imagePath(coverImage) : "";
  const images = articleImages.map((item, index) => ({
    src: imagePath(item.file),
    alt: item.description || titleCase(item.file.name),
    caption: item.description || "",
    order: index + 1
  }));

  const chunkSize = Math.max(1, Math.ceil(bodyItems.length / 3));
  const sections = [];
  for (let i = 0; i < bodyItems.length; i += chunkSize) {
    sections.push({
      heading: i === 0 ? "When the Storm Comes" : i === chunkSize ? "Keep Holding On to Hope" : "What This Story Reminds Us",
      paragraphs: bodyItems.slice(i, i + chunkSize)
    });
  }

  return {
    title: t,
    slug: articleSlug,
    description: d,
    category: category.value,
    date: new Date().toISOString().slice(0, 10),
    read_time: readTime.value.trim() || "5 min read",
    dek: d,
    cover: {
      src: coverSrc,
      alt: coverImage ? titleCase(coverImage.name) : t,
      caption: ""
    },
    intro: bodyItems.slice(0, Math.min(2, bodyItems.length)),
    sections: sections.length ? sections : [{ heading: "A Story of Hope", paragraphs: [d] }],
    images,
    bible_verse: {
      reference: verseReference.value.trim() || "Psalm 34:18",
      text: verseText.value.trim() || "The Lord is close to the brokenhearted and saves those who are crushed in spirit."
    },
    closing: bodyItems.slice(-2).length ? bodyItems.slice(-2) : ["Keep trusting God, one step at a time."],
    seo: {
      title: `${t} | Jaziel`,
      description: d,
      keywords: ["Christian hope", "faith", "Jesus", "encouragement", "Bible"]
    },
    og: { title: t, description: d, image: coverSrc },
    tags: ["faith", "Jesus", "hope", "encouragement"],
    related_articles: []
  };
}

function buildHtml(schema) {
  const t = schema.title;
  const d = schema.description;
  const bodyItems = paragraphs(body.value);
  const bodyHtml = paragraphHtml(bodyItems);
  const inlineImages = schema.images.map((item) => `<figure class="article-inline-image"><img class="article-photo" src="${esc(item.src)}" alt="${esc(item.alt)}" loading="lazy"><figcaption>${esc(item.caption)}</figcaption></figure>`).join("\n");

  return `<!doctype html>
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
<meta property="og:image" content="${esc(schema.cover.src)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t)}">
<meta name="twitter:description" content="${esc(d)}">
<meta name="twitter:image" content="${esc(schema.cover.src)}">
<link rel="stylesheet" href="../style.css">
</head>
<body>
<header class="site-header"><div class="container nav-wrap">
<a class="brand" href="../index.html"><span>✦</span><strong>JAZIEL</strong><small>Faith • Hope • Jesus</small></a>
<button class="menu-btn" aria-label="Open menu">☰</button>
<nav><a href="../index.html">Home</a><a href="#">Bible</a><a href="#">Devotional</a><a class="active" href="#">Stories</a><a href="#">Prayer</a><a href="#">About</a></nav>
</div></header>
<main>
<div class="container breadcrumb"><a href="../index.html">Home</a><span>›</span><span>${esc(schema.category)}</span><span>›</span><span>${esc(t)}</span></div>
<article class="article-layout container">
<div class="article-main">
<header class="article-header">
<p class="eyebrow">${esc(schema.category).toUpperCase()}</p>
<h1>${esc(t)}</h1>
<p class="article-dek">${esc(d)}</p>
<div class="article-meta">${new Date().toLocaleDateString("en-US", {year:"numeric", month:"long", day:"numeric"})} <span>•</span> ${esc(schema.read_time)}</div>
</header>
${schema.cover.src ? `<figure class="article-cover"><img class="article-photo" src="${esc(schema.cover.src)}" alt="${esc(schema.cover.alt)}" loading="eager"><figcaption>Jaziel · Faith • Hope • Jesus</figcaption></figure>` : ""}
<div class="article-body">${bodyHtml}</div>
${inlineImages}
</div>
<aside class="article-sidebar"><div class="side-ad ad-slot" aria-label="Advertisement">ADVERTISEMENT</div></aside>
</article>
</main>
<footer class="site-footer"><div class="container footer-bottom">© 2026 Jaziel. All rights reserved.</div></footer>
</body></html>`;
}

function renderPlan(schema) {
  const rows = [];
  if (schema.cover.src) {
    rows.push(`<div class="plan-row"><div><b>Cover</b><small>${esc(coverImage.name)}</small></div><span>Chosen by you</span></div>`);
  }
  schema.images.forEach((item, index) => {
    rows.push(`<div class="plan-row"><div><b>Article photo ${index + 1}</b><small>${esc(articleImages[index].file.name)}</small></div><span>Order preserved</span></div>`);
  });
  imagePlan.innerHTML = rows.length ? rows.join("") : `<p class="plan-empty">No images selected.</p>`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const schema = buildSchema();
  output.value = buildHtml(schema);
  jsonOutput.value = JSON.stringify(schema, null, 2);
  document.getElementById("resultTitle").textContent = schema.title;
  document.getElementById("resultMeta").textContent = `${schema.category} · ${schema.read_time}`;
  empty.hidden = true;
  result.hidden = false;
  renderPlan(schema);
});

document.getElementById("copyBtn").addEventListener("click", async () => {
  await navigator.clipboard.writeText(output.value);
  const button = document.getElementById("copyBtn");
  button.textContent = "Copied ✓";
  setTimeout(() => { button.textContent = "Copy HTML"; }, 1400);
});

document.getElementById("copyJsonBtn").addEventListener("click", async () => {
  await navigator.clipboard.writeText(jsonOutput.value);
  const button = document.getElementById("copyJsonBtn");
  button.textContent = "Copied ✓";
  setTimeout(() => { button.textContent = "Copy JSON"; }, 1400);
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

document.getElementById("downloadJsonBtn").addEventListener("click", () => {
  const filename = `${slug(title.value) || "jaziel-article"}.json`;
  const url = URL.createObjectURL(new Blob([jsonOutput.value], {type: "application/json"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById("sampleBtn").addEventListener("click", () => {
  title.value = "Finding Hope When Life Feels Impossible";
  category.value = "bible-faith";
  readTime.value = "5 min read";
  dek.value = "When the road ahead feels uncertain, faith can remind us that Jesus is still near.";
  verseReference.value = "Psalm 34:18";
  verseText.value = "The Lord is close to the brokenhearted and saves those who are crushed in spirit.";
  body.value = `There are seasons when tomorrow feels difficult to imagine. In those moments, even a small reminder of hope can change the way we see the road ahead.

For Christians, hope is not simply positive thinking. It is the confidence that Jesus remains present, even when circumstances are beyond our control.

Sometimes the first step is simply to stop, breathe, and remember that we do not have to carry every burden alone. Prayer gives us space to bring our fears to God and listen for His peace.

Faith does not promise an easy road. It gives us a reason to keep walking it. Whatever today holds, we can choose to place our trust in Jesus one step at a time.`;
});

renderCoverPreview();
renderArticleImages();
