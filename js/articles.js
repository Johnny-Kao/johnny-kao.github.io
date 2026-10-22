// Static-first article rendering with a validated JSON fallback.
(() => {
  const articleList = document.getElementById("article-list");
  if (!articleList) return;

  if (articleList.querySelector(".writing-item")) {
    console.info("[Articles] Using static HTML content.");
    return;
  }

  function formatArticleDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || "";
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  function truncateText(value, maxLength) {
    const text = (value || "").trim();
    if (!text || text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}…`;
  }

  function isAllowedArticleUrl(value) {
    if (typeof value !== "string" || value.length === 0 || value.length > 2048) return false;
    try {
      const url = new URL(value);
      return url.protocol === "https:" &&
        !url.username && !url.password && !url.port &&
        (url.hostname === "johnnykao.substack.com" || url.hostname === "www.linkedin.com");
    } catch {
      return false;
    }
  }

  function buildArticleMarkup(article, index) {
    const link = document.createElement("a");
    link.href = article.url;
    link.className = "writing-item";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.reveal = "";
    link.dataset.delay = String(index + 1);

    const date = document.createElement("span");
    date.className = "writing-date";
    date.textContent = article.date;
    link.appendChild(date);

    const content = document.createElement("div");
    content.className = "writing-item-content";
    const title = document.createElement("h3");
    title.className = "writing-title";
    title.textContent = article.title;
    const excerpt = document.createElement("div");
    excerpt.className = "writing-excerpt";
    excerpt.appendChild(document.createTextNode(article.summary));
    const readMore = document.createElement("span");
    readMore.className = "writing-readmore";
    readMore.appendChild(document.createTextNode("Read more"));
    const mark = document.createElement("span");
    mark.className = "external-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "↗︎";
    readMore.appendChild(mark);
    excerpt.appendChild(readMore);
    content.appendChild(title);
    content.appendChild(excerpt);
    link.appendChild(content);
    return link;
  }

  function renderArticles(articles) {
    if (!articles.length) return;
    articleList.replaceChildren(...articles.map(buildArticleMarkup));
    articleList.querySelectorAll("[data-reveal]").forEach((item) => item.classList.add("is-visible"));
  }

  function normalizeJsonArticles(items, limit = 5) {
    return (Array.isArray(items) ? items : []).slice(0, limit).map((item) => ({
      date: formatArticleDate(item.date),
      title: item.title || "",
      summary: truncateText(item.summary || "", 280),
      url: item.url || "",
    })).filter((article) => article.title && isAllowedArticleUrl(article.url));
  }

  async function loadFeed(url, label) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${label} request failed`);
    const articles = normalizeJsonArticles(await response.json());
    if (!articles.length) throw new Error(`No ${label} articles found`);
    console.info(`[Articles] Rendered from ${label} fallback.`);
    renderArticles(articles);
  }

  loadFeed("https://johnnykao.com/data/substack.json", "substack.json")
    .catch(() => loadFeed("https://johnnykao.com/data/article.json", "article.json"))
    .catch((error) => console.error("Article feed fallback failed:", error));
})();
