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
  const cartCloses = document.querySelectorAll("[data-cart-close]");
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
  cartCloses.forEach(el => el.addEventListener("click", closeCart));

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
        toggleAdvisor(true);
        const input = advisorPanel?.querySelector("input");
        if (input) {
          input.removeAttribute("disabled");
          input.value = "Was hat Zikos bei Decathlon gemacht?";
          input.focus();
          // Cursor ans Ende
          const v = input.value; input.value = ""; input.value = v;
        }
        return;
      }
    });
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
