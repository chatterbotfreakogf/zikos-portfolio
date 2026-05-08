/* ============================================================
   certs.js — Cert-Drawer (Open/Close, Esc, Focus-Trap-light)
   re-uses the .case-drawer chrome; one drawer per Issuer.
   ============================================================ */

(() => {
  "use strict";

  const drawers = new Map();
  document.querySelectorAll("aside.cert-drawer").forEach(d => {
    drawers.set(d.id, { el: d, lastFocus: null });
  });
  if (!drawers.size) return;

  function open(id) {
    const cfg = drawers.get(id);
    if (!cfg) return;
    cfg.lastFocus = document.activeElement;
    cfg.el.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      cfg.el.querySelector(".case-drawer__close")?.focus();
    });
  }

  function closeAll() {
    let closed = false;
    drawers.forEach(cfg => {
      if (cfg.el.getAttribute("aria-hidden") === "false") {
        cfg.el.setAttribute("aria-hidden", "true");
        cfg.lastFocus?.focus?.();
        closed = true;
      }
    });
    if (closed) document.body.style.overflow = "";
  }

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    const opener = t.closest("[data-cert-open]");
    if (opener) {
      e.preventDefault();
      open(opener.getAttribute("data-cert-open"));
      return;
    }

    if (t.closest("[data-cert-close]")) {
      e.preventDefault();
      closeAll();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const anyOpen = [...drawers.values()].some(cfg => cfg.el.getAttribute("aria-hidden") === "false");
    if (anyOpen) closeAll();
  });
})();
