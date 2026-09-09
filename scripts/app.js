const form = document.getElementById("articleForm");
const title = document.getElementById("title");
const category = document.getElementById("category");
const readTime = document.getElementById("readTime");
const dek = document.getElementById("dek");
const cover = document.getElementById("cover");
const body = document.getElementById("body");
const verseReference = document.getElementById("verseReference");
const verseText = document.getElementById("verseText");
const imageFiles = document.getElementById("imageFiles");
const imagePreview = document.getElementById("imagePreview");
const imageCount = document.getElementById("imageCount");
const output = document.getElementById("output");
const jsonOutput = document.getElementById("jsonOutput");
const result = document.getElementById("result");
const empty = document.getElementById("empty");
const imagePlan = document.getElementById("imagePlan");

let selectedImages = [];

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
  return value.trim().split(/\n\s*\n/).filter(Boolean);
}

function paragraphHtml(items) {
  return items.map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");
}

function titleCase(value) {
  return value.replace(/[-_]+/g, " ").replace(/\.[^.]+$/, "").replace(/\b\w/g, (m) => m.toUpperCase());
}

function fileRoleText(file, description) {
  return `${file.name} ${description || ""}`.toLowerCase();
}

function scoreImage(text, keywords) {
  return keywords.reduce((score, word) => score + (text.includes(word) ? 1 : 0), 0);
}

function chooseImagePlan() {
  const articleText = `${title.value} ${dek.value} ${body.value}`.toLowerCase();
  const images = selectedImages.map((item, index) => ({
    ...item,
    index,
    text: fileRoleText(item.file, item.description)
  }));

  if (!images.length) return [];

  const roles = [
    {
      role: "Cover",
      keywords: ["cover", "hero", "trophy", "victory", "champion", "world cup", "main"],
      fallback: "Best overall image for the story"
    },
    {
      role: "Story context",
      keywords: ["family", "father", "mother", "parent", "home", "childhood"],
      fallback: "Image that explains the personal story"
    },
    {
      role: "Turning point",
      keywords: ["father", "reunion", "safe", "found", "return", "emotional", "prayer"],
      fallback: "Image that fits the story's turning point"
    },
    {
      role: "Closing reflection",
      keywords: ["family", "memory", "history", "legacy", "together", "smile", "hope"],
      fallback: "Image that supports the closing reflection"
    }
  ];

  const used = new Set();
  const plan = [];
  const articleBoost = articleText.split(/\W+/).filter(Boolean);

  roles.forEach((role, roleIndex) => {
    let best = null;
    images.forEach((image) => {
      if (used.has(image.index)) return;
      const base = scoreImage(image.text, role.keywords);
      const context = role.keywords.reduce((score, word) => score + (articleBoost.includes(word) ? 0.2 : 0), 0);
      const value = base + context;
      if (!best || value > best.value) best = { image, value };
    });

    if (!best) {
      const fallback = images[roleIndex % images.length];
      best = { image: fallback, value: 0 };
    }

    used.add(best.image.index);
    plan.push({
      role: role.role,
      file: best.image.file.name,
      description: best.image.description || titleCase(best.image.file.name),
      reason: best.value > 0 ? "Matched to article context and image description." : role.fallback,
      src: `/images/articles/${slug(title.value)}/${best.image.file.name}`
    });
  });

  return plan.slice(0, images.length);
}

function renderImagePreview() {
  imageCount.textContent = `${selectedImages.length} / 4`;
  if (!selectedImages.length) {
    imagePreview.className = "image-preview empty-images";
    imagePreview.innerHTML = "<p>Select the four photos you want to use for this article.</p>";
    return;
  }

  imagePreview.className = "image-preview";
  imagePreview.innerHTML = selectedImages.map((item, index) => {
    const url = URL.createObjectURL(item.file);
    return `<div class="image-card">
      <img src="${url}" alt="${esc(item.file.name)}">
      <div class="image-card-body">
        <b>Photo ${index + 1}</b>
        <small>${esc(item.file.name)}</small>
        <input data-image-description="${index}" value="${esc(item.description)}" placeholder="Optional description, e.g. Romário with his father">
      </div>
    </div>`;
  }).join("");

  imagePreview.querySelectorAll("[data-image-description]").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.imageDescription);
      selectedImages[index].description = input.value;
    });
  });
}

imageFiles.addEventListener("change", () => {
  const files = Array.from(imageFiles.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 4);
  selectedImages = files.map((file) => ({
    file,
    description: ""
  }));
  renderImagePreview();
});

function buildSchema(plan) {
  const t = title.value.trim();
  const d = dek.value.trim() || `A Christian reflection on ${t.toLowerCase()}.`;
  const bodyItems = paragraphs(body.value);
  const groups = [];
  const chunkSize = Math.max(1, Math.ceil(bodyItems.length / 3));

  for (let i = 0; i < bodyItems.length; i += chunkSize) {
    groups.push({
      heading: i === 0 ? "When the Storm Comes" : i === chunkSize ? "Keep Holding On to Hope" : "What This Story Reminds Us",
      paragraphs: bodyItems.slice(i, i + chunkSize)
    });
  }

  const coverImage = plan.find((item) => item.role === "Cover") || plan[0];
  const images = plan.filter((item) => item.role !== "Cover").map((item) => ({
    src: item.src,
    alt: item.description || item.role,
    caption: item.description || ""
  }));

  return {
    title: t,
    slug: slug(t),
    description: d,
    category: category.value,
    date: new Date().toISOString().slice(0, 10),
    read_time: readTime.value.trim() || "5 min read",
    dek: d,
    cover: {
      src: coverImage ? coverImage.src : cover.value.trim(),
      alt: coverImage ? coverImage.description : t,
      caption: coverImage ? coverImage.description : ""
    },
    intro: bodyItems.slice(0, Math.min(2, bodyItems.length)),
    sections: groups.length ? groups : [{ heading: "A Story of Hope", paragraphs: [d] }],
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
    og: {
      title: t,
      description: d,
      image: coverImage ? coverImage.src : cover.value.trim()
    },
    tags: ["faith", "Jesus", "hope", "encouragement"],
    related_articles: []
  };
}

function build(plan) {
  const t = title.value.trim();
  const d = dek.value.trim();
  const img = (plan.find((item) => item.role === "Cover") || plan[0])?.src || cover.value.trim();
  const categoryValue = category.value.trim();
  const readTimeValue = readTime.value.trim();
  const bodyItems = paragraphs(body.value);
  const bodyHtml = paragraphHtml(bodyItems);
  const articleSlug = slug(t);
  const schema = buildSchema(plan);

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
${plan.filter((item) => item.role !== "Cover").map((item) => `<figure class="article-inline-image"><img class="article-photo" src="${esc(item.src)}" alt="${esc(item.description)}" loading="lazy"><figcaption>${esc(item.description)}</figcaption></figure>`).join("\n")}
</div>
<aside class="article-sidebar"><div class="side-ad ad-slot" aria-label="Advertisement">ADVERTISEMENT</div></aside>
</article>
</main>
<footer class="site-footer"><div class="container footer-bottom">© 2026 Jaziel. All rights reserved.</div></footer>
</body></html>`;

  output.value = html;
  jsonOutput.value = JSON.stringify(schema, null, 2);
  document.getElementById("resultTitle").textContent = t;
  document.getElementById("resultMeta").textContent = `${categoryValue} · ${readTimeValue}`;
  empty.hidden = true;
  result.hidden = false;
  renderPlan(plan);
  return articleSlug;
}

function renderPlan(plan) {
  if (!plan.length) {
    imagePlan.innerHTML = `<p class="plan-empty">No new image files selected. The existing cover path will be used.</p>`;
    return;
  }
  imagePlan.innerHTML = plan.map((item) => `<div class="plan-row"><div><b>${esc(item.role)}</b><small>${esc(item.file)}</small></div><span>${esc(item.reason)}</span></div>`).join("");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const plan = chooseImagePlan();
  build(plan);
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
  cover.value = "/images/articles/finding-hope-when-life-feels-impossible.jpg";
  verseReference.value = "Psalm 34:18";
  verseText.value = "The Lord is close to the brokenhearted and saves those who are crushed in spirit.";
  body.value = `There are seasons when tomorrow feels difficult to imagine. In those moments, even a small reminder of hope can change the way we see the road ahead.

For Christians, hope is not simply positive thinking. It is the confidence that Jesus remains present, even when circumstances are beyond our control.

Sometimes the first step is simply to stop, breathe, and remember that we do not have to carry every burden alone. Prayer gives us space to bring our fears to God and listen for His peace.

Faith does not promise an easy road. It gives us a reason to keep walking it. Whatever today holds, we can choose to place our trust in Jesus one step at a time.`;
});
