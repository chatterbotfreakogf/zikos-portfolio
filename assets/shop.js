/* ============================================================
   shop.js — UI-Logik des Skeletts
   - Cart-Drawer öffnen/schließen (Click + ESC + Scrim)
   - KI-Berater-Bubble Toggle
   - Logout
   - Auth-Guard: ohne Session zurück zum Gate
   ============================================================ */

(() => {
  "use strict";

  /* Auth-Guard ----------------------------------------------------- */
  try {
    if (sessionStorage.getItem("zz_portfolio_unlocked") !== "1") {
      location.replace("index.html");
      return;
    }
  } catch (_) { /* sessionStorage off → Gate bleibt zuständig */ }

  /* Logout --------------------------------------------------------- */
  document.getElementById("logout")?.addEventListener("click", () => {
    try { sessionStorage.removeItem("zz_portfolio_unlocked"); } catch (_) {}
    location.replace("index.html");
  });

  /* Cart-Drawer ---------------------------------------------------- */
  const cart       = document.getElementById("cart");
  const cartOpen   = document.getElementById("cart-open");
  let lastFocus = null;

  function openCart() {
    if (!cart) return;
    lastFocus = document.activeElement;
    cart.setAttribute("aria-hidden", "false");
    cartOpen?.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    // focus first focusable inside drawer
    requestAnimationFrame(() => {
      cart.querySelector(".drawer__close")?.focus();
    });
  }

  function closeCart() {
    if (!cart) return;
    cart.setAttribute("aria-hidden", "true");
    cartOpen?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    lastFocus?.focus?.();
  }

  cartOpen?.addEventListener("click", openCart);
  // Delegation: schliesst auch dynamisch gerenderte Buttons (z. B. "Weiter shoppen")
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-cart-close]")) closeCart();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (cart?.getAttribute("aria-hidden") === "false") closeCart();
      if (advisorPanel && !advisorPanel.hidden) toggleAdvisor(false);
    }
  });

  /* AI Advisor ---------------------------------------------------- */
  const advisorBtns  = document.querySelectorAll("[data-advisor-toggle]");
  const advisorPanel = document.getElementById("advisor-panel");
  const advisorBubble= document.querySelector(".advisor__bubble");

  function toggleAdvisor(force) {
    if (!advisorPanel || !advisorBubble) return;
    const next = typeof force === "boolean" ? force : advisorPanel.hidden;
    advisorPanel.hidden = !next;
    advisorBubble.setAttribute("aria-expanded", next ? "true" : "false");
  }
  advisorBtns.forEach(btn => btn.addEventListener("click", () => toggleAdvisor()));

  /* Universeller Action-Handler für Live-Demo-Tiles ---------------- */
  document.querySelectorAll("[data-action]").forEach(el => {
    el.addEventListener("click", (e) => {
      const action = el.dataset.action;
      if (!action) return;

      if (action === "cart-demo") {
        e.preventDefault();
        window.zzCart?.runSequence();
        return;
      }
      if (action === "advisor-demo") {
        e.preventDefault();
        if (window.ZikosBot) {
          window.ZikosBot.ask("Was hast du bei Decathlon gemacht?");
        } else {
          toggleAdvisor(true);
        }
        return;
      }
    });
  });

  /* Kontakt-Dialog (Mail-Composer, zentral schwebend) -------------- */
  const contactDialog = document.getElementById("contact-dialog");
  const contactForm   = contactDialog?.querySelector("[data-contact-form]");
  const CONTACT_TO    = "zikos.zissis@outlook.com";

  function openContact() {
    if (!contactDialog) return;
    if (typeof contactDialog.showModal === "function") contactDialog.showModal();
    else contactDialog.setAttribute("open", "");
    requestAnimationFrame(() => {
      contactForm?.querySelector("input[name='name']")?.focus();
    });
  }
  function closeContact() {
    if (!contactDialog) return;
    if (typeof contactDialog.close === "function" && contactDialog.open) contactDialog.close();
    else contactDialog.removeAttribute("open");
  }

  document.querySelectorAll("[data-contact-open]").forEach(el => {
    el.addEventListener("click", (e) => { e.preventDefault(); openContact(); });
  });
  contactDialog?.addEventListener("click", (e) => {
    // Klick auf Backdrop (außerhalb der Form) schließt
    if (e.target === contactDialog) closeContact();
  });
  contactDialog?.querySelectorAll("[data-contact-close]").forEach(el => {
    el.addEventListener("click", (e) => { e.preventDefault(); closeContact(); });
  });
  const contactStatus = contactDialog?.querySelector("[data-contact-status]");
  const contactHint   = contactDialog?.querySelector("[data-contact-hint]");
  const contactSubmit = contactDialog?.querySelector("[data-contact-submit]");

  function setContactStatus(kind, text) {
    if (!contactStatus) return;
    if (!kind) {
      contactStatus.hidden = true;
      contactStatus.textContent = "";
      contactStatus.removeAttribute("data-kind");
      if (contactHint) contactHint.hidden = false;
      return;
    }
    contactStatus.hidden = false;
    contactStatus.setAttribute("data-kind", kind);
    contactStatus.textContent = text;
    if (contactHint) contactHint.hidden = true;
  }

  contactForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!contactForm.checkValidity()) { contactForm.reportValidity(); return; }
    if (contactSubmit) contactSubmit.disabled = true;
    setContactStatus("pending", "Sende …");
    const fd = new FormData(contactForm);
    // Aussagekräftiger Subject-Prefix mit Absender-Namen
    const name = (fd.get("name") || "").toString().trim();
    const subj = (fd.get("subject") || "Portfolio-Anfrage").toString().trim();
    fd.set("_subject", `[Portfolio] ${subj}${name ? " — " + name : ""}`);
    try {
      const res = await fetch(contactForm.action, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: fd
      });
      const ok = res.ok;
      let data = null;
      try { data = await res.json(); } catch (_) {}
      if (ok && (!data || data.success === "true" || data.success === true)) {
        setContactStatus("ok", "Danke — angekommen. Antwort folgt.");
        contactForm.reset();
        setTimeout(() => { closeContact(); setContactStatus(null); }, 1800);
      } else {
        const msg = (data && (data.message || data.error)) || "Senden fehlgeschlagen. Versuch's per WhatsApp.";
        setContactStatus("err", msg);
      }
    } catch (_) {
      setContactStatus("err", "Netzwerkfehler. Versuch's per WhatsApp.");
    } finally {
      if (contactSubmit) contactSubmit.disabled = false;
    }
  });

  /* Subtle reveal on scroll for sections ---------------------------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    document.querySelectorAll(".feature, .contact").forEach(el => {
      el.classList.add("reveal");
      io.observe(el);
    });
  }
})();
