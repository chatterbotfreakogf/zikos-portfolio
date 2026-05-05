# Eigene Projekte

Eigeninitiierte Projekte vom Schreibtisch. **Klar getrennt von Berufserfahrung.** Diese sind keine Anstellungen — es sind selbstgebaute Tools, Bewerbungs-Showcases und Prototypen.

---

## 1. Derivescope (vormals: Athenum Marketing)
- **Pfad:** `~/Desktop/Athenum Marketing/`
- **Art:** SEO-/Affiliate-getriebene Content-Site mit vollautomatisierter Pipeline
- **Domain (geplant):** derivescope.com
- **Affiliate-Partner:** Athenum (athenum.xyz, 30% recurring)
- **Stack:** Next.js 15 (apps/web), n8n (automation/workflows), Cloudflare Workers, Hetzner CAX11, Caddy, Supabase, MailerLite, Anthropic API mit Prompt-Caching
- **Pipeline:** n8n-Workflow → Firecrawl SERP-Scrape → Pattern-Mining (Claude Sonnet 4.6) → Deep Research → Draft (Sonnet 4.6) → Validator (Haiku 4.5, Hallucination-Check + E-E-A-T) → Next.js ISR
- **Daten:** tägliche Live-Refreshes von Binance/Bybit/Deribit, JSON-Snapshots
- **Status:** Phase 2A/2B prep, offline, nicht deployed
- **Strategie-Stand:** v2 locked 2026-05-02
- **Zielmonatskosten Steady-State:** ~€5–7/mo (+ Anthropic API on-demand)

## 2. Athenum X Content Generator (Tweet-Bot)
- **Pfad:** `~/Desktop/Athenum X Content Generator/`
- **Art:** Vollautomatisches lokales macOS-System: screenshottet Athenum-Charts → generiert Persona-Tweets via Claude → lokales Dashboard → Posting-Workflow auf X
- **Persona:** Pro-Trader, Power-User von Athenum, kein Marketer. Tweet-Regeln: keine Em-Dashes, keine Emojis, keine Hashtags, lowercase-Tendenz, max 6 Zeilen, Englisch.
- **Stack:** Python 3.11 · FastAPI 0.115 · Playwright/Patchright (Chromium) · SQLAlchemy 2 · Anthropic SDK 0.40 · Tweepy · React 18 + Vite + Tailwind + shadcn/ui · launchd
- **Knowledge-Layer:** 8 MD-Files (~100k Token System-Prompt), gecached
- **Trigger:** manuell · 2h-Cron · Event-Watcher (BTC/ETH-Bewegung > 3% in 1h, High-Impact-Events)
- **Reply-Suggestion-Modus:** on-demand (kein Auto-Posting), Patchright-Stealth, server-seitige Rate-Limits
- **Cost-Control:** harte Tages-/Stundenlimits, Default Haiku 4.5 (~$0.20/Tag)

## 3. Alpurial — Chatbot
- **Pfad:** `~/Desktop/Alpurial/Chatbot Alpurial/`
- **Art:** Bewerbungs-Showcase-Projekt (für Bewerbung bei Alpurial)
- **Komponenten:** Backend, Frontend, Dosierungsrechner, Likers/Mutuals-Analyse (JSON), Dashboard-Preview, Render-Deployment
- **Begleitdokument:** PROJEKT.md im Ordner

## 4. Alpurial — Projekt Dosierung
- **Pfad:** `~/Desktop/Alpurial/Projekt Dosierung/`
- **Art:** Dosierungs-Tool / Onboarding-Flow mit eigener Landing-Logik
- **Artefakte:** Designstände als PNG (landing, redesign-after-fix, recalibrated, mail-preview, no-scroll-step1/2, final-plan)

## 5. Alpurial — Projekt Warenkorb
- **Pfad:** `~/Desktop/Alpurial/Projekt Warenkorb/`
- **Art:** Smart-Cart-Widget / Pitch-Prototyp
- **Stack-Hinweise:** statisches Frontend (HTML/CSS/JS) + Python-Server (`server.py`) + Pitch-Deck als HTML
- **Zustand:** lauffähig via `Start Server.command`

## 6. Nailmondo — Chatbot
- **Pfad:** `~/Desktop/Nailmondo/Chatbot Nailmondo/`
- **Art:** Bewerbungs-Showcase mit Live-Demo (Shopify-Embed via `install-script-tag.js`)
- **Belege:** Screenshots demo-/live-Phasen (initial, modal, drawer, after-cart, final)
- **Komponenten:** Backend, Frontend, Skript-Injektion

## 7. Nailmondo — n8n Prototyp
- **Pfad:** `~/Desktop/Nailmondo/n8n prototyp/`
- **Art:** n8n-Workflow + Shopify-MCP-Anbindung
- **Artefakte:** workflow.js, workflow-v2-canvas.png, mcp-client.js, get-shopify-token.js, RUNBOOK.md, PROJEKT.md, morning-prep.sh

## 8. Nailmondo — Projekt Warenkorb
- **Pfad:** `~/Desktop/Nailmondo/Projekt Warenkorb/`
- **Art:** Warenkorb-Erweiterung für Shopify (parallel zu Alpurial-Warenkorb, andere Codebasis)

## 9. Nailmondo — Klaviyo
- **Pfad:** `~/Desktop/Nailmondo/klaviyo/`
- **Art:** Klaviyo-Flows-Konfiguration / Templates für die Bewerbung

## 10. KI Projekt — ChatbotOS
- **Pfad:** `~/Desktop/KI Projekt/`
- **Art:** Chatbot-Betriebssystem (eigenständige Konzept-/Tool-Studie)
- **Artefakte:** ChatbotOS_Dokumentation.html, ChatbotOS.command (Launcher), THREAT_MODEL_Bot_Detection_2026.md

## 11. Veloto / Max Homepage
- **Pfad:** `~/Desktop/Max Homepage Veloto/`
- **Art:** Statische Website (deploy-fertig, mit `site/` als Build, Sitemap, Robots, Datenschutz, Impressum)
- **Tooling:** Firecrawl als Scrape-Quelle, Git-Repository

## 12. Krasse Website
- **Pfad:** `~/Desktop/Krasse Website/`
- **Art:** Showcase-/Hero-Mockups (JPEG-Stills: hero v1/v2/v3, showcase-bottom/mid/outro/boot)
- **Status:** rein visuelle Konzeptstudie, kein Code

## 13. Berger — Bewerbungs-Showcase
- **Pfad:** `~/Desktop/Berger/`
- **Art:** Bewerbungsmappe mit Begleitprojekt
- **Artefakte:** KI-Chatbot_Zikos_Zissis.pdf · Songcover SUIT.png · SUIT.wav (Audioproduktion?)
- **Hinweis:** Songcover und WAV deuten auf eine begleitende Sound-/Branding-Komponente hin.

## 14. Bewerbungs-Begleitseiten („Interview"-Pakete)
Vorbereitungsmaterial für Vorstellungsgespräche, technisch als HTML-Dossiers gebaut:
- `~/Desktop/Alpurial Interview/` — A/B-Testing-Crashkurs, Conversion-Weisheiten, Tools-Dashboard-Guide, Teamstruktur, Interview-Vorbereitung
- `~/Desktop/Nailmondo interview/` — Architektur, Crashkurs n8n/Make/Klaviyo, Masterplan, Spickzettel
- `~/Desktop/AstorMuller/portfolio_assets/` — Portfolio-Assets-Sammlung

---

## Patterns über alle Projekte hinweg

- **Stack-Signatur:** Shopify · n8n · Claude Code · Python · Next.js · Playwright · Cloudflare · Anthropic API mit Prompt-Caching
- **Wiederkehrendes Thema:** Conversion-Optimierung, Chatbot-Architektur, Workflow-Automatisierung, Bewerbungs-Showcase-Bau
- **Eigenanteil:** Vom Konzept bis Deploy alles eigenständig — Backends, Frontends, Pipelines, Doku, Launcher
