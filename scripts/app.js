const form = document.getElementById("articleForm");
const title = document.getElementById("title");
const category = document.getElementById("category");
const readTime = document.getElementById("readTime");
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
  return String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function slug(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}
function titleCase(value) {
  return String(value || "").replace(/[-_]+/g," ").replace(/\.[^.]+$/,"").replace(/\b\w/g,m=>m.toUpperCase());
}
function renderCoverPreview() {
  coverCount.textContent = coverImage ? "1 / 1" : "0 / 1";
  if (!coverImage) { coverPreview.className="image-preview empty-images"; coverPreview.innerHTML="<p>Select one cover photo.</p>"; return; }
  const url=URL.createObjectURL(coverImage);
  coverPreview.className="image-preview";
  coverPreview.innerHTML=`<div class="image-card"><img src="${url}" alt="${esc(coverImage.name)}"><div class="image-card-body"><b>Cover</b><small>${esc(coverImage.name)}</small></div></div>`;
}
function renderArticleImages() {
  articleImageCount.textContent=`${articleImages.length} / 4`;
  if (!articleImages.length) { imagePreview.className="image-preview empty-images"; imagePreview.innerHTML="<p>Add up to four article photos.</p>"; return; }
  imagePreview.className="image-preview";
  imagePreview.innerHTML=articleImages.map((item,index)=>{const url=URL.createObjectURL(item.file);return `<div class="image-card"><img src="${url}" alt="${esc(item.file.name)}"><div class="image-card-body"><b>Article photo ${index+1}</b><small>${esc(item.file.name)}</small><input data-image-description="${index}" value="${esc(item.description)}" placeholder="Optional caption / alt text"></div></div>`;}).join("");
  imagePreview.querySelectorAll("[data-image-description]").forEach(input=>input.addEventListener("input",()=>{articleImages[Number(input.dataset.imageDescription)].description=input.value;}));
}
coverFile.addEventListener("change",()=>{coverImage=Array.from(coverFile.files||[]).find(file=>file.type.startsWith("image/"))||null;renderCoverPreview();});
imageFiles.addEventListener("change",()=>{articleImages=Array.from(imageFiles.files||[]).filter(file=>file.type.startsWith("image/")).slice(0,4).map(file=>({file,description:""}));renderArticleImages();});

function makeDraft() {
  if (!body.value.trim()) throw new Error("Please paste the Indonesian article first.");
  if (!coverImage) throw new Error("Please select one cover image.");
  if (!articleImages.length) throw new Error("Please select at least one article image.");
  return {
    title: title.value.trim(), category: category.value, read_time: readTime.value.trim() || "5 min read",
    body: body.value.trim(), verse_reference: verseReference.value.trim(), verse_text: verseText.value.trim(),
    cover: { alt:titleCase(coverImage.name), caption:"" },
    images: articleImages.map((item,index)=>({alt:item.description||titleCase(item.file.name),caption:item.description||"",order:index+1}))
  };
}
function renderPlan(draft) {
  const rows=[`<div class="plan-row"><div><b>Cover</b><small>${esc(coverImage.name)}</small></div><span>Chosen by you</span></div>`];
  draft.images.forEach((item,index)=>rows.push(`<div class="plan-row"><div><b>Article photo ${index+1}</b><small>${esc(articleImages[index].file.name)}</small></div><span>Order preserved</span></div>`));
  imagePlan.innerHTML=rows.join("");
}

async function submitDraft(draft) {
  const bridge = String(window.JAZIEL_BRIDGE_URL || "").trim();
  if (!bridge) throw new Error("The secure bridge is not configured yet. Set window.JAZIEL_BRIDGE_URL in scripts/bridge-config.js after deploying the Cloudflare Worker.");

  const formData = new FormData();
  formData.append("draft", JSON.stringify(draft));
  formData.append("cover", coverImage, coverImage.name);
  articleImages.forEach((item,index)=>formData.append(`image_${index+1}`, item.file, item.file.name));

  const response = await fetch(bridge.replace(/\/$/, ""), { method:"POST", body:formData });
  const data = await response.json().catch(()=>({}));
  if (!response.ok || !data.ok) throw new Error(data.error || `Bridge request failed (${response.status}).`);
  return data;
}

form.addEventListener("submit",async event=>{
  event.preventDefault();
  const button=form.querySelector('button[type="submit"]');
  try {
    const draft=makeDraft();
    renderPlan(draft);
    button.disabled=true; button.textContent="Submitting to Gemini…";
    output.value="Uploading your draft and photos securely…";
    empty.hidden=true; result.hidden=false;
    const data=await submitDraft(draft);
    output.value=`SUBMITTED ✓\n\nGemini AI Writer has been triggered.\nPublish: OFF\nSlug: ${data.slug}\nDraft: ${data.draft_file}\n\nOpen GitHub Actions to watch the run. The generated article will be available as an artifact after the AI Writer finishes.`;
    jsonOutput.value=JSON.stringify(draft,null,2);
    document.getElementById("resultTitle").textContent=draft.title||"Gemini draft";
    document.getElementById("resultMeta").textContent=`${draft.category} · ${draft.images.length} article image${draft.images.length===1?"":"s"}`;
  } catch(error) {
    output.value=`SUBMIT FAILED\n\n${error.message}`;
    empty.hidden=true; result.hidden=false;
    alert(error.message);
  } finally {
    button.disabled=false; button.textContent="Build article →";
  }
});

document.getElementById("copyBtn").addEventListener("click",async()=>{await navigator.clipboard.writeText(output.value);const b=document.getElementById("copyBtn");b.textContent="Copied ✓";setTimeout(()=>b.textContent="Copy status",1400);});
document.getElementById("copyJsonBtn").addEventListener("click",async()=>{await navigator.clipboard.writeText(jsonOutput.value);const b=document.getElementById("copyJsonBtn");b.textContent="Copied ✓";setTimeout(()=>b.textContent="Copy JSON",1400);});
document.getElementById("downloadBtn").addEventListener("click",()=>{const url=URL.createObjectURL(new Blob([output.value],{type:"text/plain"}));const a=document.createElement("a");a.href=url;a.download=`${slug(title.value)||"jaziel-build-status"}.txt`;a.click();URL.revokeObjectURL(url);});
document.getElementById("downloadJsonBtn").addEventListener("click",()=>{const url=URL.createObjectURL(new Blob([jsonOutput.value],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`${slug(title.value)||"jaziel-draft"}.json`;a.click();URL.revokeObjectURL(url);});
document.getElementById("sampleBtn").addEventListener("click",()=>{title.value="Finding Hope When Life Feels Impossible";category.value="bible-faith";readTime.value="5 min read";verseReference.value="Psalm 34:18";verseText.value="The Lord is close to the brokenhearted and saves those who are crushed in spirit.";body.value=`There are seasons when tomorrow feels difficult to imagine. In those moments, even a small reminder of hope can change the way we see the road ahead.\n\nFor Christians, hope is not simply positive thinking. It is the confidence that Jesus remains present, even when circumstances are beyond our control.\n\nSometimes the first step is simply to stop, breathe, and remember that we do not have to carry every burden alone. Prayer gives us space to bring our fears to God and listen for His peace.\n\nFaith does not promise an easy road. It gives us a reason to keep walking it. Whatever today holds, we can choose to place our trust in Jesus one step at a time.`;});
renderCoverPreview();renderArticleImages();
