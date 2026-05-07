"""
AI Client — Featherless.ai (OpenAI-kompatibel) für den Recruiter-Dialog.
Fallback: Keyword-basierte CV-Treffer aus cv.json (offline-fähig).
"""

import os
import re
import json
from pathlib import Path

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


DATA_DIR = Path(__file__).parent.parent / "data"
SYSTEM_PROMPT_PATH = DATA_DIR / "system_prompt.txt"
CV_PATH = DATA_DIR / "cv.json"

LLM_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
LLM_MODEL = "gemini-2.5-flash-lite"
LLM_MODEL_FALLBACK = "gemini-2.5-flash"


def load_system_prompt() -> str:
    if SYSTEM_PROMPT_PATH.exists():
        return SYSTEM_PROMPT_PATH.read_text(encoding="utf-8").strip()
    return "Du bist der Karriere-Bot von Zikos Zissis."


def load_cv_knowledge() -> str:
    if not CV_PATH.exists():
        return ""

    with open(CV_PATH, "r", encoding="utf-8") as f:
        cv = json.load(f)

    lines = ["\n\nLEBENSLAUF-DATENBANK (nutze diese als alleinige Quelle):"]

    p = cv.get("profil", {})
    lines.append(f"\n## PROFIL")
    lines.append(f"- Name: {p.get('name','')}")
    lines.append(f"- Standort: {p.get('standort','')}")
    lines.append(f"- Verfuegbarkeit: {p.get('verfuegbarkeit','')}")
    lines.append(f"- Selbstbezeichnung: {p.get('selbstbezeichnung','')}")
    lines.append(f"- Identitaets-Anker: {', '.join(p.get('anker', []))}")

    lines.append("\n## BERUFLICHE STATIONEN")
    for s in cv.get("stationen", []):
        lines.append(
            f"- {s['zeitraum']} · {s['firma']} · {s['rolle']} ({s.get('modus','')}). "
            f"Schwerpunkte: {', '.join(s.get('schwerpunkte', []))}. "
            f"Kennzahlen: {s.get('kennzahlen','—')}"
        )

    lines.append("\n## BILDUNG")
    for b in cv.get("bildung", []):
        lines.append(f"- {b['zeitraum']} · {b['institution']} · {b['abschluss']} ({b.get('status','')})")

    lines.append("\n## SKILLS")
    for kategorie, items in cv.get("skills", {}).items():
        lines.append(f"- {kategorie}: {', '.join(items)}")

    lines.append("\n## EIGENE PROJEKTE (Auswahl)")
    for pr in cv.get("projekte", []):
        lines.append(f"- {pr['name']} — {pr['kurz']}")

    lines.append("\n## SPRACHEN")
    for sp in cv.get("sprachen", []):
        lines.append(f"- {sp['sprache']}: {sp['niveau']}")

    lines.append("\n## ZEUGNIS-ZITATE")
    for z in cv.get("zeugnis_zitate", []):
        lines.append(f"- {z['quelle']}: \"{z['zitat']}\"")

    lines.append("\n## KONTAKT")
    k = cv.get("kontakt", {})
    lines.append(f"- E-Mail: {k.get('mail','')}")
    lines.append(f"- Telefon: {k.get('telefon','')}")
    lines.append(f"- WhatsApp: {k.get('whatsapp','')}")

    return "\n".join(lines)


_system_prompt_cache = None


def get_full_system_prompt() -> str:
    global _system_prompt_cache
    if _system_prompt_cache is None:
        _system_prompt_cache = load_system_prompt() + load_cv_knowledge()
    return _system_prompt_cache


async def ask_ai(history: list[dict]) -> str:
    system_prompt = get_full_system_prompt()
    if HAS_OPENAI and os.getenv("GOOGLE_API_KEY", ""):
        return _ask_gemini(system_prompt, history)
    return _fallback_response(history)


def _clean_reply(reply: str) -> str:
    if "</think>" in reply:
        reply = reply.split("</think>")[-1].strip()
    if "<think>" in reply:
        reply = re.sub(r"<think>.*?</think>", "", reply, flags=re.DOTALL).strip()

    reply = re.sub(r"^System:\s*", "", reply, flags=re.MULTILINE)
    reply = re.sub(r"^Assistant:\s*", "", reply, flags=re.MULTILINE)
    lines = [l for l in reply.split("\n") if not l.strip().startswith("User:")]
    reply = "\n".join(lines)

    reply = _keep_only_german(reply)

    reply = re.sub(r"^(Okay|OK|Sure|Alright|Well),?\s*", "", reply, flags=re.IGNORECASE)

    paragraphs = reply.split("\n\n")
    seen = []
    seen_starts = []
    for p in paragraphs:
        p_clean = p.strip()
        if not p_clean:
            continue
        start = p_clean[:50]
        if start in seen_starts:
            continue
        seen.append(p_clean)
        seen_starts.append(start)
    reply = "\n\n".join(seen)

    reply = re.sub(
        r"[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF"
        r"\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U0001F900-\U0001F9FF"
        r"\U00002600-\U000026FF\U00002300-\U000023FF]+",
        "",
        reply,
    )

    reply = _redact_grade(reply)
    return reply.strip()


def _redact_grade(text: str) -> str:
    """Bachelor-Note 2,3 niemals im Frontend rendern (Memory-Regel).
    Ersetzt explizite Note-Erwähnungen durch generische Formulierung."""
    text = re.sub(
        r"(Note|Gesamtnote|Abschlussnote)\s*[:\-]?\s*(gut\s*\(?\s*)?2[,.]3\)?",
        "BWL-Bachelor (HfWU Nürtingen)", text, flags=re.IGNORECASE,
    )
    text = re.sub(r"\b2[,.]3\b\s*\(?gut\)?", "guter BWL-Abschluss", text, flags=re.IGNORECASE)
    text = re.sub(r"\bgut\s*\(\s*2[,.]3\s*\)", "BWL-Abschluss", text, flags=re.IGNORECASE)
    return text


def _keep_only_german(text: str) -> str:
    lines = text.split("\n")
    result = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if result:
                result.append(line)
            continue
        if len(stripped) < 15 and result:
            result.append(line)
            continue
        if _is_english_line(stripped):
            continue
        result.append(line)
    return "\n".join(result).strip()


def _is_english_line(line: str) -> bool:
    lower = line.lower().strip()
    if re.match(
        r"^(okay|ok|let me|first|wait|i (should|need|will|can|must|remember)|"
        r"the user|check|so |also |avoid|final|however|now|looking|since|but |"
        r"hmm|next|maybe|this |that |from |based on|make sure|observing)",
        lower,
    ):
        return True
    en_words = ["the ", "and ", "for ", "with ", "should ", "need ", "user ",
                "check ", "also ", "that ", "this ", "have ", "will ", "which ",
                "then ", "might ", "would ", "could ", "because ", "about "]
    de_words = ["die ", "der ", "das ", "und ", "fuer ", "für ", "mit ",
                "ich ", "zikos", "lebenslauf", "decathlon", "shopify",
                "jahre", "remote", "bei ", "ein ", "kann ",
                "ist ", "hier", "er ", "sein"]
    en_count = sum(1 for w in en_words if w in lower)
    de_count = sum(1 for w in de_words if w in lower)
    return en_count >= 3 and en_count > de_count * 2


def _ask_gemini(system_prompt: str, history: list[dict]) -> str:
    """Google Gemini via OpenAI-kompatiblen Endpoint.
    Primary: gemini-2.5-flash-lite (billigst, schnellst).
    Fallback bei Rate-Limit/Server-Error: gemini-2.5-flash."""
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        return _fallback_response(history)

    client = OpenAI(api_key=api_key, base_url=LLM_URL, timeout=25.0)
    messages = [{"role": "system", "content": system_prompt}] + history

    for model in (LLM_MODEL, LLM_MODEL_FALLBACK):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=500,
                temperature=0.5,
            )
            reply = response.choices[0].message.content or ""
            cleaned = _clean_reply(reply)
            if (not cleaned
                or len(cleaned) < 10
                or "DEINE AUFGABE:" in cleaned
                or "LEBENSLAUF-DATENBANK" in cleaned
                or "REGELN:" in cleaned):
                continue
            return cleaned
        except Exception as e:
            print(f"[AI ERROR · {model}] {e}")
            continue

    return _fallback_response(history)


def _fallback_response(history: list[dict]) -> str:
    """Offline-Fallback: einfache Keyword-Treffer auf cv.json. Antworten in Ich-Form."""
    if not CV_PATH.exists():
        return "Hallo, ich bin Zikos. Fragen Sie mich gerne zu Profil, Stationen, Skills oder Verfügbarkeit."

    with open(CV_PATH, "r", encoding="utf-8") as f:
        cv = json.load(f)

    last_msg = history[-1]["content"].lower() if history else ""

    if any(w in last_msg for w in ["verfügbar", "verfuegbar", "ab wann", "start", "kündigung", "kuendigung"]):
        p = cv.get("profil", {})
        return (
            "Ich bin ab sofort verfügbar. Mein Master Digital Business läuft komplett remote und "
            "zeitflexibel (Abende/Wochenenden) — volle 40 Stunden für den Job sind garantiert.\n\n"
            f"Standort: {p.get('standort','Plochingen, DE')}. 100 % Remote-erprobt seit über 5 Jahren."
        )

    if any(w in last_msg for w in ["gehalt", "lohn", "salary", "vergütung", "verguetung"]):
        return (
            "Zur Gehaltsvorstellung klären wir das gern direkt — rollen- und scope-spezifisch. "
            "Kontakt: zikos.zissis@outlook.com oder WhatsApp +49 174 9247044."
        )

    if any(w in last_msg for w in ["decathlon", "fitness", "category", "ocm"]):
        return (
            "Bei Decathlon Deutschland war ich von 04/2023 bis 10/2025 Junior Online Category Manager "
            "für Fitness DE/AT und Nutrition (30 h, 100 % Remote). Operative Steuerung von 14.000+ SKUs, "
            "Sportnahrungs-Relaunch, A/B-Tests an PDP und Checkout, KPI-Monitoring via GA4/Looker, "
            "Hands-on im CMS/PIM sowie Code-Pflege auf decathlon.at (HTML/CSS).\n\n"
            "Davor 6 Monate Praktikum am gleichen Standort (10/2022–03/2023, nahtloser Übergang). "
            "Arbeitszeugnis: gut."
        )

    if any(w in last_msg for w in ["fischer", "möbel", "moebel"]):
        return (
            "Bei Fischer Möbel (D2C-Premium) habe ich von 02/2018 bis 09/2022 als Aushilfe im E-Commerce "
            "Produktdaten gepflegt, SEO-Keyword-Recherche gemacht und technische Produktdokumentationen "
            "erstellt. Arbeitszeugnis: sehr gut."
        )

    if any(w in last_msg for w in ["athenum", "macro", "intelligence", "geo"]):
        return (
            "Aktuelle Freelance-Station (12/2025–04/2026, unentgeltlich): ich bin Solution Architect "
            "für die Macro-Intelligence-Karte von athenum.xyz — 75 Geo-Layer aus 12 offenen Quellen auf "
            "einer GPU-nativen Welt-Karte. Konzept, Daten-Pipeline und Frontend habe ich selbst gebaut."
        )

    if any(w in last_msg for w in ["skill", "stack", "tools", "tech"]):
        skills = cv.get("skills", {})
        parts = []
        for cat, items in list(skills.items())[:4]:
            parts.append(f"**{cat}**: {', '.join(items[:6])}")
        return "Mein Kern-Stack:\n\n" + "\n".join(parts) + "\n\nFür Details klicken Sie auf „Skills & Stack“ im Hauptmenü."

    if any(w in last_msg for w in ["studium", "bachelor", "master", "ausbildung", "bildung"]):
        return (
            "Mein Ausbildungsweg: Staatlich geprüfter Assistent IKT (Max-Eyth-Schule, 10/2017–02/2020) → "
            "BWL-Bachelor an der HfWU Nürtingen-Geislingen (02/2020–10/2024, Schwerpunkt Digital Business) "
            "→ aktuell Master Digital Business & Management an der HS Sigmaringen (02/2025–02/2027, "
            "remote, zeitflexibel)."
        )

    if any(w in last_msg for w in ["kontakt", "mail", "telefon", "erreich", "whatsapp"]):
        k = cv.get("kontakt", {})
        return (
            f"Direkter Draht:\n"
            f"- E-Mail: {k.get('mail','zikos.zissis@outlook.com')}\n"
            f"- Telefon: {k.get('telefon','+49 174 9247044')}\n"
            f"- WhatsApp: {k.get('whatsapp','+49 174 9247044')}\n\n"
            "Antwort meist binnen 24 Stunden."
        )

    return (
        "Ich beantworte gern Fragen zu meinen Stationen (Decathlon, Fischer, Athenum), zu Skills & Stack, "
        "zu eigenen Projekten oder zur Verfügbarkeit. Klicken Sie einen Button im Hauptmenü oder schreiben "
        "Sie direkt, was Sie wissen möchten."
    )
