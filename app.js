const $ = (id) => document.getElementById(id);

const LIMITS = {
  Amazon: 200,
  eBay: 80,
  Shopify: 255,
  "TikTok Shop": 255,
  Temu: 255,
  Generic: 255
};

function clean(value) {
  return String(value || "").replace(/\\s+/g, " ").trim();
}

function splitKeywords(value) {
  return [...new Set(
    clean(value)
      .split(/[,\\n;|]+/)
      .map(x => clean(x.toLowerCase()))
      .filter(Boolean)
  )];
}

function words(value) {
  return clean(value).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function capText(text, max) {
  text = clean(text);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const safe = cut.slice(0, Math.max(0, cut.lastIndexOf(" "))).trim();
  return safe || cut;
}

function buildTitle(data) {
  const pieces = [];
  if (data.brand) pieces.push(data.brand);
  if (data.product) pieces.push(data.product);
  if (data.material) pieces.push(data.material);
  if (data.variant) pieces.push(data.variant);
  if (data.keywords[0] && !clean(pieces.join(" ")).toLowerCase().includes(data.keywords[0])) pieces.push(data.keywords[0]);
  return capText(pieces.join(" - "), LIMITS[data.marketplace]);
}

function buildBullets(data) {
  const featureList = clean(data.features).split(/[,\\n;]+/).map(clean).filter(Boolean);
  const fallback = [
    "Designed for everyday use with a practical and user-friendly design.",
    "Quality-focused construction made for reliable regular use.",
    "Suitable for home, office, travel, gifting and everyday requirements.",
    "Easy to use, store and maintain for convenient daily handling.",
    "A practical choice for customers looking for useful features and dependable value."
  ];
  const bullets = [];
  featureList.slice(0, 5).forEach((f, i) => {
    const keyword = data.keywords[i] || data.category;
    bullets.push((keyword ? keyword.charAt(0).toUpperCase() + keyword.slice(1) + " — " : "") + f + ".");
  });
  while (bullets.length < 5) bullets.push(fallback[bullets.length]);
  return bullets.slice(0, 5);
}

function buildDescription(data) {
  const subject = data.product || data.category || "This product";
  const brandPart = data.brand ? data.brand + " " : "";
  const featureText = data.features
    ? clean(data.features).split(/[,\\n;]+/).map(clean).filter(Boolean).slice(0, 5).join(", ")
    : "practical design, everyday usability and reliable performance";
  const keywordText = data.keywords.slice(0, 4).join(", ");
  return `${brandPart}${subject} is designed for customers who want practical performance and convenient everyday use. Featuring ${featureText}, it is a useful option for ${data.category || "a wide range of everyday needs"}.${data.variant ? ` Available in ${data.variant}.` : ""} ${keywordText ? `Key search terms include ${keywordText}.` : ""} Choose this product when you need a practical combination of features, usability and value.`;
}

function analyze(keywords, title, description) {
  const t = title.toLowerCase(), d = description.toLowerCase();
  return keywords.map(keyword => ({
    keyword,
    count: words(keyword).length,
    title: t.includes(keyword),
    description: d.includes(keyword)
  }));
}

function renderAnalysis(rows) {
  $("keywordTable").innerHTML = rows.length ? rows.map(r => {
    const status = r.title && r.description ? ["Good", "status-good"] :
      r.title || r.description ? ["Partial", "status-warn"] : ["Missing", "status-bad"];
    return `<tr><td>${escapeHtml(r.keyword)}</td><td>${r.count}</td><td>${r.title ? "Yes" : "No"}</td><td>${r.description ? "Yes" : "No"}</td><td class="${status[1]}">${status[0]}</td></tr>`;
  }).join("") : '<tr><td colspan="5" class="muted">Add important keywords to see analysis.</td></tr>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}

function auditListing(text, keywords = []) {
  const cleanText = clean(text);
  if (!cleanText) return { html: '<span class="muted">Paste a listing to analyze it.</span>', plain: "Paste a listing to analyze it." };
  const titleLine = cleanText.split(/[\\n.]/)[0];
  const issues = [];
  if (titleLine.length > 200) issues.push("Title/first line is over 200 characters.");
  if (titleLine.length < 40) issues.push("Title/first line is quite short; consider adding useful attributes.");
  if (!/[.!?]/.test(cleanText)) issues.push("Description has little or no sentence punctuation.");
  if (cleanText.split(/\\s+/).length < 30) issues.push("Listing appears short; add useful product details and customer benefits.");
  const lower = cleanText.toLowerCase();
  const missing = keywords.filter(k => !lower.includes(k));
  if (missing.length) issues.push("Missing keyword coverage: " + missing.slice(0, 8).join(", "));
  const allWords = words(cleanText);
  const freq = {};
  allWords.forEach(w => freq[w] = (freq[w] || 0) + 1);
  const repeated = Object.entries(freq).filter(([w,n]) => n >= 5 && w.length > 3).sort((a,b) => b[1]-a[1]).slice(0, 5);
  if (repeated.length) issues.push("Potentially repetitive terms: " + repeated.map(x => x[0] + " (" + x[1] + "x)").join(", "));
  if (!issues.length) issues.push("No major basic SEO issues detected. Review relevance, accuracy and marketplace policy before publishing.");
  const html = '<ul class="audit-list">' + issues.map(i => '<li>' + escapeHtml(i) + '</li>').join("") + '</ul>';
  return { html, plain: issues.map(i => "• " + i).join("\\n") };
}

function getData() {
  return {
    product: clean($("productName").value),
    brand: clean($("brand").value),
    category: clean($("category").value),
    marketplace: $("marketplace").value,
    material: clean($("material").value),
    variant: clean($("variant").value),
    features: clean($("features").value),
    keywords: splitKeywords($("keywords").value),
    existing: clean($("existingListing").value)
  };
}

function generate() {
  const data = getData();
  if (!data.product && !data.category) {
    alert("Please enter at least a Product Name or Category.");
    return;
  }
  const title = buildTitle(data);
  const description = buildDescription(data);
  const bullets = buildBullets(data);
  const keywordText = data.keywords.join(" ");
  $("seoTitle").textContent = title;
  $("titleCount").textContent = `${title.length} / ${LIMITS[data.marketplace]} characters`;
  $("seoDescription").textContent = description;
  $("bulletPoints").innerHTML = bullets.map(x => '<div>' + escapeHtml(x) + '</div>').join("");
  $("searchKeywords").textContent = keywordText || "Add important keywords in the input above.";
  renderAnalysis(analyze(data.keywords, title, description));
  $("results").classList.remove("hidden");

  if (data.existing) {
    const result = auditListing(data.existing, data.keywords);
    $("audit").innerHTML = result.html;
    $("auditCard").classList.remove("hidden");
  } else {
    $("auditCard").classList.add("hidden");
  }
  window.scrollTo({ top: $("results").offsetTop - 15, behavior: "smooth" });
}

function runOptimizer() {
  const data = getData();
  const result = auditListing($("optimizerInput").value, data.keywords);
  $("optimizerResult").innerHTML = result.html;
  $("optimizerResult").dataset.plain = result.plain;
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const old = button.textContent;
    button.textContent = "Copied ✓";
    setTimeout(() => button.textContent = old, 1100);
  } catch {
    alert("Copy failed. Please select and copy the text manually.");
  }
}

function allOutputText() {
  const bullets = [...$("bulletPoints").querySelectorAll("div")].map(x => "• " + x.textContent).join("\n");
  return [
    "SEO TITLE:\n" + $("seoTitle").textContent,
    "SEO DESCRIPTION:\n" + $("seoDescription").textContent,
    "BULLET POINTS:\n" + bullets,
    "SEARCH KEYWORDS:\n" + $("searchKeywords").textContent
  ].join("\n\n");
}

$("generateBtn").addEventListener("click", generate);
$("auditBtn").addEventListener("click", runOptimizer);
$("copyAuditBtn").addEventListener("click", function() {
  const text = $("optimizerResult").dataset.plain || $("optimizerResult").innerText;
  copyText(text, this);
});
$("copyAllBtn").addEventListener("click", function() { copyText(allOutputText(), this); });

document.querySelectorAll(".copy-btn").forEach(btn => {
  btn.addEventListener("click", function() {
    const el = $(this.dataset.copy);
    copyText(el.innerText || el.textContent, this);
  });
});

$("clearBtn").addEventListener("click", () => {
  document.querySelectorAll("input, textarea").forEach(el => el.value = "");
  $("marketplace").value = "Amazon";
  $("results").classList.add("hidden");
  $("auditCard").classList.add("hidden");
  $("optimizerResult").textContent = "Your audit will appear here.";
  $("optimizerResult").className = "audit-box muted";
});

$("productName").addEventListener("keydown", e => { if (e.key === "Enter") generate(); });