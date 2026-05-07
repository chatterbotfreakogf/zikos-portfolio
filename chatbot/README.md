# Zikos · Karriere-Chatbot

Hybrid Button-Flows + KI-Freitext über Zikos' Lebenslauf, Stationen, Skills und Projekte. Architektur 1:1 vom Lynis-Nailshop-Bot übernommen, Domäne tauschend (Produkte → CV).

## Architektur

```
chatbot/
├── backend/
│   ├── app.py              # FastAPI Server (Port 8091 lokal, 10000 auf Render)
│   ├── chat_engine.py      # Button-Flows + KI-Freitext
│   ├── ai_client.py        # Featherless.ai (Qwen2.5-72B) + Keyword-Fallback
│   └── session_store.py    # JSON-Session-Persistenz
├── frontend/
│   ├── index.html          # Demo-Seite
│   ├── chatbot-widget.js   # Einbettbares Widget (Vanilla, ~7 KB)
│   ├── chatbot-widget.css  # Cool-Grey + Paper-Off-White Branding
│   └── chatbot-loader.js   # Auto-Init via Script-Tag
├── data/
│   ├── cv.json             # Strukturierter Lebenslauf
│   ├── flows.json          # Button-Flows (Recruiter-Pfade)
│   └── system_prompt.txt   # KI-System-Prompt
├── sessions/               # Session-Logs (gitignored)
├── render.yaml             # One-Click-Deploy auf Render
├── requirements.txt
├── .env                    # FEATHERLESS_API_KEY (gitignored)
└── README.md
```

## Lokal starten

```bash
cd "Zikos Portfolio/chatbot"
python3 -m pip install -r requirements.txt
cd backend && python3 app.py     # http://localhost:8091
```

Demo unter [http://localhost:8091](http://localhost:8091) — Widget unten rechts.

## Einbindung im Portfolio

`portfolio.html` lädt das Widget per Loader (siehe `assets/zzbot-init.js` oder direkt am Seitenende):

```html
<script src="http://localhost:8091/widget/chatbot-loader.js" async></script>
```

In Production zeigt der `src` auf die Render-URL (z. B. `https://zikos-karriere-chatbot.onrender.com/widget/chatbot-loader.js`).

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

- Provider: Featherless.ai (OpenAI-kompatibel)
- Modell: `Qwen/Qwen2.5-72B-Instruct`
- Fallback (ohne API-Key): Keyword-Logik in `ai_client._fallback_response`
- Output-Filter: kein Englisch, keine Emojis, Bachelor-Note redacted

## CV-Daten anpassen

`data/cv.json` ist die **einzige Quelle** für Profil, Stationen, Skills, Projekte. Änderungen dort:

1. JSON aktualisieren
2. `data/flows.json` für neue Button-Pfade ergänzen (optional)
3. Server neu starten (in-memory Caching des System-Prompts)

## Deploy auf Render

```bash
# .env in Render-Dashboard:
#   FEATHERLESS_API_KEY=fw_...
#   RENDER_EXTERNAL_URL=https://zikos-karriere-chatbot.onrender.com
git push render main
```

`render.yaml` ist vorbereitet (Frankfurt-Region, Free-Plan).
