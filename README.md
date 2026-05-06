# Zikos Zissis — Portfolio

**Live:** https://zikos-portfolio.onrender.com/
**Repo:** https://github.com/chatterbotfreakogf/zikos-portfolio

Statisches Portfolio mit Passwort-Gate. Kein Build-Step. Reines HTML/CSS/JS.
Smart-Cart-Demo (mit editierbarem Admin-Pane), Athenum-Macro-Intelligence-Showcase, Editorial-Cover-System, zentral schwebender Kontakt-Dialog mit echter Mail-Zustellung.

## Struktur

```
.
├── index.html               # Gate (Login)
├── portfolio.html           # Portfolio hinter dem Gate
├── render.yaml              # Render Blueprint (statisches Hosting)
├── assets/
│   ├── style.css            # Basis-Tokens, Gate, Microscene
│   ├── shop.css             # Portfolio-Layout, Smart-Cart-Drawer, Kontakt-Dialog
│   ├── case.css             # Case-Drawer (zoombare Studien)
│   ├── macro.css            # Athenum-Macro-Intelligence-Showcase
│   ├── auth.js              # SHA-256 Soft-Gate
│   ├── scene.js             # ambient canvas (Partikel + Cursor-Halo)
│   ├── shop.js              # UI-Logik: Drawer, Advisor, Kontakt-Dialog, Reveal
│   ├── cart.js              # Smart-Cart-Drawer + Admin-Pane (Empfehlungs-Konfigurator)
│   ├── cart-data.js         # Items / Bundles / Cross-Sell-Defaults
│   ├── case.js              # Case-Drawer-Inhalte (Decathlon)
│   ├── macro.js             # Macro-Intelligence Hotspots + Tutorial
│   ├── cover-builder.js     # einheitliches Wordmark-Cover für alle Tiles
│   └── portrait.png         # Über-mich-Avatar
├── inhalte/                 # strukturierte Bio-Datenbasis (Markdown)
└── README.md
```

## Designprinzipien

- **Kühl-grauer Grundton** (`#A0A5B1`) mit zwei radialen Gradienten für Tiefe
- **Eigene Bildsprache** &mdash; keine fremden Assets, keine kopierten Layouts
- **Typografische Stille**: Inter (Display + Body), JetBrains Mono (Mono-Labels), nur ein Hero-Wort
- **Kontrast-bewusst**: alle Textfarben halten WCAG AA gegen den Grundton
- **Korn**: SVG-Noise-Overlay, `mix-blend-mode: overlay`, Opacity 0.5
- **Microscene**: Canvas-Partikelfeld mit Proximity-Lines + cursor-reaktivem Halo

## Performance

- Keine Frameworks
- Eine Schrift-Familie (Inter Variable) + Mono über Google Fonts mit `preconnect` und `font-display: swap`
- Canvas pausiert bei `document.hidden` und respektiert `prefers-reduced-motion`
- DPR-aware Canvas mit Cap auf 2&times;
- Keine Third-Party-Tracker, kein Cookie-Banner n&ouml;tig

## Passwort-Gate

Das Passwort ist `Portfolio`. Gepr&uuml;ft wird &uuml;ber `crypto.subtle.digest('SHA-256', ...)` gegen einen vorberechneten Hash in `assets/auth.js`. Bei Erfolg wird `sessionStorage.zz_portfolio_unlocked = "1"` gesetzt und auf `portfolio.html` weitergeleitet.

**Wichtig:** Das ist ein **Soft-Gate**, keine Sicherheitsgrenze. Es filtert Casual-Traffic, sch&uuml;tzt aber keine sensiblen Inhalte &mdash; wer Quelltext lesen kann, sieht den Hash und kann ein W&ouml;rterbuch fahren. Die Seite tr&auml;gt deshalb `noindex, nofollow`. Sensible Inhalte geh&ouml;ren niemals hinter einen Client-only-Gate.

## Smart-Cart-Drawer

Editorial-Demo eines Shopify-artigen Cart-Drawers mit Bundle-Logic, Cross-Sell und Live-bearbeitbarer Empfehlungs-Konfiguration.

- **Tutorial-Sequenz**: Sprechblase + Ghost-Highlight, User klickt selbst durch (Cross-Sell &rarr; Bundle)
- **Admin-Pane**: editierbare Empfehlungen (Name, Discount, Produkte), Auto-Save in `localStorage`, sofortige Reflektion im Customer-Cart &uuml;ber `syncCartFromAdmin()`
- **Never-empty-Garantie**: in Customer-View f&uuml;llt `ensureNonEmpty()` den Cart automatisch auf den Demo-Anfangszustand (1&times; Basis + Bubble &bdquo;01 &mdash; Cross-Sell&ldquo;) sobald er leer w&auml;re &mdash; durch Item-Remove, Qty 0, Admin-Sync oder Demo-Replay
- **Admin-Save &rarr; Customer-Reset**: nach jeder Admin-&Auml;nderung springt der Cart beim R&uuml;ckwechsel auf Demo-Start zur&uuml;ck, damit die neue Konfiguration sofort sichtbar wird

## Kontakt-Form

Zentral schwebender Dialog (`<dialog>` native), Mail-Zustellung &uuml;ber **Formsubmit.co** ohne Backend.

- Endpoint: `https://formsubmit.co/ajax/zikos.zissis@outlook.com`
- AJAX-Submit (kein Page-Redirect), In-Modal Success/Error-Status
- Honeypot (`_honey`) gegen Spam, Captcha deaktiviert (Form ist niedrigvolumig)
- Activation-Mail wurde einmalig best&auml;tigt; weitere Submissions laufen direkt durch
- Funktioniert nur &uuml;ber HTTPS-Origin (Formsubmit lehnt `file://` ab) &mdash; daher lokales Testen nur via `python3 -m http.server`

WhatsApp-CTA daneben f&uuml;hrt zu `https://wa.me/4915788280337` mit vorbef&uuml;lltem Text.

## Deploy

### Lokal testen

```bash
cd "/Users/zz/Desktop/Zikos Portfolio"
python3 -m http.server 4399
# → http://127.0.0.1:4399
```

`file://` reicht f&uuml;rs Layout-Pr&uuml;fen, aber nicht f&uuml;r das Kontakt-Form (Formsubmit blockt ohne Origin-Header).

### Render (aktuell live)

Repo enth&auml;lt `render.yaml` als Blueprint. Render erkennt es automatisch beim Connect.

1. Push auf `main` &rarr; Auto-Deploy auf https://zikos-portfolio.onrender.com/
2. Plan: **Hobby (legacy)**, $0/Monat (im Free-Kontingent: 100 GB Bandwidth, 750 Instance-Hours, 500 Pipeline-Minuten)
3. CDN-served &mdash; **kein Cold-Start**, l&auml;uft 24/7 ohne Idle-Timeout
4. Custom Domain optional unter Render Dashboard &rarr; Settings &rarr; Custom Domains

> Render migriert das Pricing am **2026-08-01**. Vorher kurz reinschauen, ob die Hobby-Plan-Regelung neu zugeordnet werden muss.

### Alternativen

- **Cloudflare Pages**: Repo connecten, Build command leer, Output directory `/`. F&uuml;gt in Rules &rarr; Headers HSTS / nosniff / Referrer-Policy hinzu.
- **Netlify / Vercel**: drag-drop oder Repo-Connect, identisch.

## Browser-Support

- Chrome/Edge &ge; 100
- Safari &ge; 15.4 (f&uuml;r `dvh`, `backdrop-filter`, native `<dialog>`)
- Firefox &ge; 100

## Lizenz & Urheberrecht

Aller Code in diesem Repository ist eigene Arbeit. Es werden **keine fremden Assets, Bilder oder Schriften au&szlig;erhalb der freien Google-Fonts-Lizenz** verwendet. Die &auml;sthetische Grundsprache (k&uuml;hles Grau, atmosph&auml;rische Partikel, Mono-Labels) ist allgemeines visuelles Vokabular zeitgen&ouml;ssischer Web-Designs und nicht urheberrechtlich gesch&uuml;tzt &mdash; es wurden keine Layouts, Texte oder Markenzeichen Dritter &uuml;bernommen.

## Stand

Erstellt 2026-05-05 &middot; live deployed 2026-05-06.
