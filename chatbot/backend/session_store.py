"""
Session-Store — JSON-Persistenz pro Session.
"""

import json
from datetime import datetime
from pathlib import Path


SESSIONS_DIR = Path(__file__).parent.parent / "sessions"
SESSIONS_DIR.mkdir(exist_ok=True)


def _session_path(session_id: str) -> Path:
    safe_id = "".join(c for c in session_id if c.isalnum() or c in "_-")
    return SESSIONS_DIR / f"{safe_id}.json"


def load_session(session_id: str) -> dict:
    path = _session_path(session_id)

    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    session = {
        "session_id": session_id,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "history": [],
        "current_flow": None,
        "flow_step": 0,
        "metadata": {
            "messages_count": 0,
            "ai_calls": 0,
            "flow_interactions": 0,
        },
    }
    save_session(session_id, session)
    return session


def save_session(session_id: str, session: dict):
    session["updated_at"] = datetime.now().isoformat()
    path = _session_path(session_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(session, f, ensure_ascii=False, indent=2)


def list_sessions() -> list[dict]:
    sessions = []
    for file in SESSIONS_DIR.glob("*.json"):
        with open(file, "r", encoding="utf-8") as f:
            data = json.load(f)
            sessions.append({
                "session_id": data.get("session_id", file.stem),
                "created_at": data.get("created_at", ""),
                "updated_at": data.get("updated_at", ""),
                "messages_count": data.get("metadata", {}).get("messages_count", 0),
            })
    return sessions


def get_session_stats() -> dict:
    files = list(SESSIONS_DIR.glob("*.json"))
    total_messages = 0
    total_ai_calls = 0
    for file in files:
        with open(file, "r", encoding="utf-8") as f:
            data = json.load(f)
            meta = data.get("metadata", {})
            total_messages += meta.get("messages_count", 0)
            total_ai_calls += meta.get("ai_calls", 0)
    return {
        "total_sessions": len(files),
        "total_messages": total_messages,
        "total_ai_calls": total_ai_calls,
    }
