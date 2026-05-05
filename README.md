# Zikos Zissis — Portfolio

Statische Landing-Page mit Passwort-Gate. Kein Build-Step. Reines HTML/CSS/JS.

## Struktur

```
.
├── index.html          # Gate (Login)
├── portfolio.html      # Bereich hinter dem Gate (Platzhalter)
├── assets/
│   ├── style.css       # vollständige Stilebene
│   ├── scene.js        # ambient canvas (Partikel + Cursor-Halo)
│   └── auth.js         # SHA-256 Soft-Gate
├── inhalte/            # strukturierte Bio-Datenbasis (Markdown)
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

- Keine Frameworks. ~12 KB CSS &middot; ~5 KB Scene-JS &middot; ~3 KB Auth-JS
- Eine Schrift-Familie (Inter Variable) + Mono über Google Fonts mit `preconnect` und `font-display: swap`
- Canvas pausiert bei `document.hidden` und respektiert `prefers-reduced-motion`
- DPR-aware Canvas mit Cap auf 2&times;
- Keine Third-Party-Tracker, kein Cookie-Banner nötig
- Erwartetes Lighthouse Mobile: 99–100 in allen vier Kategorien

## Passwort-Gate

Das Passwort ist `Portfolio`. Geprüft wird über `crypto.subtle.digest('SHA-256', ...)` gegen einen vorberechneten Hash in `assets/auth.js`. Bei Erfolg wird `sessionStorage.zz_portfolio_unlocked = "1"` gesetzt und auf `portfolio.html` weitergeleitet.

**Wichtig:** Das ist ein **Soft-Gate**, keine Sicherheitsgrenze. Es filtert Casual-Traffic, schützt aber keine sensiblen Inhalte &mdash; wer Quelltext lesen kann, sieht den Hash und kann ein Wörterbuch fahren. Die Seite trägt deshalb `noindex, nofollow`. Sensible Inhalte gehören niemals hinter einen Client-only-Gate.

Wenn echte Auth nötig wird:
- Cloudflare Access (kostenlos für persönliche Domains, OTP per E-Mail)
- Basic-Auth via Cloudflare Worker
- Edge-Function vor dem Static-Asset

## Deploy

### Lokal testen

```bash
cd "/Users/zz/Desktop/Zikos Portfolio"
python3 -m http.server 4399
# → http://127.0.0.1:4399
```

### Cloudflare Pages

1. Repo nach GitHub pushen.
2. In Cloudflare Pages → Connect repository.
3. Build command: *leer*. Output directory: `/`. Fertig.
4. Custom Domain (z. B. `zikoszissis.com`) zuweisen.
5. In Cloudflare → Rules → Headers folgende Security-Header hinzufügen:
   ```
   Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
   X-Content-Type-Options: nosniff
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: camera=(), microphone=(), geolocation=()
   ```

## Browser-Support

- Chrome/Edge ≥ 100
- Safari ≥ 15.4 (für `dvh`, `backdrop-filter`)
- Firefox ≥ 100

## Lizenz & Urheberrecht

Aller Code in diesem Repository ist eigene Arbeit. Es werden **keine fremden Assets, Bilder oder Schriften außerhalb der freien Google-Fonts-Lizenz** verwendet. Die ästhetische Grundsprache (kühles Grau, atmosphärische Partikel, Mono-Labels) ist allgemeines visuelles Vokabular zeitgenössischer Web-Designs und nicht urheberrechtlich geschützt &mdash; es wurden keine Layouts, Texte oder Markenzeichen Dritter übernommen.

## Stand

Erstellt 2026-05-05.
