// Parses a standalone HTML blog article (the format produced by Claude when
// asked for a self-contained styled blog post) into the fields blog_posts
// needs. Mirrors publish-blog.mjs's extraction logic exactly, but runs in
// the browser (DOMParser) so it can power the admin panel's "Import from
// HTML" button instead of requiring the CLI script.

export type ParsedHtmlBlog = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author_name: string;
  /** Original hero banner markup, for the cover-image generator. */
  heroHtml: string | null;
  /** Concatenated <style> rules from the source document's <head>. */
  heroCss: string;
  /** Stylesheet <link> hrefs (Google Fonts etc.) referenced by the source document. */
  fontHrefs: string[];
};

export function parseHtmlBlog(html: string): ParsedHtmlBlog {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  function textOf(el: Element | null) {
    if (!el) return "";
    const clone = el.cloneNode(true) as Element;
    clone.querySelectorAll("br,p,div,h1,h2,h3,h4").forEach(b => {
      b.textContent = " " + b.textContent + " ";
    });
    return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  // Title
  const heroH1 = doc.querySelector(".hero h1");
  const title = heroH1
    ? textOf(heroH1)
    : (doc.querySelector("title")?.textContent ?? "").split("|")[0].replace(/\s+/g, " ").trim();

  // Author
  const heroMetaText = textOf(doc.querySelector(".hero-meta"));
  const authorMatch = heroMetaText.match(/[✍✏✐]\s*([^,|·\n]+)/);
  const author_name = authorMatch ? authorMatch[1].trim().replace(/MBA.*$/, "").trim() : "Nupur Karn";

  // Excerpt
  const excerpt = textOf(doc.querySelector(".hero-sub")).slice(0, 300);

  // Category
  const eyebrow = textOf(doc.querySelector(".hero-eyebrow"));
  const combined = (eyebrow + " " + heroMetaText).toLowerCase();
  let category = "HRM Basics";
  if (/organizational.behav|org.behav/i.test(combined))  category = "Organisational Behaviour";
  else if (/research.method/i.test(combined))             category = "Research Methodology";
  else if (/ethical.hrm|ethics/i.test(combined))         category = "Ethical HRM";
  else if (/quiet.quitting/i.test(combined))              category = "Quiet Quitting";
  else if (/current.affairs/i.test(combined))             category = "Current Affairs";
  else if (/general.studies/i.test(combined))             category = "General Studies";

  // Slug
  const slug = title
    .toLowerCase()
    .replace(/['''"":]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  // Capture the hero banner's markup + the document's <style> rules (and any
  // Google Fonts stylesheet links) before anything is transformed, so the
  // cover image generator can re-render it pixel-for-pixel exactly as designed.
  const heroHtml = doc.querySelector(".hero")?.outerHTML ?? null;
  const heroCss = [...doc.querySelectorAll("style")].map(s => s.textContent ?? "").join("\n");
  const fontHrefs = [...doc.querySelectorAll('link[rel="stylesheet"]')]
    .map(l => l.getAttribute("href"))
    .filter((h): h is string => !!h);

  // Transform accordions → <details>/<summary>
  doc.querySelectorAll(".acc-item").forEach(item => {
    const trigger = item.querySelector(".acc-trigger");
    const body = item.querySelector(".acc-body");
    if (!trigger || !body) return;
    trigger.querySelector(".acc-arrow")?.remove();
    const details = doc.createElement("details");
    details.className = "acc-item";
    const summary = doc.createElement("summary");
    summary.className = "acc-trigger";
    summary.innerHTML = trigger.innerHTML.trim();
    const bodyDiv = doc.createElement("div");
    bodyDiv.className = "acc-body";
    bodyDiv.innerHTML = body.innerHTML;
    details.appendChild(summary);
    details.appendChild(bodyDiv);
    item.replaceWith(details);
  });

  // Transform lifecycle tabs → stacked <details>
  doc.querySelectorAll(".lifecycle").forEach(lifecycle => {
    const tabs   = [...lifecycle.querySelectorAll(".lc-tab")];
    const panels = [...lifecycle.querySelectorAll(".lc-panel")];
    if (!panels.length) return;
    const newEl = doc.createElement("div");
    newEl.className = "lifecycle";
    panels.forEach((panel, i) => {
      const details = doc.createElement("details");
      details.className = "lc-stage";
      if (i === 0) details.setAttribute("open", "");
      const summary = doc.createElement("summary");
      summary.className = "lc-tab";
      summary.innerHTML = tabs[i] ? tabs[i].innerHTML : `<span class="lc-tab-label">Stage ${i + 1}</span>`;
      const content = doc.createElement("div");
      content.className = "lc-panel";
      content.innerHTML = panel.innerHTML;
      details.appendChild(summary);
      details.appendChild(content);
      newEl.appendChild(details);
    });
    lifecycle.replaceWith(newEl);
  });

  // Strip event handlers
  const eventAttrs = ["onclick","onchange","oninput","onsubmit","onkeyup","onkeydown","onfocus","onblur"];
  doc.querySelectorAll("*").forEach(el => eventAttrs.forEach(a => el.removeAttribute(a)));

  // Build content
  let content = "";
  const heroStats = doc.querySelector(".hero-stats");
  if (heroStats) content += heroStats.outerHTML + "\n";
  const contentEl = doc.querySelector(".content");
  if (contentEl) {
    content += contentEl.innerHTML.trim() + "\n";
  }
  const footerEl = doc.querySelector(".footer");
  if (footerEl) {
    content += `<div class="blog-footer">\n${footerEl.innerHTML.trim()}\n</div>\n`;
  }
  content = content.replace(/<!--[\s\S]*?-->/g, "").replace(/\n{3,}/g, "\n\n").trim();

  return { title, slug, excerpt, content, category, author_name, heroHtml, heroCss, fontHrefs };
}
