# Zikos · Karriere-Chatbot

Hybrid Button-Flows + KI-Freitext über Zikos' Lebenslauf, Stationen, Skills und Projekte. Architektur 1:1 vom Lynis-Nailshop-Bot übernommen, Domäne tauschend (Produkte → CV).

## Architektur

```
chatbot/
├── backend/
│   ├── app.py              # FastAPI Server (Port 8091 lokal, 10000 auf Render)
│   ├── chat_engine.py      # Button-Flows + KI-Freitext
│   ├── ai_client.py        # Google Gemini (OpenAI-kompat.) + Keyword-Fallback
│   └── session_store.py    # JSON-Session-Persistenz
├── frontend/
│   ├── index.html          # Demo-Seite
│   ├── chatbot-widget.js   # Einbettbares Widget (Vanilla, ~7 KB)
│   ├── chatbot-widget.css  # Cool-Grey + Paper-Off-White Branding
│   ├── chatbot-loader.js   # Auto-Init via Script-Tag
│   └── portrait.png        # Avatar-Fallback (Portfolio nutzt assets/portrait.png)
├── data/
│   ├── cv.json             # Strukturierter Lebenslauf (alleinige Quelle)
│   ├── flows.json          # Button-Flows (Recruiter-Pfade, Ich-Form)
│   └── system_prompt.txt   # KI-System-Prompt (Ich-Form, Note-Redaction)
├── sessions/               # Session-Logs (gitignored, ephemeral auf Render)
├── requirements.txt
├── .env                    # GOOGLE_API_KEY (gitignored)
└── README.md
```

Render Blueprint: siehe `../render.yaml` (auf Repo-Root, deployt Portfolio + Bot zusammen).

## Lokal starten

```bash
cd "Zikos Portfolio/chatbot"
python3 -m pip install -r requirements.txt
cd backend && python3 app.py     # http://localhost:8091
```

`portfolio.html` lokal öffnen (mit `python3 -m http.server 8765` aus dem Portfolio-Root) — das Widget verbindet sich automatisch gegen `localhost:8091`, wenn die Domain nicht `*.onrender.com` ist.

## Production-Deploy auf Render

**1. Erste Einrichtung (einmalig, ~5 Min):**

```
Render Dashboard → Blueprints → New Blueprint Instance
→ GitHub-Repo wählen (chatterbotfreakogf/zikos-portfolio)
→ Render erkennt render.yaml im Root und schlägt 2 Services vor:
   - zikos-portfolio (static, ist schon deployed)
   - zikos-karriere-chatbot (web service, neu)
→ Apply
```

**2. Env-Var setzen** (im neuen `zikos-karriere-chatbot`-Service):

| Key | Value |
|---|---|
| `GOOGLE_API_KEY` | dein Gemini-Key aus aistudio.google.com/apikey |

`PORT` und `RENDER_EXTERNAL_HOSTNAME` werden von Render automatisch injiziert.

**3. Verifizieren:**

```bash
curl https://zikos-karriere-chatbot.onrender.com/health
# → {"status":"ok","service":"zikos-karriere-chatbot"}
```

**4. Portfolio:** keine Änderung nötig — `portfolio.html` zeigt automatisch auf `https://zikos-karriere-chatbot.onrender.com`, sobald die Seite von `*.onrender.com` ausgeliefert wird.

## Always-On

Render **Free Tier** schläft nach 15 Min Inaktivität ein. Drei Layer halten den Bot wach:

1. **Internes Self-Ping** (in `app.py`): alle 10 Min ein `GET /health`. Aktiviert sich automatisch, sobald `RENDER_EXTERNAL_HOSTNAME` gesetzt ist (von Render injiziert).
2. **GitHub Actions Cron** (`.github/workflows/keep-warm.yml`): alle 10 Min ein externer Ping als Backup.
3. **Storefront-Traffic** (Recruiter-Besuche): jeder Page-Load triggert auch einen Bot-Init.

Realistisch: ~99 % Always-On. Im Worst Case (Render-Maintenance, lange Idle-Phase) ein 20–30 Sek Cold-Start. **Für 100 % garantiert always-on:** Render-Plan auf **Starter ($7/mo)** upgraden — kein Idle-Spin-Down.

## Endpoints

| Methode | Pfad             | Zweck                 |
|---------|------------------|-----------------------|
| GET     | /                | Demo-Seite            |
| GET     | /health          | Health-Check          |
| POST    | /chat            | Chat-API (JSON)       |
| GET     | /sessions        | Admin-Übersicht       |
| GET     | /stats           | Sessions/Messages-Counter |
| WS      | /ws/{session_id} | WebSocket-Chat        |
| GET     | /widget/*        | Statisches Frontend   |

## KI-Modell

- Provider: Google Gemini (OpenAI-kompatibel via `https://generativelanguage.googleapis.com/v1beta/openai/`)
- Primary: `gemini-2.5-flash-lite` (~$0.10/$0.40 per 1M Tokens — ~$0.0005/Antwort)
- Auto-Fallback: `gemini-2.5-flash` bei Rate-Limit/Server-Error
- Offline-Fallback: Keyword-Logik in `ai_client._fallback_response`
- Output-Filter: kein Englisch, keine Emojis, Bachelor-Note redacted

## CV-Daten anpassen

`data/cv.json` ist die **einzige Quelle** für Profil, Stationen, Skills, Projekte. Änderungen dort:

1. JSON aktualisieren
2. `data/flows.json` für neue Button-Pfade ergänzen (optional)
3. Push → Render redeployt automatisch
