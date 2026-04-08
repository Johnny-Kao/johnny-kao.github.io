/**
 * Flight Archive — Login modal
 *
 * Handles:
 *   - Opening / closing the modal UI
 *   - Submitting credentials to the Cloudflare Worker
 *   - Storing the returned token in sessionStorage
 *   - Reloading the page so the main scripts can fetch and render the data
 *   - Showing the "signed in" state in the nav button when a session exists
 */
(() => {
  const backdrop = document.getElementById("login-modal");
  const openBtn  = document.getElementById("nav-login-btn");
  const closeBtn = document.getElementById("modal-close");
  const form     = document.getElementById("login-form");

  if (!backdrop || !openBtn) return;

  // ── Session indicator ───────────────────────────────────────────────────────
  // If a token is already in sessionStorage, mark the nav button as "active"
  // so the user can see they are signed in.
  function refreshNavState() {
    const hasSession = Boolean(sessionStorage.getItem("flight_archive_token"));
    openBtn.classList.toggle("is-signed-in", hasSession);
    openBtn.setAttribute("aria-label", hasSession ? "Signed in" : "Sign in");
  }
  refreshNavState();

  // ── Modal open / close ──────────────────────────────────────────────────────
  function openModal() {
    backdrop.classList.add("is-open");
    backdrop.removeAttribute("aria-hidden");
    document.body.style.overflow = "hidden";
    clearError();
    setTimeout(() => {
      document.getElementById("login-username")?.focus();
    }, 80);
  }

  function closeModal() {
    backdrop.classList.remove("is-open");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  openBtn.addEventListener("click", () => {
    // If already signed in, clicking the icon signs out instead.
    if (sessionStorage.getItem("flight_archive_token")) {
      sessionStorage.removeItem("flight_archive_token");
      window.__FLIGHT_ARCHIVE_DATA__ = null;
      refreshNavState();
      location.reload();
      return;
    }
    openModal();
  });

  closeBtn?.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop.classList.contains("is-open")) closeModal();
  });

  // ── Error display ───────────────────────────────────────────────────────────
  function showError(message) {
    let errorEl = form.querySelector(".modal-error");
    if (!errorEl) {
      errorEl = document.createElement("p");
      errorEl.className = "modal-error";
      form.querySelector(".modal-submit").before(errorEl);
    }
    errorEl.textContent = message;
  }

  function clearError() {
    form.querySelector(".modal-error")?.remove();
  }

  // ── Form submission ─────────────────────────────────────────────────────────
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const workerUrl = (window.FLIGHT_WORKER_URL || "").replace(/\/$/, "");
    if (!workerUrl) {
      showError("Worker URL is not configured.");
      return;
    }

    const username = document.getElementById("login-username")?.value ?? "";
    const password = document.getElementById("login-password")?.value ?? "";

    if (!username || !password) {
      showError("Please enter your username and password.");
      return;
    }

    const submitBtn = form.querySelector(".modal-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";
    clearError();

    try {
      const response = await fetch(`${workerUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (response.status === 401) {
        showError("Incorrect username or password.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign In";
        return;
      }

      if (!response.ok) {
        showError(`Server error (${response.status}). Please try again.`);
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign In";
        return;
      }

      const { token } = await response.json();
      sessionStorage.setItem("flight_archive_token", token);

      // Reload so the main boot() sequence fetches and renders the data.
      location.reload();
    } catch (err) {
      console.error("Login error:", err);
      showError("Network error. Check your connection and try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
    }
  });
})();
