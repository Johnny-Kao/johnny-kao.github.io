/**
 * Flight Archive — Login modal + Sync button
 */
(() => {
  const backdrop = document.getElementById("login-modal");
  const openBtn  = document.getElementById("nav-login-btn");
  const syncBtn  = document.getElementById("nav-sync-btn");
  const closeBtn = document.getElementById("modal-close");
  const form     = document.getElementById("login-form");

  if (!backdrop || !openBtn) return;

  // ── Session indicator ───────────────────────────────────────────────────────
  function refreshNavState() {
    const hasSession = Boolean(sessionStorage.getItem("flight_archive_token"));
    openBtn.classList.toggle("is-signed-in", hasSession);
    openBtn.setAttribute("aria-label", hasSession ? "Sign out" : "Sign in");
    if (syncBtn) syncBtn.hidden = !hasSession;
  }
  refreshNavState();

  // ── Modal open / close ──────────────────────────────────────────────────────
  function openModal() {
    backdrop.classList.add("is-open");
    backdrop.removeAttribute("aria-hidden");
    document.body.style.overflow = "hidden";
    clearError();
    setTimeout(() => { document.getElementById("login-username")?.focus(); }, 80);
  }

  function closeModal() {
    backdrop.classList.remove("is-open");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  openBtn.addEventListener("click", () => {
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

  // ── Sync button ─────────────────────────────────────────────────────────────
  syncBtn?.addEventListener("click", async () => {
    const token = sessionStorage.getItem("flight_archive_token");
    const workerUrl = (window.FLIGHT_WORKER_URL || "").replace(/\/$/, "");
    if (!token || !workerUrl) return;

    // Loading state
    syncBtn.classList.add("is-syncing");
    syncBtn.disabled = true;

    try {
      const res = await fetch(`${workerUrl}/api/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // Clear cached data so next load fetches fresh
        window.__FLIGHT_ARCHIVE_DATA__ = null;
        syncBtn.classList.remove("is-syncing");
        syncBtn.classList.add("is-sync-done");
        setTimeout(() => {
          syncBtn.classList.remove("is-sync-done");
          syncBtn.disabled = false;
          location.reload();
        }, 800);
      } else {
        syncBtn.classList.remove("is-syncing");
        syncBtn.disabled = false;
        alert("Sync failed. Please try again.");
      }
    } catch (err) {
      console.error("Sync error:", err);
      syncBtn.classList.remove("is-syncing");
      syncBtn.disabled = false;
      alert("Network error during sync.");
    }
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
    if (!workerUrl) { showError("Worker URL is not configured."); return; }

    const username = document.getElementById("login-username")?.value ?? "";
    const password = document.getElementById("login-password")?.value ?? "";
    if (!username || !password) { showError("Please enter your username and password."); return; }

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
      location.reload();
    } catch (err) {
      console.error("Login error:", err);
      showError("Network error. Check your connection and try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
    }
  });
})();
