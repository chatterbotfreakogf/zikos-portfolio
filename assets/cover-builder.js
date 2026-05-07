/* ============================================================
   cover-builder.js — Einheitliches Cover-System für alle Tiles
   <figure data-cover='{"brand":"…","subtitle":"…","stats":"…"}'>
   ============================================================ */

(() => {
  "use strict";

  function spacedWordmark(brand) {
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

    const len = (brand || "").length;
    const fs = len > 10 ? 50 : len > 8 ? 58 : 64;
    const ls = len > 10 ? 7  : len > 8 ? 9  : 11;

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" text-rendering="optimizeLegibility" role="img" aria-label="${wm} — ${sub}" class="zz-cover">
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

  <text x="400" y="248" text-anchor="middle"
        font-family="Inter, system-ui, sans-serif"
        font-size="${fs}" font-weight="400" letter-spacing="${ls}"
        fill="#08090C">${wm}</text>

  <line x1="350" y1="282" x2="450" y2="282" stroke="#08090C" stroke-width="1.6"/>

  <text x="400" y="326" text-anchor="middle"
        font-family="Inter, system-ui, sans-serif"
        font-size="26" font-weight="600" letter-spacing="-0.2"
        fill="#15171F">${sub}</text>

  <line x1="56" y1="430" x2="744" y2="430" stroke="rgba(15,16,21,0.22)" stroke-width="1"/>
  <text x="400" y="463" text-anchor="middle"
        font-family="JetBrains Mono, ui-monospace, monospace"
        font-size="15" letter-spacing="1.8" font-weight="600"
        fill="#08090C">${st}</text>
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
})();
