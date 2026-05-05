/* ============================================================
   auth.js — soft password gate
   - SHA-256 hash compare via Web Crypto (no plaintext shipped)
   - sessionStorage flag used only to remember within tab
   - graceful failure UX with shake + mono error
   ============================================================ */

(() => {
  "use strict";

  /**
   * SHA-256("Portfolio") — precomputed with `printf "Portfolio" | shasum -a 256`.
   * Note: this is a soft gate, not a security boundary. Anyone who can read
   * the source can find this hash and brute-force the password. The site is
   * marked noindex/nofollow and the gate exists to filter casual traffic.
   * Sensitive content must never live behind a client-only gate.
   */
  const EXPECTED =
    "1853eb2e9e5ed2bcc1d03b5a49cf407f2e43851363a8ffd0ce5ab7aa37ca8309";

  const form = document.getElementById("auth");
  if (!form) return;

  const input = form.querySelector("#pw");
  const field = form.querySelector(".field");
  const submit = form.querySelector("button[type=submit]");
  const err = form.querySelector("#err");

  async function sha256Hex(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function showError(msg) {
    err.textContent = msg;
    err.classList.add("is-show");
    field.classList.remove("is-shake");
    // restart animation
    void field.offsetWidth;
    field.classList.add("is-shake");
  }

  function clearError() {
    err.classList.remove("is-show");
    setTimeout(() => { if (!err.classList.contains("is-show")) err.textContent = ""; }, 220);
  }

  input.addEventListener("input", clearError);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) {
      showError("Bitte Passwort eingeben.");
      input.focus();
      return;
    }

    submit.disabled = true;

    try {
      const hex = await sha256Hex(value);
      if (hex === EXPECTED) {
        try { sessionStorage.setItem("zz_portfolio_unlocked", "1"); } catch (_) {}
        document.body.classList.add("is-exiting");
        // give the fade-out 480ms (matches CSS) before navigating
        setTimeout(() => location.assign("portfolio.html"), 500);
      } else {
        submit.disabled = false;
        showError("Passwort ungültig.");
        input.select();
      }
    } catch (ex) {
      submit.disabled = false;
      showError("Fehler bei der Prüfung. Bitte erneut versuchen.");
      // eslint-disable-next-line no-console
      console.error(ex);
    }
  });

  // wenn schon entsperrt: direkt rein
  try {
    if (sessionStorage.getItem("zz_portfolio_unlocked") === "1") {
      location.replace("portfolio.html");
    }
  } catch (_) { /* sessionStorage disabled — Gate bleibt */ }
})();
