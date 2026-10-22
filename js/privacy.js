(() => {
  function openPrivacyModal() {
    const overlay = document.getElementById("privacy-overlay");
    if (!overlay) return;
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    loadPrivacyContent();
  }

  function closePrivacyModal() {
    const overlay = document.getElementById("privacy-overlay");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function loadPrivacyContent() {
    const container = document.getElementById("privacy-modal-content");
    if (!container || container.dataset.loaded) return;

    fetch("/data/privacy.json")
      .then((response) => response.json())
      .then((data) => {
        let html = "";
        html += '<div class="privacy-modal-eyebrow">';
        html += '<span class="privacy-modal-eyebrow-rule"></span>';
        html += '<span class="privacy-modal-eyebrow-text">Site Information</span>';
        html += "</div>";
        html += `<h2>${data.title}</h2>`;
        html += `<p class="privacy-modal-date">Last updated: ${data.updated}</p>`;
        html += `<div class="privacy-modal-section"><p>${data.intro}</p></div>`;
        html += '<div class="thin-rule"></div>';

        data.sections.forEach((section) => {
          html += '<div class="privacy-modal-section">';
          html += `<p class="privacy-modal-section-label">${section.label}</p>`;
          html += `<h3>${section.heading}</h3>`;
          section.content.forEach((block) => {
            if (typeof block === "string") {
              html += `<p>${block}</p>`;
            } else if (block.type === "list") {
              html += "<ul>";
              block.items.forEach((item) => { html += `<li>${item}</li>`; });
              html += "</ul>";
            }
          });
          html += "</div>";
        });

        html += '<div class="thin-rule"></div>';
        html += `<p class="privacy-modal-footnote">${data.footnote}</p>`;
        container.innerHTML = html;
        container.dataset.loaded = "true";

        const email = document.getElementById("privacy-modal-email");
        if (email) email.textContent = ["johnnykao", "biz"].join(".") + "@gmail.com";
      })
      .catch((error) => console.error("Privacy content load failed:", error));
  }

  document.getElementById("privacy-modal-close-btn")?.addEventListener("click", closePrivacyModal);
  document.getElementById("privacy-overlay")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closePrivacyModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePrivacyModal();
  });
  document.querySelectorAll("[data-privacy-trigger]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      openPrivacyModal();
    });
  });
})();
