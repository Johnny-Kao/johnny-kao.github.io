(() => {
  window.clarity = window.clarity || function(...args) {
    (window.clarity.q = window.clarity.q || []).push(args);
  };
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.clarity.ms/tag/qup1qiv7ys";
  document.head.appendChild(script);
})();
