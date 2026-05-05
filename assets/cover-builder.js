/* ============================================================
   cover-builder.js — Einheitliches Cover-System für alle Tiles
   Eine Funktion, ein Layout, alle Tiles sehen wie eine Kollektion aus.
   Verwendung im HTML: <figure data-cover='{"brand":"...","subtitle":"...","stats":"..."}'>
   ============================================================ */

(() => {
  "use strict";

  function spacedWordmark(brand) {
    // Sicherer Wordmark ohne Sonderzeichen-Spread
    return String(brand || "").toUpperCase().trim();
  }

  function escapeXml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  let coverSeq = 0;

  function buildCover({ brand, subtitle, stats }) {
    const wm = escapeXml(spacedWordmark(brand));
    const sub = escapeXml(subtitle || "");
    const st = escapeXml(stats || "");

    const id = ++coverSeq;
    const paperId = `zz-paper-${id}`;
    const spotId  = `zz-spot-${id}`;

    // Letter-spacing skaliert mit Wortlänge, damit lange Wörter nicht überlaufen.
    const len = (brand || "").length;
    const fs = len > 10 ? 44 : len > 8 ? 50 : 54;
    const ls = len > 10 ? 8  : len > 8 ? 10 : 12;

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${wm} — ${sub}" class="zz-cover">
  <defs>
    <linearGradient id="${paperId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F2EEE3"/>
      <stop offset="100%" stop-color="#E2DCC8"/>
    </linearGradient>
    <radialGradient id="${spotId}" cx="22%" cy="28%" r="58%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect x="0" y="0" width="800" height="500" fill="url(#${paperId})"/>
  <rect x="0" y="0" width="800" height="500" fill="url(#${spotId})"/>

  <g transform="translate(580,72)">
    <line x1="0" y1="0" x2="160" y2="0" stroke="rgba(15,16,21,0.18)" stroke-width="1"/>
    <circle cx="0"   cy="0" r="2.4" fill="#0F1015"/>
    <circle cx="32"  cy="0" r="2.4" fill="#0F1015"/>
    <circle cx="64"  cy="0" r="2.4" fill="#0F1015"/>
    <circle cx="96"  cy="0" r="2.4" fill="#34D9A0"/>
    <circle cx="128" cy="0" r="2.4" fill="#0F1015"/>
    <circle cx="160" cy="0" r="2.4" fill="#0F1015"/>
  </g>

  <text x="400" y="252" text-anchor="middle"
        font-family="Inter, system-ui, sans-serif"
        font-size="${fs}" font-weight="300" letter-spacing="${ls}"
        fill="#0F1015">${wm}</text>

  <line x1="350" y1="284" x2="450" y2="284" stroke="#0F1015" stroke-width="1.4"/>

  <text x="400" y="322" text-anchor="middle"
        font-family="Inter, system-ui, sans-serif"
        font-size="22" font-weight="400" letter-spacing="-0.2"
        fill="#1F222A">${sub}</text>

  <line x1="56" y1="430" x2="744" y2="430" stroke="rgba(15,16,21,0.18)" stroke-width="1"/>
  <text x="400" y="460" text-anchor="middle"
        font-family="JetBrains Mono, ui-monospace, monospace"
        font-size="13" letter-spacing="2.6" font-weight="500"
        fill="#0F1015">${st}</text>
</svg>`.trim();
  }

  function mountAll() {
    document.querySelectorAll('[data-cover]').forEach(fig => {
      if (fig.dataset.coverMounted === "1") return;
      let meta;
      try { meta = JSON.parse(fig.dataset.cover); }
      catch (e) { console.error("cover-builder: bad JSON", fig, e); return; }

      const wrap = document.createElement("div");
      wrap.className = "card__cover card__cover--zz";
      wrap.setAttribute("aria-hidden", "true");
      wrap.innerHTML = buildCover(meta);
      fig.insertBefore(wrap, fig.firstChild);
      fig.dataset.coverMounted = "1";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll);
  } else {
    mountAll();
  }

  // Debug-Hook
  window.__zzBuildCover = buildCover;
})();
