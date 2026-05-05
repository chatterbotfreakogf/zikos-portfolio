/* ============================================================
   case.js — Reading-Drawer für Decathlon-Case
   Open/Close · Render · Stagger-Cells · Count-Up
   ============================================================ */

(() => {
  "use strict";

  const drawer = document.getElementById("case-decathlon");
  if (!drawer) return;

  let lastFocus = null;
  let rendered = false;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- Echte Decathlon-Fitness-Produktbilder (jeweils erstes Listing-Bild) ----
  const PRODUCT_IMAGES = [
    "https://contents.mediadecathlon.com/p2871673/k$e5cbdb0e091db751eb177b75accdde41/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p2798446/k$6b30ac71d4bc9ede0568cbb5e8755457/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3076129/k$903df04cabaff5e4e5bf6778ec20774a/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3042082/k$929cda99fd9171b6bfbc562f8589b4f6/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p2871910/k$862881940bfac20ab90cd6d9ed612e7d/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p2849832/k$9e38ad0a27230be03862a3a969b0973f/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3076124/k$e19e215360aa7f7da39380b5c0fbda7b/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3057753/k$7676bea723e4fb6763a80c4786dc54fe/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3043095/k$da3cafa0080cec7ad519222a987c7b5a/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3043100/k$8ca81c0c1fd7618778e9f5450b0f27a7/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3043133/k$1542b5d527be358bffe668d0c9c1c1d2/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3042278/k$df45848a900235fae26cfab1cd36acd6/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p2833992/k$152ccae1205691034a15f4517a1a2d1c/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p2834025/k$82c02c1838221c29ced3442a6e20cdc6/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p2940193/k$6dc69fe831787addd79e3f272ae9c240/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p2624338/k$3c63e39917d55f6e58d6d8eab40198e7/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p2784431/k$c8520bbfb32b9e0a6989e2c2226dc19e/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p2940719/k$a9306d110baaac8ff6853ea975ac88a7/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p2624337/k$3009042981a31ba7fd8e1fc0096c34cf/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3033664/k$de9eece367f4de81e39429b95aef4b2e/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3033606/k$32909cd5b73cc1231e3135ce0532f152/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p1990724/k$ddc4f1e295d444077b510da0eeef119c/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p2723315/k$9310ae5e982bb1c246daa85463ef9ca2/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3025645/k$0d919165eaf6d8e2285f0896d166cbd1/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p2788602/k$22fc90a7b212213db553e78e1731ef7b/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3038940/k$53fd208d08eeb5de884d2b6eeedb4fff/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3012381/k$f1113b480acc684055f89c3727ddaac1/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3026174/k$eced216d3d2cf0758d4f5ab8adb773f3/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3012582/k$f7f9aaa114017f8049bb518e4c2b6d72/picture.jpg?format=auto&f=320x0",
    "https://contents.mediadecathlon.com/p3077792/k$af31788ce628bc9731e2f081a6a1d782/picture.jpg?format=auto&f=320x0",
  ];

  // Mosaic-Permutation: feste Pseudo-Random-Reihenfolge, damit benachbarte Cells
  // unterschiedliche Produkte zeigen statt offensichtlich zu kacheln.
  function pickImage(c, r) {
    const seed = (c * 7 + r * 13 + ((c * r) >> 1)) % PRODUCT_IMAGES.length;
    return PRODUCT_IMAGES[(seed + PRODUCT_IMAGES.length) % PRODUCT_IMAGES.length];
  }


  // --- Hero-Heatmap (wide, drawer-fitted) -----------------------
  function heroHeatmapSvg() {
    const COLS = 24, ROWS = 10;
    const CELL_W = 56, CELL_H = 56, GAP = 8;
    const PAD_X = 36, PAD_Y = 38;
    const W = PAD_X * 2 + COLS * CELL_W + (COLS - 1) * GAP;
    const H = PAD_Y * 2 + ROWS * CELL_H + (ROWS - 1) * GAP;

    const mint = new Set(["4-2", "11-3", "7-6", "16-2", "19-7", "20-4"]);
    const red  = new Set(["3-7", "13-8"]);

    const cells = [];
    let i = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = PAD_X + c * (CELL_W + GAP);
        const y = PAD_Y + r * (CELL_H + GAP);
        const key = `${c}-${r}`;
        const stroke = mint.has(key) ? "#34D9A0" : red.has(key) ? "#C8252A" : null;
        const img = pickImage(c, r);

        // Paper-Tile als Backdrop (sichtbar während Bild lädt + falls Bild ausfällt)
        cells.push(
          `<rect data-cell data-i="${i}" x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" fill="#FBFBF7" stroke="rgba(15,16,21,0.10)" stroke-width="1" style="--cell-op:1"/>`
        );
        // Produktbild (clipped auf Cell-Größe)
        cells.push(
          `<image data-cell data-i="${i}" href="${img}" x="${x + 1}" y="${y + 1}" width="${CELL_W - 2}" height="${CELL_H - 2}" preserveAspectRatio="xMidYMid slice" style="--cell-op:1"/>`
        );
        // Marker-Stroke obendrauf
        if (stroke) {
          cells.push(
            `<rect data-cell data-i="${i}" x="${x + 0.5}" y="${y + 0.5}" width="${CELL_W - 1}" height="${CELL_H - 1}" fill="none" stroke="${stroke}" stroke-width="2" style="--cell-op:1"/>`
          );
        }
        i++;
      }
    }

    return `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="14.247 SKUs · Heatmap aus Decathlon-Fitness-Produkten">
        <defs>
          <linearGradient id="case-paper" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#F2EEE3"/>
            <stop offset="100%" stop-color="#E2DCC8"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${W}" height="${H}" fill="url(#case-paper)"/>
        ${cells.join("")}
        <rect x="${PAD_X - 6}" y="${H - 38}" width="340" height="28" fill="rgba(250,250,246,0.92)"/>
        <text x="${PAD_X}" y="${H - 18}"
              font-family="JetBrains Mono, ui-monospace, monospace"
              font-size="14" letter-spacing="2.6" font-weight="500"
              fill="#0F1015">14.247 SKUs · 24 MONATE · DE/AT</text>
      </svg>
    `;
  }

  // --- Section helpers -----------------------------------------
  function section(eyebrow, body) {
    return `
      <section class="case-section">
        <header class="case-section__head">
          <span class="case-section__eyebrow">${eyebrow}</span>
        </header>
        <div class="case-section__body">${body}</div>
      </section>
    `;
  }

  function hebelGridHtml() {
    const items = [
      ["01", "Range-Cleanup", "Slow-Mover identifiziert, Sortiment konsolidiert."],
      ["02", "Cross-Sell-Datenmodell", "Affinitätsmatrix für komplementäre SKUs aufgebaut."],
      ["03", "Saison-Onboarding", "06 Saisons strukturiert eingeführt und gepflegt."],
      ["04", "Cross-Country-Rollout", "DE-Logik nach AT übertragen, lokal abgestimmt."],
    ];
    return `
      <div class="case-hebel">
        ${items.map(([i, t, x]) => `
          <article class="case-hebel__item">
            <span class="case-hebel__index">HEBEL · ${i}</span>
            <h4 class="case-hebel__title">${t}</h4>
            <p class="case-hebel__text">${x}</p>
          </article>
        `).join("")}
      </div>
    `;
  }

  function outcomeHtml() {
    return `
      <div class="case-outcome">
        <div class="case-outcome__item">
          <span class="case-outcome__num" data-countup="14247" data-format="de">0</span>
          <span class="case-outcome__label">SKUs verwaltet</span>
        </div>
        <div class="case-outcome__item">
          <span class="case-outcome__num" data-countup="6" data-format="pad2">00</span>
          <span class="case-outcome__label">Saisons begleitet</span>
        </div>
        <div class="case-outcome__item">
          <span class="case-outcome__num" data-countup="2" data-format="pad2">00</span>
          <span class="case-outcome__label">Länder synchronisiert</span>
        </div>
      </div>
    `;
  }

  function format(n, mode) {
    if (mode === "de") return Math.round(n).toLocaleString("de-DE");
    if (mode === "pad2") return String(Math.round(n)).padStart(2, "0");
    return String(Math.round(n));
  }

  // --- Render ---------------------------------------------------
  function renderCase() {
    if (rendered) return;
    const body = document.getElementById("case-decathlon-body");
    if (!body) return;

    body.innerHTML = `
      <section class="case-hero" aria-hidden="true">${heroHeatmapSvg()}</section>

      ${section("KONTEXT", `
        <p>Operative Range-Verantwortung für das Fitness-Sortiment in DE/AT, 100&nbsp;% remote, mit Steuerung von 14.000+ SKUs über 06 Saisons. Schnittstelle zwischen Sortimentsplanung, Cross-Country-Rollouts (DE&nbsp;→&nbsp;AT) und Conversion-Optimierung.</p>
      `)}

      ${section("HEBEL", hebelGridHtml())}

      ${section("OUTCOME", outcomeHtml())}

      ${section("TRANSFER", `
        <blockquote class="case-transfer">Aus operativer Range-Steuerung kam das Mindset für die Smart-Cart-Logik: Cross-Sell und Bundle-Empfehlungen sind keine Spielereien — sie sind das Ergebnis langer Sortiments-Arbeit, in Code übersetzt.</blockquote>
      `)}

      <footer class="case-foot">
        <button type="button" class="case-back" data-case-close>
          <span aria-hidden="true">&larr;</span>
          <span>Zurück zur Übersicht</span>
        </button>
        <span class="case-foot__hint">Case 03 · Decathlon · 2022 → 2025</span>
      </footer>
    `;

    rendered = true;
  }

  // --- Animations ----------------------------------------------
  function triggerEntryAnimations() {
    const cells = drawer.querySelectorAll(".case-hero [data-cell]");
    if (reduceMotion) {
      cells.forEach(el => {
        el.style.opacity = el.style.getPropertyValue("--cell-op") || "1";
        el.style.transform = "none";
      });
    } else {
      cells.forEach((cell, i) => {
        const idx = parseInt(cell.dataset.i, 10) || 0;
        cell.style.animationDelay = (Math.min(idx, 240) * 6) + "ms";
        cell.classList.add("is-in");
      });
    }

    drawer.querySelectorAll("[data-countup]").forEach(el => countUp(el));
  }

  function countUp(el) {
    const target = parseFloat(el.dataset.countup);
    const mode = el.dataset.format || "plain";
    if (reduceMotion || !Number.isFinite(target)) {
      el.textContent = format(target, mode);
      return;
    }
    const dur = 1200;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(target * eased, mode);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // --- Open / Close --------------------------------------------
  function openCase(e) {
    e?.preventDefault();
    lastFocus = document.activeElement;
    renderCase();
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      drawer.querySelector(".case-drawer__close")?.focus();
      requestAnimationFrame(triggerEntryAnimations);
    });
  }

  function closeCase() {
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lastFocus?.focus?.();
  }

  // --- Wiring --------------------------------------------------
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-action="case-decathlon"]')) return openCase(e);
    if (t.closest("[data-case-close]")) {
      e.preventDefault();
      return closeCase();
    }
  });

  document.addEventListener("keydown", (e) => {
    // Keyboard-Aktivierung für li/div mit data-action und role="button"
    if ((e.key === "Enter" || e.key === " ")
        && e.target instanceof Element
        && e.target.matches('[role="button"][data-action="case-decathlon"]')) {
      e.preventDefault();
      openCase(e);
      return;
    }
    if (e.key === "Escape" && drawer.getAttribute("aria-hidden") === "false") closeCase();
  });
})();
