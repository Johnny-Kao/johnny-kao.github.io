// Contact link setup is kept separate from the page markup.
(() => {
  const user = ["johnnykao", "biz"].join(".");
  const domain = ["gmail", "com"].join(".");
  const address = `${user}@${domain}`;

  for (const element of [
    document.getElementById("contact-link"),
    document.getElementById("nav-contact-link"),
  ]) {
    if (!element) continue;
    element.href = `mailto:${address}`;
    element.setAttribute("aria-label", "Email Johnny Kao");
  }
})();
