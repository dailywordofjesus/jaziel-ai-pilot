const GH_API = "https://api.github.com";
const API_VERSION = "2026-03-10";
const DEFAULT_REPO = "dailywordofjesus/jaziel-ai-pilot";
const DEFAULT_BRANCH = "main";

function allowedOrigins(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function corsHeaders(origin, allowedOrigin) {
  const origins = allowedOrigins(allowedOrigin);
  const allowed = origins.includes("*") || origins.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : (origins[0] || ""),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status, origin, allowedOrigin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin, allowedOrigin) }
  });
}

function safeName(name) {
  return String(name || "image").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
}

function slugify(value) {
  return String(value || "article").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "article";
}

async function githubFetch(env, path, options = {}) {
  const response = await fetch(`${GH_API}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": API_VERSION,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${JSON.stringify(data).slice(0, 1500)}`);
  return data;
}

async function putFile(env, repo, branch, path, contentBase64, message) {
  let sha;
  try {
    const current = await githubFetch(env, `/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`);
    sha = current.sha;
  } catch (error) {
    if (!String(error.message).includes("GitHub API 404")) throw error;
  }

  const body = { message, content: contentBase64, branch };
  if (sha) body.sha = sha;
  return githubFetch(env, `/repos/${repo}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://dailywordofjesus.github.io,https://wordofjesus.github.io";
    const origins = allowedOrigins(allowedOrigin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, allowedOrigin) });
    }
    if (request.method !== "POST") return json({ error: "POST only" }, 405, origin, allowedOrigin);
    if (!origins.includes("*") && !origins.includes(origin)) return json({ error: "Origin not allowed" }, 403, origin, allowedOrigin);
    if (!env.GITHUB_TOKEN) return json({ error: "Bridge is missing GITHUB_TOKEN." }, 500, origin, allowedOrigin);

    try {
      const form = await request.formData();
      const draftRaw = form.get("draft");
      if (typeof draftRaw !== "string") return json({ error: "Missing draft JSON." }, 400, origin, allowedOrigin);

      const draft = JSON.parse(draftRaw);
      if (!draft.body || !String(draft.body).trim()) return json({ error: "Article body is empty." }, 400, origin, allowedOrigin);

      const repo = env.GITHUB_REPO || DEFAULT_REPO;
      const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
      const slug = slugify(draft.title || "jaziel-article");
      const assetRoot = `content/images/articles/${slug}`;

      const cover = form.get("cover");
      if (!(cover instanceof File)) return json({ error: "Cover image is required." }, 400, origin, allowedOrigin);
      const coverName = safeName(cover.name);
      const coverPath = `${assetRoot}/cover-${coverName}`;
      await putFile(env, repo, branch, coverPath, bytesToBase64(new Uint8Array(await cover.arrayBuffer())), `Draft: upload cover for ${slug}`);

      draft.cover = {
        src: `/${coverPath}`,
        alt: draft.cover?.alt || draft.title || "Cover image",
        caption: draft.cover?.caption || ""
      };

      const images = [];
      for (let index = 1; index <= 4; index++) {
        const file = form.get(`image_${index}`);
        if (!(file instanceof File)) continue;
        const name = safeName(file.name);
        const path = `${assetRoot}/${index}-${name}`;
        await putFile(env, repo, branch, path, bytesToBase64(new Uint8Array(await file.arrayBuffer())), `Draft: upload article image ${index} for ${slug}`);
        const source = draft.images?.[index - 1] || {};
        images.push({ src: `/${path}`, alt: source.alt || `Article photo ${index}`, caption: source.caption || "" });
      }
      draft.images = images;

      const draftPath = `content/drafts/current.json`;
      await putFile(env, repo, branch, draftPath, btoa(unescape(encodeURIComponent(JSON.stringify(draft, null, 2) + "\n"))), `Draft: submit ${slug} to Gemini`);

      const eventType = "jaziel_ai_build";
      await githubFetch(env, `/repos/${repo}/dispatches`, {
        method: "POST",
        body: JSON.stringify({ event_type: eventType, client_payload: { draft_file: draftPath, publish: false, slug } })
      });

      return json({ ok: true, slug, draft_file: draftPath, publish: false, message: "Draft submitted. Gemini AI Writer has been triggered with publish disabled." }, 200, origin, allowedOrigin);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500, origin, allowedOrigin);
    }
  }
};
