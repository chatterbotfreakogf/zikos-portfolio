/* ============================================================
   cart.js — Smart-Cart Store, Render & Demo-Sequenz
   ============================================================ */

(() => {
  "use strict";

  const data = window.zzCartData;
  if (!data) return;

  /* ----------------------------------------------------------------
     STATE
     lines: Map<id, { id, qty, kind: 'item' | 'bundle' }>
     ---------------------------------------------------------------- */
  const state = {
    lines: new Map(),
    lastDisplayedTotal: 0
  };

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------
     PURE HELPERS
     ---------------------------------------------------------------- */
  function eur(n) {
    return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }

  function getBundle(id) {
    return data.bundles.find(b => b.id === id);
  }

  function bundleOriginalPrice(bundle) {
    return bundle.requires.reduce((s, rid) => s + data.items[rid].price, 0);
  }
  function bundlePrice(bundle) {
    return bundleOriginalPrice(bundle) * (1 - bundle.discount);
  }
  function bundleSavings(bundle) {
    return bundleOriginalPrice(bundle) - bundlePrice(bundle);
  }

  function lineUnitPrice(line) {
    if (line.kind === "bundle") return bundlePrice(getBundle(line.id));
    return data.items[line.id].price;
  }

  function subtotal() {
    let s = 0;
    state.lines.forEach(line => { s += lineUnitPrice(line) * line.qty; });
    return s;
  }
  const total = subtotal;

  function shippingProgress() {
    const t = subtotal();
    const goal = data.freeShippingThreshold;
    return { value: Math.min(t, goal), goal, pct: Math.min(100, (t / goal) * 100), reached: t >= goal };
  }

  function hasItem(id) {
    if (state.lines.has(id)) return true;
    for (const line of state.lines.values()) {
      if (line.kind === "bundle") {
        const b = getBundle(line.id);
        if (b?.requires.includes(id)) return true;
      }
    }
    return false;
  }

  /* ----------------------------------------------------------------
     COMMANDS
     ---------------------------------------------------------------- */
  function addItem(id) {
    const item = data.items[id];
    if (!item) return;
    const existing = state.lines.get(id);
    if (existing) existing.qty += 1;
    else state.lines.set(id, { id, qty: 1, kind: "item" });
    render();
  }

  function removeItem(id) {
    state.lines.delete(id);
    render();
  }

  function setQty(id, qty) {
    const line = state.lines.get(id);
    if (!line) return;
    if (line.kind === "bundle") return;
    if (qty < 1) return removeItem(id);
    line.qty = qty;
    render();
  }

  function applyBundle(bundleId) {
    const bundle = getBundle(bundleId);
    if (!bundle) return;
    bundle.requires.forEach(rid => state.lines.delete(rid));
    state.lines.set(bundle.id, { id: bundle.id, qty: 1, kind: "bundle" });
    render();
  }

  function reset() {
    state.lines.clear();
    state.lastDisplayedTotal = 0;
    render();
  }

  /* ----------------------------------------------------------------
     RENDER
     ---------------------------------------------------------------- */
  const root = () => document.getElementById("cart-render");
  const footer = () => document.getElementById("cart-footer");
  const countBadge = () => document.querySelector("[data-cart-count]");

  function glyphSvg(kind) {
    const v = `viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"`;
    if (kind === "sphere") return `<svg ${v}><defs><radialGradient id="g1" cx="35%" cy="32%"><stop offset="0%" stop-color="#E6E9EF"/><stop offset="100%" stop-color="#6E7280"/></radialGradient></defs><circle cx="16" cy="16" r="11" fill="url(#g1)"/></svg>`;
    if (kind === "cube")   return `<svg ${v}><path d="M16 4 4 10v12l12 6 12-6V10L16 4Z" fill="#9097A2"/><path d="M16 4 4 10l12 6 12-6L16 4Z" fill="#B2B8C2"/><path d="M16 16v12l12-6V10l-12 6Z" fill="#7A808B"/></svg>`;
    if (kind === "disc")   return `<svg ${v}><ellipse cx="16" cy="16" rx="12" ry="4" fill="#888E99"/><ellipse cx="16" cy="14" rx="12" ry="4" fill="#A8AEB8"/></svg>`;
    if (kind === "ring")   return `<svg ${v}><circle cx="16" cy="16" r="10" fill="none" stroke="#8A909B" stroke-width="3"/><circle cx="16" cy="16" r="10" fill="none" stroke="#C2C7CF" stroke-width="1" stroke-dasharray="2 6"/></svg>`;
    if (kind === "stack")  return `<svg ${v}><circle cx="11" cy="13" r="6" fill="#9097A2"/><rect x="14" y="11" width="11" height="11" rx="2" fill="#B2B8C2"/><ellipse cx="20" cy="23" rx="9" ry="3" fill="#7A808B"/></svg>`;
    return "";
  }

  function recommendationIds() {
    const out = new Set();
    state.lines.forEach(line => {
      const map = line.kind === "bundle" ? data.bundleCrossSell : data.crossSell;
      (map[line.id] || []).forEach(rid => { if (!hasItem(rid)) out.add(rid); });
    });
    return Array.from(out).slice(0, 1);
  }

  function recommendationWithSource() {
    for (const line of state.lines.values()) {
      const map = line.kind === "bundle" ? data.bundleCrossSell : data.crossSell;
      const sourceName = line.kind === "bundle"
        ? `Bundle ${getBundle(line.id).name}`
        : data.items[line.id].name;
      for (const rid of (map[line.id] || [])) {
        if (!hasItem(rid)) return { recId: rid, sourceName };
      }
    }
    return null;
  }

  function bundleSuggestion() {
    for (const bundle of data.bundles) {
      if (state.lines.has(bundle.id)) continue;
      const present = bundle.requires.filter(id => state.lines.has(id));
      const missing = bundle.requires.filter(id => !state.lines.has(id));
      if (present.length >= 2 && missing.length >= 1) {
        return { bundle, missing: missing[0] };
      }
    }
    return null;
  }

  function itemLineHtml(line) {
    const item = data.items[line.id];
    const lineTotal = item.price * line.qty;
    return `
      <li class="line" data-line="${item.id}" data-kind="item">
        <span class="line__thumb" aria-hidden="true">${glyphSvg(item.glyph)}</span>
        <div class="line__main">
          <div class="line__row">
            <span class="line__title">${item.name}</span>
            <span class="line__price mono">${eur(lineTotal)}</span>
          </div>
          <div class="line__row line__row--meta">
            <span class="line__meta mono mono--dim">${item.meta}</span>
            <span class="line__qty" role="group" aria-label="Menge">
              <button type="button" class="qty__btn" data-qty="dec" aria-label="Menge verringern">−</button>
              <span class="qty__val mono">${line.qty}</span>
              <button type="button" class="qty__btn" data-qty="inc" aria-label="Menge erhöhen">+</button>
            </span>
            <button type="button" class="line__remove" data-remove aria-label="Entfernen">✕</button>
          </div>
        </div>
      </li>`;
  }

  function bundleLineHtml(line) {
    const bundle = getBundle(line.id);
    const orig = bundleOriginalPrice(bundle);
    const cur = bundlePrice(bundle);
    const saved = bundleSavings(bundle);
    return `
      <li class="line line--bundle" data-line="${bundle.id}" data-kind="bundle">
        <span class="line__thumb line__thumb--bundle" aria-hidden="true">${glyphSvg(bundle.glyph)}</span>
        <div class="line__main">
          <div class="line__row">
            <span class="line__title">
              <span class="line__tag mono">Bundle</span>
              ${bundle.name}
            </span>
            <span class="line__price-stack">
              <span class="line__price mono">${eur(cur)}</span>
              <span class="line__price-strike mono">${eur(orig)}</span>
            </span>
          </div>
          <div class="line__row line__row--meta">
            <span class="line__meta mono">
              <span class="mono--dim">${bundle.requires.length} Artikel</span>
              <span class="line__sep mono--dim"> · </span>
              <span class="line__discount">${eur(saved)} gespart</span>
            </span>
            <button type="button" class="line__remove" data-remove aria-label="Bundle entfernen">✕</button>
          </div>
        </div>
      </li>`;
  }

  function lineHtml(line) {
    return line.kind === "bundle" ? bundleLineHtml(line) : itemLineHtml(line);
  }

  function bundleCardHtml() {
    const sug = bundleSuggestion();
    if (!sug) return "";
    const missing = data.items[sug.missing];
    const pct = Math.round(sug.bundle.discount * 100);
    return `
      <div class="bundle bundle--offer" data-bundle-offer>
        <div class="bundle__text">
          <span class="bundle__title">Im Bundle &laquo;${sug.bundle.name}&raquo; verfügbar</span>
          <span class="bundle__sub mono">
            <span class="mono--dim">Mit ${missing.name}</span>
            <span class="mono--dim"> · </span>
            <span class="bundle__discount">−${pct} % auf das Set</span>
          </span>
        </div>
        <button type="button" class="bundle__cta" data-bundle-add="${sug.bundle.id}">
          Bundle hinzufügen
        </button>
      </div>`;
  }

  function cartHasBundle() {
    for (const line of state.lines.values()) if (line.kind === "bundle") return true;
    return false;
  }

  function continueShoppingHtml() {
    return `
      <button type="button" class="continue" data-cart-close aria-label="Weiter shoppen">
        <span class="continue__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M14 7l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span class="continue__text">
          <span class="continue__title">Weiter shoppen</span>
          <span class="continue__sub mono mono--dim">Zurück zu den Werken</span>
        </span>
      </button>`;
  }

  function crossSellHtml() {
    const rec = recommendationWithSource();
    if (!rec) return "";
    const item = data.items[rec.recId];
    return `
      <section class="xsell" aria-label="Empfehlung">
        <h3 class="xsell__title mono">Häufig dazu gekauft</h3>
        <div class="xsell__row">
          <span class="xsell__thumb" aria-hidden="true">${glyphSvg(item.glyph)}</span>
          <div class="xsell__text">
            <span class="xsell__name">${item.name}</span>
            <span class="xsell__meta mono mono--dim">Ergänzt ${rec.sourceName} &middot; ${eur(item.price)}</span>
          </div>
          <button type="button" class="xsell__add" data-xsell-add="${item.id}" aria-label="${item.name} in den Warenkorb">
            <span class="xsell__add-icon" aria-hidden="true">+</span>
            <span class="xsell__add-label">Hinzufügen</span>
          </button>
        </div>
      </section>`;
  }

  function recommendationsBlockHtml() {
    return cartHasBundle() ? continueShoppingHtml() : crossSellHtml();
  }

  function emptyHtml() {
    return `
      <div class="cart-empty">
        <p class="cart-empty__title">Korb ist leer</p>
        <p class="cart-empty__hint mono mono--dim">Klick auf <em>Smart-Cart-Drawer</em> startet die Demo.</p>
      </div>`;
  }

  function thresholdHtml() {
    const sp = shippingProgress();
    const remaining = Math.max(0, sp.goal - sp.value);
    const label = sp.reached ? "Versand frei" : `Noch ${eur(remaining)} bis Versand frei`;
    return `
      <div class="thresh ${sp.reached ? "is-reached" : ""}" data-thresh>
        <div class="thresh__track" aria-hidden="true">
          <div class="thresh__fill" style="width:${sp.pct}%"></div>
        </div>
        <span class="thresh__label mono">${label}</span>
      </div>`;
  }

  function renderBody() {
    const el = root();
    if (!el) return;
    if (state.lines.size === 0) { el.innerHTML = emptyHtml(); return; }
    const lines = Array.from(state.lines.values()).map(lineHtml).join("");
    el.innerHTML = `
      ${thresholdHtml()}
      <ul class="lines" role="list">${lines}</ul>
      ${bundleCardHtml()}
      ${recommendationsBlockHtml()}
    `;
  }

  function renderFooter() {
    const el = footer();
    if (!el) return;
    const tot = total();
    const hasItems = state.lines.size > 0;
    el.innerHTML = `
      <div class="totals" ${hasItems ? "" : "hidden"}>
        <div class="totals__row totals__row--total">
          <span>Gesamt</span>
          <span class="mono" data-total>${eur(tot)}</span>
        </div>
      </div>
      <div class="cart-actions">
        <button class="btn btn--ghost btn--block" type="button" ${hasItems ? "" : "disabled"}>Express-Kauf</button>
        <button class="btn btn--primary btn--block" type="button" ${hasItems ? "" : "disabled"}>Zur Kasse</button>
      </div>
      <button class="cart-replay mono mono--dim" type="button" data-cart-replay>↻ Sequenz wiederholen</button>
    `;
    countAnimateTotal(tot);
  }

  function render() {
    renderBody();
    renderFooter();
    updateCount();
    reapplyTutorial();
  }

  function updateCount() {
    const badge = countBadge();
    if (!badge) return;
    let count = 0;
    state.lines.forEach(l => count += l.qty);
    badge.textContent = String(count);
    const btn = document.getElementById("cart-open");
    if (!btn) return;
    btn.setAttribute("aria-label", `Warenkorb öffnen, ${count} Artikel`);
    btn.setAttribute("data-pulse", "1");
    setTimeout(() => btn.removeAttribute("data-pulse"), 320);
  }

  function countAnimateTotal(target) {
    const el = document.querySelector("[data-total]");
    if (!el) { state.lastDisplayedTotal = target; return; }
    const from = state.lastDisplayedTotal;
    const dur = reducedMotion ? 0 : 520;
    if (dur === 0 || Math.abs(target - from) < 0.005) {
      el.textContent = eur(target);
      state.lastDisplayedTotal = target;
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = eur(from + (target - from) * ease);
      if (t < 1) requestAnimationFrame(step);
      else state.lastDisplayedTotal = target;
    };
    requestAnimationFrame(step);
  }

  /* ----------------------------------------------------------------
     EVENT DELEGATION
     ---------------------------------------------------------------- */
  function bind() {
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      const replay = target.closest("[data-cart-replay]");
      if (replay) { e.preventDefault(); startTutorial(); return; }

      const closeEl = target.closest("[data-cart-close]");
      if (closeEl) { endTutorial(); return; /* shop.js handles close */ }

      const lineEl = target.closest("[data-line]");
      const id = lineEl?.getAttribute("data-line");

      const qtyBtn = target.closest("[data-qty]");
      if (qtyBtn && id) {
        const line = state.lines.get(id);
        if (!line) return;
        setQty(id, line.qty + (qtyBtn.getAttribute("data-qty") === "inc" ? 1 : -1));
        return;
      }
      const removeBtn = target.closest("[data-remove]");
      if (removeBtn && id) { removeItem(id); return; }

      const xsellBtn = target.closest("[data-xsell-add]");
      if (xsellBtn) { addItem(xsellBtn.getAttribute("data-xsell-add")); return; }

      const bundleBtn = target.closest("[data-bundle-add]");
      if (bundleBtn) {
        applyBundle(bundleBtn.getAttribute("data-bundle-add"));
        const card = document.querySelector(".line--bundle");
        pulse(card);
        const thresh = document.querySelector("[data-thresh]");
        if (thresh && shippingProgress().reached) pulse(thresh);
        return;
      }
    });
  }

  function pulse(el) {
    if (!el || reducedMotion) return;
    el.setAttribute("data-pulse", "1");
    setTimeout(() => el.removeAttribute("data-pulse"), 1000);
  }

  /* ----------------------------------------------------------------
     GHOST CURSOR
     ---------------------------------------------------------------- */
  let ghostEl = null;
  function ghost() {
    if (ghostEl) return ghostEl;
    ghostEl = document.createElement("div");
    ghostEl.className = "ghost-cursor";
    ghostEl.setAttribute("aria-hidden", "true");
    ghostEl.innerHTML = `<span class="ghost-cursor__ring" aria-hidden="true"></span><svg class="ghost-cursor__pointer" viewBox="0 0 16 16" width="18" height="18"><path d="M2 1.5 13.2 8 8 9 6.5 14.5 2 1.5Z" fill="#0F1015" stroke="#FFFFFF" stroke-width="0.8" stroke-linejoin="round"/></svg>`;
    document.body.appendChild(ghostEl);
    return ghostEl;
  }
  function ghostMoveTo(targetEl) {
    if (reducedMotion || !targetEl) { ghostHide(); return; }
    const r = targetEl.getBoundingClientRect();
    const x = r.left + r.width * 0.62;
    const y = r.top + r.height * 0.58;
    const g = ghost();
    g.style.opacity = "1";
    g.style.transform = `translate(${x}px, ${y}px)`;
    g.setAttribute("data-mode", "point");
  }
  function ghostHide() {
    if (!ghostEl) return;
    ghostEl.style.opacity = "0";
    ghostEl.removeAttribute("data-mode");
  }

  /* ----------------------------------------------------------------
     TUTORIAL — Ghost + Sprechblase, User klickt selbst
     ---------------------------------------------------------------- */
  const tutorial = { active: false, state: 0 };

  function setSeqHint(text) {
    const hint = document.getElementById("cart-seq-hint");
    if (!hint) return;
    hint.textContent = text;
    hint.style.opacity = text ? "1" : "0";
  }

  function setBubble(content) {
    const b = document.getElementById("cart-bubble");
    if (!b) return;
    if (!content) {
      b.removeAttribute("data-show");
      setTimeout(() => { if (!b.hasAttribute("data-show")) b.hidden = true; }, 320);
      return;
    }
    b.querySelector(".cart-bubble__step").textContent = content.step;
    b.querySelector(".cart-bubble__title").textContent = content.title;
    b.querySelector(".cart-bubble__text").textContent = content.text;
    b.hidden = false;
    if (content.targetSel) {
      const t = document.querySelector(content.targetSel);
      if (t) {
        const r = t.getBoundingClientRect();
        const top = Math.max(96, Math.min(window.innerHeight - 220, r.top + r.height / 2 - 70));
        b.style.top = top + "px";
      }
    } else {
      b.style.top = "140px";
    }
    requestAnimationFrame(() => b.setAttribute("data-show", "1"));
  }

  function setTarget(sel) {
    document.querySelectorAll("[data-tutorial-target]").forEach(el => el.removeAttribute("data-tutorial-target"));
    if (!sel) { ghostHide(); return; }
    const el = document.querySelector(sel);
    if (!el) { ghostHide(); return; }
    el.setAttribute("data-tutorial-target", "1");
    ghostMoveTo(el);
  }

  function startTutorial() {
    reset();
    addItem("basis");
    openDrawer();
    tutorial.active = true;
    tutorial.state = 0;
    setSeqHint("Demo · klick zum Fortfahren");
    reapplyTutorial();
  }

  function endTutorial() {
    tutorial.active = false;
    setBubble(null);
    setTarget(null);
    setSeqHint("");
  }

  function reapplyTutorial() {
    if (!tutorial.active) return;
    const hasBundle = cartHasBundle();
    const hasBasis = state.lines.has("basis");
    const hasZubehoer = state.lines.has("zubehoer");

    if (hasBundle) {
      tutorial.state = 2;
      setBubble({
        step: "03 · Aktiv",
        title: "Bundle eingelöst · Versand frei",
        text: "Drei Items zu einer SKU verschmolzen, 15 % Rabatt automatisch verrechnet, Versandgrenze überschritten. Bühne gehört dir."
      });
      setTarget(null);
      return;
    }
    if (hasBasis && hasZubehoer) {
      tutorial.state = 1;
      setBubble({
        step: "02 · Bundle-Trigger",
        title: "Zwei von drei erkannt",
        text: "Die Bundle-Logik scannt den Korb laufend. Klick aktiviert das Set: Einzel-Lines werden durch eine Bundle-SKU ersetzt, Rabatt fließt mit.",
        targetSel: "[data-bundle-add='starter']"
      });
      setTarget("[data-bundle-add='starter']");
      return;
    }
    if (hasBasis) {
      tutorial.state = 0;
      setBubble({
        step: "01 · Cross-Sell",
        title: "Komplementäres Item",
        text: "Die Empfehlung wird auf Basis des Korbinhalts dynamisch gefiltert. Klick fügt Item · Zubehör hinzu — wie bei Schuh + Putzmittel.",
        targetSel: "[data-xsell-add='zubehoer']"
      });
      setTarget("[data-xsell-add='zubehoer']");
      return;
    }
    endTutorial();
  }

  /* ----------------------------------------------------------------
     DRAWER OPEN
     ---------------------------------------------------------------- */
  function openDrawer() {
    const cart = document.getElementById("cart");
    const cartOpen = document.getElementById("cart-open");
    if (!cart) return;
    cart.setAttribute("aria-hidden", "false");
    cartOpen?.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  /* ----------------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------------- */
  window.zzCart = {
    addItem, removeItem, setQty, applyBundle, reset,
    runSequence: startTutorial,
    startTutorial,
    set(n) {
      const badge = countBadge();
      if (badge) badge.textContent = String(n);
    }
  };

  /* ----------------------------------------------------------------
     INIT
     ---------------------------------------------------------------- */
  function init() {
    bind();
    render();
    window.addEventListener("resize", () => { if (tutorial.active) reapplyTutorial(); });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
