/* ============================================================
   macro.js — Macro Intelligence · Drawer
   Echter Screenshot von athenum.xyz · Pan & Zoom · Hotspot-Pins
   ============================================================ */

(() => {
  "use strict";

  const drawer = document.getElementById("case-athenum");
  if (!drawer) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SCREENSHOT_SRC = "assets/athenum-map.png";
  const SCREENSHOT_W = 2576;
  const SCREENSHOT_H = 1438;

  // Hotspots in Bildkoordinaten (px, bezogen auf 2576×1438) —
  // erzählerische Anker direkt auf dem echten Screenshot.
  const HOTSPOTS = [
    { id: "ukraine",  x: 1740, y:  640, label: "UCDP Conflict",   color: "#E04B3F",
      title: "Ukraine · UCDP Conflict-Heatmap",
      meta:  "8 EVENTS · LAYER ACTIVE",
      intel: "Heatmap der UCDP-Datenbank — 50K eingebettete + 350K API-Events. Roter Cluster zeigt aktuelle Front-Konzentration." },
    { id: "syria",    x: 1900, y: 1010, label: "Conflict Forecast", color: "#E04B3F",
      title: "Syrien / Irak · Multi-Konflikt-Zone",
      meta:  "RISK 0.92 · ViEWS 36-Mo Forecast",
      intel: "PRIO/ViEWS-Prognose über 36 Monate, kombiniert mit GDELT-Echtzeit-Events alle 15 Min." },
    { id: "submarine", x: 1100, y:  920, label: "Submarine Bases", color: "#A86CD8",
      title: "Mittelmeer · Submarine-Base-Layer",
      meta:  "60–75 GLOBAL · LAYER AKTIV",
      intel: "U-Boot-Stützpunkte gegen Undersea-Cable-Routen overlay-bar — Choke-Point-Analyse für Subsea-Risiken." },
    { id: "cables",   x:  860, y:  410, label: "Undersea Cables", color: "#34D9A0",
      title: "Nord-Atlantik · 685 Kabel-Routen",
      meta:  "TELEGEOGRAPHY · LAYER AKTIV",
      intel: "685 submarine cable routes — Backbone des globalen Internets, hier dicht über Irland & UK gebündelt." },
    { id: "events",   x: 2280, y:  300, label: "Events Feed",     color: "#E8B23A",
      title: "Event-Feed",
      meta:  "USGS · NASA EONET · 24H",
      intel: "Erdbeben (USGS), Wildfires (NASA EONET), Konflikte (GDELT) — alle Events der letzten 24 Std. aggregiert." },
    { id: "layers",   x:  220, y:  280, label: "Layer-Stack",     color: "#34D9A0",
      title: "75 Datenlayer · 3 aktiv",
      meta:  "ARMS · BRI · UCDP · CABLES …",
      intel: "Vollständiger Layer-Stack mit Quellenangabe pro Layer (SIPRI, AidData, UCDP, IAEA, TeleGeography, etc.)." },
  ];

  // ============================================================
  // Drawer-State
  // ============================================================
  const state = {
    selectedHotspot: null,
    rendered: false,
    scale: 1,
    tx: 0,
    ty: 0,
  };

  let lastFocus = null;

  function openCase(e) {
    e?.preventDefault();
    lastFocus = document.activeElement;
    renderDrawerOnce();
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      drawer.querySelector(".case-drawer__close")?.focus();
      requestAnimationFrame(() => startTutorial());
    });
  }

  function closeCase() {
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lastFocus?.focus?.();
  }

  function renderDrawerOnce() {
    if (state.rendered) return;
    const body = document.getElementById("case-athenum-body");
    if (!body) return;

    body.innerHTML = `
      <section class="macro-stage" aria-hidden="false">
        <header class="macro-stage__head">
          <div class="macro-stage__head-left">
            <span class="macro-stage__title">ATHENUM · MACRO MAP</span>
            <span class="macro-stage__sub">75 LAYER · DEMO-ANSICHT · athenum.xyz</span>
          </div>
          <div class="macro-stage__head-right">
            <span class="macro-stage__demo mono">DEMO</span>
          </div>
        </header>

        <div class="macro-viewer" role="application" aria-label="Zoombarer Screenshot der Athenum-Map" data-viewer>
          <div class="macro-viewer__stage" data-stage>
            <img
              class="macro-viewer__img"
              src="${SCREENSHOT_SRC}"
              width="${SCREENSHOT_W}"
              height="${SCREENSHOT_H}"
              alt="Athenum Macro-Map · Demo-Ansicht mit Layer-Stack, Welt-Karte und Event-Feed"
              draggable="false"
              data-img
            />
            <div class="macro-pins" data-pins aria-hidden="true">
              ${HOTSPOTS.map((h, i) => `
                <button
                  type="button"
                  class="macro-pin"
                  data-pin="${h.id}"
                  data-pin-index="${i + 1}"
                  style="--pin-x:${(h.x / SCREENSHOT_W) * 100}%; --pin-y:${(h.y / SCREENSHOT_H) * 100}%; --pin-c:${h.color};"
                  aria-label="${h.title}"
                >
                  <span class="macro-pin__num mono">${String(i + 1).padStart(2, "0")}</span>
                </button>
              `).join("")}
            </div>
          </div>

          <aside class="macro-tooltip" data-tooltip aria-hidden="true">
            <button type="button" class="macro-tooltip__close" data-tip-close aria-label="Detail schließen">&times;</button>
            <span class="macro-tooltip__layer mono" data-tip-layer></span>
            <h4 class="macro-tooltip__name" data-tip-name></h4>
            <p class="macro-tooltip__meta mono" data-tip-meta></p>
            <p class="macro-tooltip__intel" data-tip-intel></p>
          </aside>

          <button type="button" class="macro-back" data-tip-close aria-label="Zurück zur Übersicht">
            <span aria-hidden="true">&larr;</span>
            <span>Übersicht</span>
          </button>

          <div class="macro-hint mono" data-hint>KLICK EINEN HOTSPOT &middot; KLICK AUSSERHALB ODER ESC ZURÜCK</div>
        </div>

        <footer class="macro-controls">
          <span class="macro-controls__label mono">HOTSPOTS</span>
          <div class="macro-controls__pills">
            ${HOTSPOTS.map((h, i) => `
              <button class="macro-pill" type="button" data-jump="${h.id}" style="--c:${h.color}">
                <span class="macro-pill__dot"></span>
                <span class="macro-pill__label">${h.label}</span>
                <span class="macro-pill__count mono">${String(i + 1).padStart(2, "0")}</span>
              </button>
            `).join("")}
          </div>
        </footer>
      </section>

      <aside class="macro-bubble" data-bubble aria-live="polite">
        <span class="macro-bubble__step mono">SO FUNKTIONIERT&apos;S</span>
        <h3 class="macro-bubble__title">Klick einen Hotspot</h3>
        <p class="macro-bubble__text">Ich habe ein paar Hotspots beispielhaft als Pins markiert — keine Rangfolge, einfach drei, vier Beispiele für das, was das Tool kann. Klick einen Pin, die Demo zoomt hin und zeigt das Intel-Panel. Klick irgendwo daneben oder drück <em>ESC</em>, und du bist sofort zurück.</p>
      </aside>

      ${section("KONTEXT", `
        <p>Athenum Macro Intelligence ist eine <strong>Eigenentwicklung</strong> von mir, gebaut im Rahmen meines Projektvertrags mit Athenum: eine geopolitische Datenschicht über einer GPU-nativen Welt-Karte, 75 togglebare Layer aus offenen Quellen (UCDP, SIPRI, AidData, IAEA, TeleGeography, USGS, NASA EONET, GDELT, ViEWS / PRIO) — Konzept, Daten-Layer, Frontend und Routing alles aus meiner Hand.</p>
        <p>Diese Ansicht hier ist eine <strong>Demo</strong> als Arbeitsprobe — ein hochauflösender Stand aus dem produktiven Tool, mit ein paar beispielhaften Hotspots als Einstieg. Der echte, ständig aktualisierte Stand läuft auf <a class="macro-link" href="https://athenum.xyz" target="_blank" rel="noopener">athenum.xyz</a>.</p>
      `)}

      ${section("HEBEL", `
        <div class="case-hebel">
          <article class="case-hebel__item">
            <span class="case-hebel__index">HEBEL · 01</span>
            <h4 class="case-hebel__title">Aggregation — Single Source of Truth</h4>
            <p class="case-hebel__text">Statt zehn Tabs, PDF-Reports und kostenpflichtigen Terminals: ein Tool, das heterogene öffentliche Datenquellen (UN, IAEA, USGS, NASA, GDELT, World Bank u. a.) normalisiert, geocodiert und in einer einzigen Welt-Sicht zusammenführt.</p>
          </article>
          <article class="case-hebel__item">
            <span class="case-hebel__index">HEBEL · 02</span>
            <h4 class="case-hebel__title">Korrelation — Layer übereinanderlegen</h4>
            <p class="case-hebel__text">Der eigentliche Erkenntnisgewinn entsteht nicht in einem Layer, sondern dort, wo mehrere sich überlagern — Konflikt × Infrastruktur × Rohstoffe × Lieferketten. Aus Einzeldaten werden Muster, aus Mustern wird Risiko-Lesbarkeit.</p>
          </article>
          <article class="case-hebel__item">
            <span class="case-hebel__index">HEBEL · 03</span>
            <h4 class="case-hebel__title">Aktualität — Live statt Report-Lag</h4>
            <p class="case-hebel__text">Klassische Geo-Reports sind Tage bis Wochen alt. Athenum pollt offene Quellen im Minuten-Takt und propagiert Updates direkt in die Karte — Lage-Wechsel sind sichtbar, bevor sie in Reports stehen.</p>
          </article>
          <article class="case-hebel__item">
            <span class="case-hebel__index">HEBEL · 04</span>
            <h4 class="case-hebel__title">Prognose statt Rückblick</h4>
            <p class="case-hebel__text">Historische Layer (UCDP, BRI, Trade-Flows) sind die Basis, die forecast-fähigen Layer (PRIO/ViEWS u. a.) der eigentliche Wert: Risiko nicht erst sehen, wenn es eingetreten ist, sondern Monate vorher als Wahrscheinlichkeitsraum.</p>
          </article>
        </div>
      `)}

      ${section("OUTCOME", `
        <div class="case-outcome">
          <div class="case-outcome__item">
            <span class="case-outcome__num" data-countup="75" data-format="pad2">00</span>
            <span class="case-outcome__label">Layer ausgeliefert</span>
          </div>
          <div class="case-outcome__item">
            <span class="case-outcome__num"><span data-countup="100" data-format="plain">0</span>K<span aria-hidden="true">+</span></span>
            <span class="case-outcome__label">Datapoints kuratiert</span>
          </div>
          <div class="case-outcome__item">
            <span class="case-outcome__num" data-countup="12" data-format="pad2">00</span>
            <span class="case-outcome__label">offene Datenquellen</span>
          </div>
        </div>
      `)}

      ${section("TRANSFER", `
        <blockquote class="case-transfer">Aus geopolitischer Risiko-Visualisierung kam das Mindset für jede meiner Conversion-Demos: relevante Information dort hinrendern, wo der Nutzer hinblickt — visuell direkt entschlüsselbar, ohne Lookup-Tabelle, ohne Erklärtext.</blockquote>
      `)}

      <footer class="case-foot">
        <button type="button" class="case-back" data-case-close>
          <span aria-hidden="true">&larr;</span>
          <span>Zurück zur Übersicht</span>
        </button>
        <a class="macro-external" href="https://athenum.xyz" target="_blank" rel="noopener">
          <span>↗</span> Tool auf athenum.xyz
        </a>
      </footer>
    `;

    // Wire up viewer (zoom / pan / pin clicks)
    initViewer(body);

    // Tooltip-Placement an Viewport koppeln (Mobile: unter dem Viewer
    // als Block, Desktop: oben rechts im Viewer als Card)
    placeTooltip();
    if (!placeTooltip._wired) {
      window.addEventListener("resize", placeTooltip, { passive: true });
      placeTooltip._wired = true;
    }

    // Outcome count-ups
    body.querySelectorAll("[data-countup]").forEach(el => countUp(el));

    state.rendered = true;
  }

  // Mobile (≤760px): Tooltip wandert aus dem Viewer in den Stage
  // (als Sibling nach .macro-viewer). Map bleibt voll sichtbar,
  // Intel-Text hat eigenen Platz. Desktop: Tooltip bleibt im Viewer.
  function placeTooltip() {
    const tooltip = drawer.querySelector(".macro-tooltip");
    const viewer  = drawer.querySelector(".macro-viewer");
    const stage   = drawer.querySelector(".macro-stage");
    if (!tooltip || !viewer || !stage) return;
    const isMobile = window.matchMedia("(max-width: 760px)").matches;
    const inStage = tooltip.parentNode === stage;
    if (isMobile && !inStage) {
      stage.insertBefore(tooltip, viewer.nextSibling);
    } else if (!isMobile && tooltip.parentNode !== viewer) {
      viewer.appendChild(tooltip);
    }
  }

  // ============================================================
  // Viewer · Klick-only · Hotspot-Zoom
  // ============================================================
  function initViewer(body) {
    const viewer = body.querySelector("[data-viewer]");

    // Pin-Klicks → Zoom + Tooltip
    body.querySelectorAll("[data-pin]").forEach(pin => {
      pin.addEventListener("click", e => {
        e.stopPropagation();
        focusHotspot(pin.dataset.pin);
        advanceTutorial("pin");
      });
    });

    // Pill-Klicks (Hotspot-Liste unten) → identisch wie Pin
    body.querySelectorAll("[data-jump]").forEach(btn => {
      btn.addEventListener("click", () => {
        focusHotspot(btn.dataset.jump);
        advanceTutorial("pin");
      });
    });

    // Klick außerhalb (Bild, Stage-Hintergrund, Zurück-Button, Tooltip-×) → Reset
    viewer.addEventListener("click", e => {
      if (e.target.closest("[data-pin]")) return;
      if (e.target.closest(".macro-tooltip") && !e.target.closest("[data-tip-close]")) return;
      resetView();
    });
  }

  function focusHotspot(id) {
    const h = HOTSPOTS.find(x => x.id === id);
    if (!h) return;
    const viewer = drawer.querySelector("[data-viewer]");
    const stage  = drawer.querySelector("[data-stage]");
    const rect   = viewer.getBoundingClientRect();

    const targetScale = 2.6;
    const px = (h.x / SCREENSHOT_W - 0.5) * rect.width  * targetScale;
    const py = (h.y / SCREENSHOT_H - 0.5) * rect.height * targetScale;

    state.scale = targetScale;
    state.tx = -px;
    state.ty = -py;
    stage.style.transition = "transform 520ms cubic-bezier(0.22, 0.61, 0.36, 1)";
    stage.style.transform = `translate3d(${state.tx}px, ${state.ty}px, 0) scale(${state.scale})`;
    viewer.dataset.zoomed = "1";

    drawer.querySelectorAll("[data-pin]").forEach(p => p.classList.toggle("is-selected", p.dataset.pin === id));
    drawer.querySelectorAll("[data-jump]").forEach(p => p.dataset.active = (p.dataset.jump === id ? "1" : "0"));

    showTooltip(h);
    state.selectedHotspot = id;
  }

  function resetView() {
    const viewer = drawer.querySelector("[data-viewer]");
    const stage  = drawer.querySelector("[data-stage]");
    if (!viewer || !stage) return;
    state.scale = 1; state.tx = 0; state.ty = 0;
    stage.style.transition = "transform 480ms cubic-bezier(0.22, 0.61, 0.36, 1)";
    stage.style.transform = "translate3d(0,0,0) scale(1)";
    viewer.dataset.zoomed = "0";
    hideTooltip();
  }

  function showTooltip(h) {
    const tip = drawer.querySelector("[data-tooltip]");
    if (!tip) return;
    tip.querySelector("[data-tip-layer]").textContent = h.label.toUpperCase();
    tip.querySelector("[data-tip-layer]").style.color = h.color;
    tip.querySelector("[data-tip-name]").textContent = h.title;
    tip.querySelector("[data-tip-meta]").textContent = h.meta;
    tip.querySelector("[data-tip-intel]").textContent = h.intel;
    tip.setAttribute("aria-hidden", "false");
  }

  function hideTooltip() {
    drawer.querySelector("[data-tooltip]")?.setAttribute("aria-hidden", "true");
    drawer.querySelectorAll("[data-pin]").forEach(p => p.classList.remove("is-selected"));
    drawer.querySelectorAll("[data-jump]").forEach(p => p.dataset.active = "0");
    state.selectedHotspot = null;
  }

  function section(eyebrow, body) {
    return `
      <section class="case-section">
        <header class="case-section__head"><span class="case-section__eyebrow">${eyebrow}</span></header>
        <div class="case-section__body">${body}</div>
      </section>`;
  }

  // ============================================================
  // Bedien-Hinweis · Bubble bleibt dauerhaft sichtbar.
  // Pin-Pulse-Highlight blendet nach erstem Klick aus.
  // ============================================================
  function startTutorial() {
    drawer.querySelector("[data-bubble]")?.setAttribute("data-show", "1");
    if (reduceMotion) return;
    const pin = drawer.querySelector('[data-pin="ukraine"]');
    if (pin) pin.setAttribute('data-tutorial-spot', '1');
  }

  function advanceTutorial() {
    drawer.querySelectorAll('[data-tutorial-spot]').forEach(el => el.removeAttribute('data-tutorial-spot'));
  }

  // ============================================================
  // Outcome Count-Up · adapted aus case.js
  // ============================================================
  function format(n, mode) {
    if (mode === "de") return Math.round(n).toLocaleString("de-DE");
    if (mode === "pad2") return String(Math.round(n)).padStart(2, "0");
    return String(Math.round(n));
  }

  function countUp(el) {
    const target = parseFloat(el.dataset.countup);
    const mode = el.dataset.format || "plain";
    if (reduceMotion || !Number.isFinite(target)) {
      el.textContent = format(target, mode);
      return;
    }
    const dur = 1400;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(target * eased, mode);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ============================================================
  // Wiring
  // ============================================================
  document.addEventListener("click", e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-action="case-athenum"]')) return openCase(e);
    if (drawer.contains(t) && t.closest("[data-case-close]")) {
      e.preventDefault();
      return closeCase();
    }
    if (drawer.getAttribute("aria-hidden") === "false" && t.closest(".case-drawer__scrim")) {
      return closeCase();
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (drawer.getAttribute("aria-hidden") !== "false") return;
    if (state.selectedHotspot) {
      // ESC im Zoom-State: zurück zur Übersicht — Drawer bleibt offen
      resetView();
    } else {
      closeCase();
    }
  });
})();
