# Changelog

## 2026-05-06 · Athenum-Map · Mobile-Tooltip-Fix

### Bug

Auf Mobile-Breite (≤ 760 px) verdeckte das Intel-Panel der Macro-Map nach Pin-Klick
**83 % der Viewer-Höhe** — der angeklickte Pin selbst und der Map-Kontext waren
nicht mehr sichtbar; zusätzlich kollidierte das Panel oben links mit dem
„← Übersicht"-Button. Verifiziert per Playwright bei 390 × 844 px:
Viewer 337 × 188 px, Tooltip 309 × 156 px, beide an `top:14, left:14`.

Ursache: Mobile-Override in `assets/macro.css` setzte die Tooltip auf
`width: calc(100% - 28px)`, ließ aber `top: 14` aus der Desktop-Regel stehen.

### Fix

Tooltip wandert auf Mobile per JS aus dem Viewer in den Stage (Sibling nach
`.macro-viewer`); Resize-Listener flippt das DOM beim Crossing zurück. Im neuen
State greift `.macro-stage > .macro-tooltip { position: static; … }` mit
`display:none` solange `aria-hidden="true"`.

| | Vorher | Nachher |
|---|---:|---:|
| Tooltip-Coverage am Viewer | 83 % | 0 % (Sibling, gap 0) |
| Map oben sichtbar nach Pin-Klick | 0 px | 188 px (100 %) |
| Overlap Tooltip ↔ Back-Button | kollidiert | 0 px |
| Intel-Paragraph komplett sichtbar | nein | ja (54 px) |

Desktop (≥ 761 px) unverändert: Tooltip bleibt im Viewer als 320 px Card oben rechts.

### Files

- `assets/macro.js` — neue `placeTooltip()` mit `matchMedia`-Anker + Resize-Listener.
- `assets/macro.css` — Mobile-Block: Tooltip-Styles für umgehängten State unter `.macro-stage > .macro-tooltip`.
- `portfolio.html` — Cache-Bust `macro.css` und `macro.js` auf `?v=2026-05-06-f`.

Commits: `0d3bafc` (erster Bottom-Sheet-Versuch, zu eng) → `518ffa0` (DOM-Move, final).

---

## 2026-05-05 · Design-Audit & Subtraktion

Audit der Portfolio-Seite (Desktop 1440 px, Mobile 375 px, headless Chromium)
und Umsetzung der Reduktions- und Reparaturpunkte. Schwerpunkt: Subtraktion
vor Addition, klarere Hierarchie, AA-Kontrast.

### Struktur (`portfolio.html`)

- Reihenfolge: **Arbeitsproben → Berufserfahrung → Über mich + Kontakt → Footer**.
- Topbar entrümpelt: Brand, drei Nav-Links (`#work`, `#experience`, `#about`),
  Abmelden als schmaler Mono-Button. Suche-Lupe, Cart-Icon-Counter und
  Brand-Suffix entfernt.
- Mobile-Sprungnav (`.subnav`) als horizontaler Mono-Strip direkt unter dem
  Topbar, blendet sich oberhalb 880 px aus.
- „Über mich"-Intro-Block oben gestrichen; kompakte gemeinsame
  About-/Kontakt-Sektion (`.about`) am Ende mit Portrait, Lede,
  Meta-Zeile und `mailto:`-CTA.
- Trustbar, Feature-Skelett-Band („Arbeitsprobe im Fokus"),
  Footer-Nav (Impressum/Datenschutz) und der `#scene`-Hintergrund-Canvas
  mitsamt `scene.js` entfernt.
- Card-Badges auf Mode-Marker reduziert: nur **Live** bzw. **Demo**
  (kein redundantes „klickbar").
- Em-Dash-Stub-Spalte aus den Berufserfahrungs-Items entfernt
  (nur die geclickbare Decathlon-Station behält den `Öffnen →`-CTA).
- `meta description` und `og:`-Tags ergänzt; Title vereinheitlicht zu
  „Zikos Zissis — Portfolio".

### Tokens & Layout (`style.css`, `shop.css`)

- `--ink-dim` von `#4A4F5C` auf `#3F4350` aufgedunkelt → ~4.6:1 auf
  `--bg-base`, AA für 12 px Mono-Text.
- Card-Cover-Aspect von 4:3 auf **16:10** reduziert, `object-position`
  zentriert.
- `.section-head` vereinheitlicht (eine Spalte, größere H1/H2,
  ohne Meta-Spaltenkonstrukt).
- `.intro`, `.feature*`, `.contact`, `.trustbar`, `.foot__nav`,
  `.util*`, `.brand__suffix` und alle dazugehörigen `@media`-Regeln
  entfernt.
- Neue `.about`-Sektion (Portrait + Copy + CTA, kollabiert ≤ 560 px).
- `.topbar__logout` als unauffälliger Mono-Link.

### Cover-System (`cover-builder.js`)

- Linear-/Radial-Gradient-IDs werden jetzt **pro Tile namespaced**
  (`zz-paper-${n}` / `zz-spot-${n}`).
  Vorher: 6 doppelte IDs im DOM, alle Tiles referenzierten technisch das
  erste Cover.
- SVG-`viewBox` auf 800 × 500 angepasst (16:10), Wordmark-Y und
  Stat-Bar neu positioniert.

### Bug-Fixes

- **Cart-Tutorial-Bubble persistierte über Drawer-Wechsel hinweg.**
  Reine CSS-`:has`-Regel: Bubble nur sichtbar bei offenem Cart-Drawer,
  ausgeblendet sobald ein Case-Drawer offen ist.
- **Tote Links** in CTAs ersetzt: „Anfrage senden" → `mailto:`.
- **Inkonsistenter Title** zwischen Gate und Portfolio harmonisiert.

### Messwerte (Vorher → Nachher)

| | Vorher | Nachher |
|---|---:|---:|
| Tote `href="#"`-Links (ohne JS-Action) | 6 | 0 |
| Doppelte SVG-IDs | 6 | 0 |
| Mobile Full-Page-Höhe @375 | 4 880 px | 3 479 px |
| Desktop Full-Page-Höhe @1440 | ~3 500 px | 2 158 px |
| Eyebrow-Zeilen über der Fold | 4 | 1 |
| `--ink-dim` Kontrast auf `--bg-base` | ~3.5:1 | ~4.6:1 |
| HTTP-Requests Initial-Load | 14 | 12 |

### Bewusst nicht angefasst

- **Gate-Seite** (`index.html`) — klarer Eingang, keine Änderung nötig.
- **Editorial-Cover-System** (Paper-Layer, Wordmark, Mini-Rule, Stat-Bar) —
  bleibt als Identitätsmerkmal; nur Aspect-Ratio + ID-Namespacing geändert.
- **Cart-Drawer-Innenleben** (Threshold-Bar, Bundle-Block, Cross-Sell,
  Tutorial-Sequenz).
- **Athenum-Drawer und Macro-Map**.
- **Decathlon-Case-Drawer**.
- **Reduced-Motion-Support**.
- **Asset-Optimierungen** (`portrait.png` 920 KB, `athenum-map.png` 2.2 MB,
  Lazy-Loading von `macro.js`/`case.js`) — gehören in einen
  Performance-Auftrag, nicht in den Design-Auftrag.
