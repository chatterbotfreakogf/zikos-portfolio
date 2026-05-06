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
     view : 'customer' | 'admin'
     ---------------------------------------------------------------- */
  const state = {
    lines: new Map(),
    lastDisplayedTotal: 0,
    view: "customer"
  };

  const ADMIN_STORAGE_KEY = "zz-portfolio-recs-v1";
  const ADMIN_PRODUCT_IDS = ["basis", "zubehoer", "premium"];

  const adminState = {
    recommendations: [],
    initial: "",
    pickerForRecIdx: null,
    dirty: false
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

  // Bundle-Anwendung: pro Klick genau 1 Einheit jedes Required-Items konsumieren.
  // Mehrfachauswahl bleibt damit erhalten (Basis ×3 → Bundle ×1 + Basis ×2).
  // Bundle-Line ist stapelbar: existierte sie schon, wird qty inkrementiert.
  function applyBundle(bundleId) {
    const bundle = getBundle(bundleId);
    if (!bundle) return;
    for (const rid of bundle.requires) {
      const line = state.lines.get(rid);
      if (!line) continue;
      if (line.qty > 1) line.qty -= 1;
      else state.lines.delete(rid);
    }
    const existing = state.lines.get(bundle.id);
    if (existing) existing.qty += 1;
    else state.lines.set(bundle.id, { id: bundle.id, qty: 1, kind: "bundle" });
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

  // Bundle-Vorschlag: feuert, sobald 2 von 3 Required-Items als Standalone-Lines
  // im Korb liegen — auch wenn schon ein Bundle vorhanden ist (rekursiv stapelbar).
  function bundleSuggestion() {
    for (const bundle of data.bundles) {
      const present = bundle.requires.filter(id => state.lines.has(id));
      const missing = bundle.requires.filter(id => !state.lines.has(id));
      if (present.length >= 2 && missing.length >= 1) {
        return { bundle, missing: missing[0] };
      }
    }
    return null;
  }

  function pad2(n) { return String(n).padStart(2, "0"); }

  function itemLineHtml(line, idx) {
    const item = data.items[line.id];
    const lineTotal = item.price * line.qty;
    return `
      <li class="line" data-line="${item.id}" data-kind="item">
        <span class="line__index mono">${pad2(idx)}</span>
        <span class="line__thumb" aria-hidden="true">${glyphSvg(item.glyph)}</span>
        <div class="line__main">
          <div class="line__row">
            <span class="line__title">${item.name}</span>
            <span class="line__price">${eur(lineTotal)}</span>
          </div>
          <div class="line__row line__row--meta">
            <span class="line__meta mono">${item.meta}</span>
            <span class="line__qty" role="group" aria-label="Menge">
              <button type="button" class="qty__btn" data-qty="dec" aria-label="Menge verringern">−</button>
              <span class="qty__val">${line.qty}</span>
              <button type="button" class="qty__btn" data-qty="inc" aria-label="Menge erhöhen">+</button>
            </span>
            <button type="button" class="line__remove" data-remove aria-label="Entfernen">✕</button>
          </div>
        </div>
      </li>`;
  }

  function bundleLineHtml(line, idx) {
    const bundle = getBundle(line.id);
    const qty = line.qty;
    const orig = bundleOriginalPrice(bundle) * qty;
    const cur = bundlePrice(bundle) * qty;
    const saved = bundleSavings(bundle) * qty;
    const setLabel = qty > 1 ? `${qty} Sets · ${bundle.requires.length * qty} Artikel` : `${bundle.requires.length} Artikel`;
    return `
      <li class="line line--bundle" data-line="${bundle.id}" data-kind="bundle">
        <span class="line__index mono">${pad2(idx)}</span>
        <span class="line__thumb line__thumb--bundle" aria-hidden="true">${glyphSvg(bundle.glyph)}</span>
        <div class="line__main">
          <div class="line__row">
            <span class="line__title">
              <span class="line__tag">Bundle</span>
              <span class="line__title-text">${bundle.name}</span>
              ${qty > 1 ? `<span class="line__qty-pill mono">×${qty}</span>` : ""}
            </span>
            <span class="line__price-stack">
              <span class="line__price">${eur(cur)}</span>
              <span class="line__price-strike">${eur(orig)}</span>
            </span>
          </div>
          <div class="line__row line__row--meta">
            <span class="line__meta mono">
              <span>${setLabel}</span>
              <span class="line__sep"> · </span>
              <span class="line__discount">${eur(saved)} gespart</span>
            </span>
            <button type="button" class="line__remove" data-remove aria-label="Bundle entfernen">✕</button>
          </div>
        </div>
      </li>`;
  }

  function lineHtml(line, idx) {
    return line.kind === "bundle" ? bundleLineHtml(line, idx) : itemLineHtml(line, idx);
  }

  function bundleCardHtml() {
    const sug = bundleSuggestion();
    if (!sug) return "";
    const missing = data.items[sug.missing];
    const pct = Math.round(sug.bundle.discount * 100);
    return `
      <div class="bundle bundle--offer" data-bundle-offer>
        <span class="bundle__eyebrow mono">Bundle-Vorschlag</span>
        <div class="bundle__main">
          <div class="bundle__text">
            <span class="bundle__title">${sug.bundle.name}</span>
            <span class="bundle__sub mono">+ ${missing.name}</span>
          </div>
          <span class="bundle__stamp" aria-hidden="true">−${pct}<span class="bundle__stamp-pct">%</span></span>
        </div>
        <button type="button" class="bundle__cta" data-bundle-add="${sug.bundle.id}">
          <span>Bundle aktivieren</span>
          <span class="bundle__cta-arrow" aria-hidden="true">→</span>
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
        <span class="continue__arrow" aria-hidden="true">←</span>
        <span class="continue__text">
          <span class="continue__title">Weiter shoppen</span>
          <span class="continue__sub mono">Zurück zum Portfolio</span>
        </span>
      </button>`;
  }

  function crossSellHtml() {
    const rec = recommendationWithSource();
    if (!rec) return "";
    const item = data.items[rec.recId];
    return `
      <section class="xsell" aria-label="Empfehlung">
        <h3 class="xsell__title mono">Passt dazu</h3>
        <div class="xsell__row">
          <span class="xsell__thumb" aria-hidden="true">${glyphSvg(item.glyph)}</span>
          <div class="xsell__text">
            <span class="xsell__name">${item.name}</span>
            <span class="xsell__meta mono">Ergänzt ${rec.sourceName} · ${eur(item.price)}</span>
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
        <span class="cart-empty__eyebrow mono">Leer</span>
        <p class="cart-empty__title">Noch nichts im Korb.</p>
        <p class="cart-empty__hint mono">Tile <em>Smart-Cart-Drawer</em> startet die Demo.</p>
      </div>`;
  }

  function thresholdHtml() {
    const sp = shippingProgress();
    const remaining = Math.max(0, sp.goal - sp.value);
    const left = sp.reached ? "Versand frei" : "Versand";
    const right = sp.reached ? `${eur(sp.goal)}` : `Noch ${eur(remaining)}`;
    return `
      <div class="thresh ${sp.reached ? "is-reached" : ""}" data-thresh>
        <div class="thresh__label mono">
          <span class="thresh__label-key">${left}</span>
          <span class="thresh__label-val">${right}</span>
        </div>
        <div class="thresh__track" aria-hidden="true">
          <div class="thresh__fill" style="width:${sp.pct}%"></div>
        </div>
      </div>`;
  }

  function renderBody() {
    const el = root();
    if (!el) return;
    if (state.lines.size === 0) { el.innerHTML = emptyHtml(); return; }
    const lines = Array.from(state.lines.values()).map((line, i) => lineHtml(line, i + 1)).join("");
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
          <span class="totals__key mono">Gesamt</span>
          <span class="totals__val" data-total>${eur(tot)}</span>
        </div>
      </div>
      <div class="cart-actions">
        <button class="cta cta--primary" type="button" ${hasItems ? "" : "disabled"}>
          <span>Zur Kasse</span>
          <span class="cta__arrow" aria-hidden="true">→</span>
        </button>
        <button class="cta cta--ghost" type="button" ${hasItems ? "" : "disabled"}>
          <span>Express-Kauf</span>
        </button>
      </div>
      <button class="cart-replay mono" type="button" data-cart-replay>↻ Sequenz wiederholen</button>
    `;
    countAnimateTotal(tot);
  }

  // Garantiert: in Customer-View ist der Cart nie leer. Wäre er leer
  // (Erstöffnung, letztes Item entfernt, Admin-Sync, Demo-Replay), wird er
  // auf den Anfangszustand zurückgesetzt: 1× Basis + Tutorial-Bubble „01".
  function ensureNonEmpty() {
    if (state.view !== "customer") return;
    if (state.lines.size > 0) return;
    state.lines.set("basis", { id: "basis", qty: 1, kind: "item" });
    tutorial.active = true;
    tutorial.state = 0;
    setSeqHint("Demo · klick zum Fortfahren");
  }

  function render() {
    ensureNonEmpty();
    updateCount();
    if (state.view === "admin") return;
    renderBody();
    renderFooter();
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

      /* ---- View toggle (Kunde / Admin) ---- */
      const viewBtn = target.closest("[data-view-switch]");
      if (viewBtn) { setView(viewBtn.getAttribute("data-view-switch")); return; }

      /* ---- Admin: Modal/Picker ---- */
      const pickCancel = target.closest("[data-pick-cancel]");
      if (pickCancel) { closePicker(); return; }

      const pickAdd = target.closest("[data-pick-add]");
      if (pickAdd) { pickProduct(pickAdd.getAttribute("data-pick-add")); return; }

      const pickOpen = target.closest("[data-pick-open]");
      if (pickOpen) {
        const recEl = pickOpen.closest("[data-rec]");
        if (recEl) openPicker(Number(recEl.getAttribute("data-rec")));
        return;
      }

      /* ---- Admin: Mutationen (alle Auto-Save) ---- */
      const remProd = target.closest("[data-rem-product]");
      if (remProd) {
        const [iStr, handle] = remProd.getAttribute("data-rem-product").split("|");
        const i = Number(iStr);
        const rec = adminState.recommendations[i];
        if (rec) {
          rec.products = rec.products.filter(h => h !== handle);
          adminCommit();
          renderAdmin();
        }
        return;
      }

      const recDel = target.closest("[data-rec-del]");
      if (recDel) {
        const recEl = recDel.closest("[data-rec]");
        if (!recEl) return;
        const i = Number(recEl.getAttribute("data-rec"));
        const rec = adminState.recommendations[i];
        if (!rec) return;
        if (confirm(`Empfehlung "${rec.name || "ohne Namen"}" löschen?`)) {
          adminState.recommendations.splice(i, 1);
          adminCommit();
          renderAdmin();
        }
        return;
      }

      const recNew = target.closest("[data-rec-new]");
      if (recNew) {
        adminState.recommendations.push({
          id: newRecId(),
          name: "Neue Empfehlung",
          products: [],
          is_bundle: false,
          discount: 10
        });
        adminCommit();
        renderAdmin();
        const list = document.querySelector(".adm-list");
        const last = list?.lastElementChild?.querySelector("[data-rec-name]");
        last?.focus();
        last?.select?.();
        return;
      }

      /* ---- Customer: bestehende Logik ---- */
      const replay = target.closest("[data-cart-replay]");
      if (replay) { e.preventDefault(); startTutorial(); return; }

      const closeEl = target.closest("[data-cart-close]");
      if (closeEl) { endTutorial(); closePicker(); return; /* shop.js handles close */ }

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

    /* Admin input — Auto-Save: state + persist + Footer-Flash, ohne Re-Render (Cursor bleibt) */
    document.addEventListener("input", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const recEl = t.closest("[data-rec]");
      if (!recEl) return;
      const idx = Number(recEl.getAttribute("data-rec"));
      const rec = adminState.recommendations[idx];
      if (!rec) return;
      if (t.matches("[data-rec-name]")) {
        rec.name = t.value;
        adminCommit();
      } else if (t.matches("[data-rec-discount]")) {
        const v = parseInt(t.value, 10);
        if (Number.isFinite(v)) rec.discount = clamp(v, 1, 50, rec.discount);
        adminCommit();
        const info = recEl.querySelector(".adm-rec__info");
        if (info && rec.is_bundle && rec.products.length >= 2) {
          const partsTotal = rec.products.reduce((s, h) => s + (data.items[h]?.price || 0), 0);
          const saving = partsTotal * (rec.discount / 100);
          info.innerHTML = `Bei <em>allen ${rec.products.length} Produkten</em> im Cart: <em class="adm-rec__info--save">&minus;${rec.discount}&thinsp;% (&asymp; ${eur(saving)})</em> auf jedes Produkt.`;
        }
      }
    });

    /* Admin change — Auto-Save + full re-render (blur/checkbox) */
    document.addEventListener("change", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const recEl = t.closest("[data-rec]");
      if (!recEl) return;
      const idx = Number(recEl.getAttribute("data-rec"));
      const rec = adminState.recommendations[idx];
      if (!rec) return;
      if (t.matches("[data-rec-bundle]")) {
        rec.is_bundle = t.checked;
        adminCommit();
        renderAdmin();
      } else if (t.matches("[data-rec-name]")) {
        rec.name = (t.value || "").trim() || "Empfehlung";
        adminCommit();
        renderAdmin();
      } else if (t.matches("[data-rec-discount]")) {
        rec.discount = clamp(parseInt(t.value, 10), 1, 50, 10);
        adminCommit();
        renderAdmin();
      }
    });

    /* ESC schließt Picker */
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && adminState.pickerForRecIdx !== null) {
        closePicker();
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
    if (state.view !== "customer") setView("customer");
    tutorial.active = true;
    tutorial.state = 0;
    state.lines.clear();
    state.lastDisplayedTotal = 0;
    openDrawer();
    setSeqHint("Demo · klick zum Fortfahren");
    render(); // ensureNonEmpty füllt 1× Basis + reapplyTutorial zeigt Bubble
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
      const bLine = Array.from(state.lines.values()).find(l => l.kind === "bundle");
      const b = bLine ? getBundle(bLine.id) : null;
      const pct = b ? Math.round(b.discount * 100) : 15;
      setBubble({
        step: "03 — Aktiv",
        title: "Bundle drin.",
        text: `−${pct} % verrechnet. Versand frei.`
      });
      setTarget(null);
      return;
    }
    if (hasBasis && hasZubehoer) {
      tutorial.state = 1;
      const sug = bundleSuggestion();
      const pct = sug ? Math.round(sug.bundle.discount * 100) : 15;
      const sel = sug ? `[data-bundle-add='${sug.bundle.id}']` : null;
      setBubble({
        step: "02 — Bundle bereit",
        title: "3 Items, ein Set.",
        text: `Klick spart ${pct} %.`,
        targetSel: sel
      });
      setTarget(sel);
      return;
    }
    if (hasBasis) {
      tutorial.state = 0;
      setBubble({
        step: "01 — Cross-Sell",
        title: "Passt zum Korb.",
        text: "Klick legt es dazu.",
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
     ADMIN PANE — Empfehlungs-Konfigurator
     Mirrors the live Shopify-Backend (NEOLYMP) im Paper-Drawer-Stil.
     ---------------------------------------------------------------- */
  function defaultRecommendations() {
    return [{
      id: "r-starter",
      name: "Starter-Set",
      products: ["basis", "zubehoer", "premium"],
      is_bundle: true,
      discount: 15
    }];
  }

  function adminEsc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  }
  function clamp(n, min, max, fb) {
    const v = Number(n);
    return Number.isFinite(v) && v >= min && v <= max ? v : fb;
  }
  function newRecId() {
    return "r-" + Math.random().toString(36).slice(2, 9);
  }

  function adminLoad() {
    let recs = null;
    try {
      const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          recs = parsed.map(r => ({
            id: r.id || newRecId(),
            name: typeof r.name === "string" ? r.name : "Empfehlung",
            products: Array.isArray(r.products)
              ? r.products.filter(h => ADMIN_PRODUCT_IDS.includes(h))
              : [],
            is_bundle: !!r.is_bundle,
            discount: clamp(r.discount, 1, 50, 10)
          }));
        }
      }
    } catch { /* swallow */ }
    adminState.recommendations = recs && recs.length ? recs : defaultRecommendations();
    adminState.initial = JSON.stringify(adminState.recommendations);
  }

  function adminPersist() {
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminState.recommendations));
      adminState.initial = JSON.stringify(adminState.recommendations);
      return true;
    } catch { return false; }
  }

  /* Sync admin recommendations -> customer cart-data (bundles + crossSell).
     So beeinflusst die Admin-Konfiguration den Kunden-Drawer 1:1 wie im echten
     Shopify-Backend. */
  function syncCartFromAdmin() {
    // Bundles aus is_bundle-Empfehlungen mit ≥2 Produkten
    data.bundles = adminState.recommendations
      .filter(r => r.is_bundle && r.products.length >= 2)
      .map(r => ({
        id: r.id,
        name: r.name || "Bundle",
        requires: r.products.slice(),
        discount: clamp(r.discount, 1, 50, 10) / 100,
        glyph: "stack"
      }));

    // Cross-Sell: pro Empfehlung jedes Produkt → die anderen Produkte derselben Gruppe
    const cs = {};
    Object.keys(data.items).forEach(h => { cs[h] = []; });
    adminState.recommendations.forEach(r => {
      if (r.products.length < 2) return;
      r.products.forEach(h => {
        r.products.forEach(o => {
          if (o !== h && !cs[h].includes(o)) cs[h].push(o);
        });
      });
    });
    data.crossSell = cs;

    // Bundle-Cross-Sell auf bekannte Bundle-IDs reduzieren
    const newBcs = {};
    data.bundles.forEach(b => { newBcs[b.id] = []; });
    data.bundleCrossSell = newBcs;

    // Verwaiste Bundle-Lines aus dem Customer-Cart entfernen
    const validBundleIds = new Set(data.bundles.map(b => b.id));
    for (const [id, line] of Array.from(state.lines.entries())) {
      if (line.kind === "bundle" && !validBundleIds.has(id)) {
        state.lines.delete(id);
      }
    }
  }

  function adminHandleCounts() {
    const map = {};
    adminState.recommendations.forEach(r => r.products.forEach(h => {
      map[h] = (map[h] || 0) + 1;
    }));
    return map;
  }
  function adminHasConflict() {
    const counts = adminHandleCounts();
    return Object.values(counts).some(n => n > 1);
  }
  function adminUsedElsewhere(currentIdx) {
    const used = {};
    adminState.recommendations.forEach((r, i) => {
      if (i === currentIdx) return;
      r.products.forEach(h => {
        if (!used[h]) used[h] = r.name || "Empfehlung";
      });
    });
    return used;
  }

  function adminEmptyHtml() {
    return `
      <div class="cart-empty">
        <span class="cart-empty__eyebrow mono">Leer</span>
        <p class="cart-empty__title">Noch keine Empfehlung.</p>
        <p class="cart-empty__hint mono">Klick <em>+ Neue Empfehlung</em> zum Anlegen.</p>
      </div>`;
  }

  function adminChipHtml(handle, recIdx, isDup) {
    const p = data.items[handle];
    if (!p) return "";
    return `
      <span class="adm-chip${isDup ? " adm-chip--dup" : ""}">
        <span class="adm-chip__glyph">${glyphSvg(p.glyph)}</span>
        <span class="adm-chip__name">${adminEsc(p.name)}</span>
        <span class="adm-chip__price">${eur(p.price)}</span>
        <button type="button" class="adm-chip__x" data-rem-product="${recIdx}|${handle}" aria-label="${adminEsc(p.name)} entfernen">&times;</button>
      </span>`;
  }

  function adminRecHtml(rec, idx, counts) {
    const dupHandles = rec.products.filter(h => counts[h] > 1);
    const partsTotal = rec.products.reduce((s, h) => s + (data.items[h]?.price || 0), 0);
    const saving = rec.is_bundle && rec.products.length >= 2 ? partsTotal * (rec.discount / 100) : 0;
    const chips = rec.products.map(h => adminChipHtml(h, idx, counts[h] > 1)).join("");
    const conflictBanner = dupHandles.length
      ? `<div class="adm-conflict">${dupHandles.length} Produkt${dupHandles.length === 1 ? "" : "e"} mehrfach belegt &mdash; bitte aufl&ouml;sen.</div>`
      : "";

    let infoHtml;
    if (rec.products.length < 2) {
      infoHtml = `Mindestens 2 Produkte hinzuf&uuml;gen.`;
    } else if (rec.is_bundle) {
      infoHtml = `Bei <em>allen ${rec.products.length} Produkten</em> im Cart: <em class="adm-rec__info--save">&minus;${rec.discount}&thinsp;% (&asymp; ${eur(saving)})</em> auf jedes Produkt.`;
    } else {
      infoHtml = `${rec.products.length} Produkte als &bdquo;Passt dazu&ldquo;-Empfehlung.`;
    }

    return `
      <article class="adm-rec${dupHandles.length ? " adm-rec--conflict" : ""}" data-rec="${idx}">
        ${conflictBanner}
        <header class="adm-rec__head">
          ${rec.is_bundle ? '<span class="adm-rec__tag">Bundle</span>' : ""}
          <input class="adm-rec__name" type="text" value="${adminEsc(rec.name)}" placeholder="Empfehlungs-Name" data-rec-name aria-label="Empfehlungs-Name">
          <button type="button" class="adm-rec__del" data-rec-del aria-label="Empfehlung l&ouml;schen">&times;</button>
        </header>
        <div class="adm-rec__chips">
          ${chips}
          <button type="button" class="adm-rec__add-chip" data-pick-open>+ Produkt</button>
        </div>
        <div class="adm-rec__bundle">
          <label class="adm-rec__check">
            <input type="checkbox" ${rec.is_bundle ? "checked" : ""} data-rec-bundle>
            <span>Als Bundle mit Rabatt</span>
          </label>
          <span class="adm-rec__discount">
            <span>Rabatt</span>
            <input type="number" min="1" max="50" step="1" value="${rec.discount}"
                   ${rec.is_bundle ? "" : "disabled"}
                   data-rec-discount aria-label="Rabatt in Prozent">
            <span>%</span>
          </span>
        </div>
        <p class="adm-rec__info">${infoHtml}</p>
      </article>`;
  }

  function renderAdminPane() {
    const el = document.getElementById("admin-render");
    if (!el) return;
    const counts = adminHandleCounts();
    const recCount = adminState.recommendations.length;

    if (recCount === 0) {
      el.innerHTML = `
        ${adminEmptyHtml()}
        <button type="button" class="adm-add" data-rec-new>+ Neue Empfehlung</button>`;
      return;
    }

    const used = new Set();
    adminState.recommendations.forEach(r => r.products.forEach(h => used.add(h)));

    el.innerHTML = `
      <div class="adm-meta mono">
        <span class="adm-meta__key">${recCount === 1 ? "1 Empfehlung" : recCount + " Empfehlungen"}</span>
        <span class="adm-meta__sep">&middot;</span>
        <span>${used.size}/${ADMIN_PRODUCT_IDS.length} Produkte belegt</span>
      </div>
      <div class="adm-list">
        ${adminState.recommendations.map((r, i) => adminRecHtml(r, i, counts)).join("")}
      </div>
      <button type="button" class="adm-add" data-rec-new>+ Neue Empfehlung</button>`;
  }

  function renderAdminFooter() {
    const el = footer();
    if (!el) return;
    const conflict = adminHasConflict();

    let label, statusCls;
    if (conflict) {
      label = "Konflikt aktiv &middot; Produkt mehrfach belegt";
      statusCls = "adm-savebar__status--conflict";
    } else {
      label = "Live-Backend &middot; &Auml;nderungen greifen sofort";
      statusCls = "";
    }

    el.innerHTML = `
      <div class="adm-savebar">
        <span class="adm-savebar__status mono ${statusCls}">
          <span class="adm-savebar__dot" aria-hidden="true"></span>
          <span class="adm-savebar__label">${label}</span>
        </span>
        <span class="adm-savebar__flash mono" data-saved-flash aria-live="polite"></span>
      </div>`;
  }

  let savedFlashTimer = null;
  function flashSaved() {
    const el = document.querySelector("[data-saved-flash]");
    if (!el) return;
    el.textContent = "✓ gespeichert";
    el.setAttribute("data-show", "1");
    clearTimeout(savedFlashTimer);
    savedFlashTimer = setTimeout(() => {
      el.removeAttribute("data-show");
    }, 1200);
  }

  function adminCommit() {
    syncCartFromAdmin();
    if (adminPersist()) flashSaved();
    else adminToast("Speichern fehlgeschlagen.", true);
    adminState.dirty = true;
  }

  function renderAdmin() {
    renderAdminPane();
    renderAdminFooter();
  }

  function adminPickerHtml() {
    const idx = adminState.pickerForRecIdx;
    if (idx === null) return "";
    const rec = adminState.recommendations[idx];
    if (!rec) return "";
    const used = adminUsedElsewhere(idx);

    return ADMIN_PRODUCT_IDS.map(h => {
      const p = data.items[h];
      if (!p) return "";
      const taken = rec.products.includes(h);
      const lockedIn = used[h];
      const disabled = taken || !!lockedIn;
      let cta = "w&auml;hlen &rarr;";
      if (taken) cta = "enthalten &check;";
      else if (lockedIn) cta = `belegt: ${adminEsc(lockedIn)}`;
      return `
        <button type="button" class="adm-pick__row" ${disabled ? "disabled" : `data-pick-add="${h}"`}>
          <span class="adm-pick__glyph">${glyphSvg(p.glyph)}</span>
          <span class="adm-pick__text">
            <span class="adm-pick__name">${adminEsc(p.name)}</span>
            <span class="adm-pick__meta mono">${adminEsc(p.meta)} &middot; ${eur(p.price)}</span>
          </span>
          <span class="adm-pick__cta mono">${cta}</span>
        </button>`;
    }).join("");
  }

  function openPicker(idx) {
    adminState.pickerForRecIdx = idx;
    const rec = adminState.recommendations[idx];
    const sub = document.getElementById("adm-modal-sub");
    const list = document.getElementById("adm-modal-list");
    const modal = document.getElementById("adm-modal");
    if (!modal || !list) return;
    if (sub) sub.textContent = `Zu "${rec?.name || "Empfehlung"}" hinzufügen`;
    list.innerHTML = adminPickerHtml();
    modal.hidden = false;
  }
  function closePicker() {
    adminState.pickerForRecIdx = null;
    const modal = document.getElementById("adm-modal");
    if (modal) modal.hidden = true;
  }
  function pickProduct(handle) {
    const idx = adminState.pickerForRecIdx;
    if (idx === null) return;
    const rec = adminState.recommendations[idx];
    if (!rec) return;
    if (!rec.products.includes(handle)) {
      rec.products.push(handle);
      adminCommit();
    }
    closePicker();
    renderAdmin();
  }

  let toastTimer = null;
  function adminToast(msg, isError) {
    const el = document.getElementById("adm-toast");
    if (!el) return;
    el.innerHTML = msg;
    el.classList.toggle("is-error", !!isError);
    el.hidden = false;
    el.removeAttribute("data-show");
    requestAnimationFrame(() => el.setAttribute("data-show", "1"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.removeAttribute("data-show");
      setTimeout(() => { if (!el.hasAttribute("data-show")) el.hidden = true; }, 320);
    }, 2400);
  }

  /* ----------------------------------------------------------------
     VIEW SWITCH
     ---------------------------------------------------------------- */
  function setView(view) {
    if (view !== "customer" && view !== "admin") return;
    if (state.view === view) return;
    state.view = view;

    const cart = document.getElementById("cart");
    cart?.setAttribute("data-view", view);

    document.querySelectorAll(".drawer__pane").forEach(p => {
      p.hidden = p.getAttribute("data-pane") !== view;
    });
    document.querySelectorAll("[data-view-switch]").forEach(b => {
      b.setAttribute("aria-selected", b.getAttribute("data-view-switch") === view ? "true" : "false");
    });

    const titleEl = document.getElementById("cart-title");
    if (titleEl) titleEl.textContent = view === "admin" ? "Empfehlungen" : "Warenkorb";

    if (view === "admin") {
      // Tutorial-Visuals ausblenden, aber Flag halten — beim Rückwechsel
      // soll die Sprechblase wieder erscheinen (reapplyTutorial prüft active).
      setBubble(null);
      setTarget(null);
      setSeqHint("");
      closePicker();
      renderAdmin();
    } else {
      closePicker();
      // Wenn der User in Admin etwas geändert hat, Warenkorb auf den
      // Demo-Anfangszustand zurücksetzen, damit die neue Konfiguration
      // sichtbar wird wie beim ersten Öffnen.
      if (adminState.dirty) {
        adminState.dirty = false;
        startTutorial();
        return;
      }
      renderBody();
      renderFooter();
      if (tutorial.active) setSeqHint("Demo · klick zum Fortfahren");
      reapplyTutorial();
    }
  }
  window.zzCart = {
    addItem, removeItem, setQty, applyBundle, reset,
    runSequence: startTutorial,
    startTutorial,
    setView,
    set(n) {
      const badge = countBadge();
      if (badge) badge.textContent = String(n);
    }
  };

  /* ----------------------------------------------------------------
     INIT
     ---------------------------------------------------------------- */
  function init() {
    adminLoad();
    syncCartFromAdmin();
    bind();
    render();
    renderAdminPane();
    window.addEventListener("resize", () => { if (tutorial.active) reapplyTutorial(); });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
