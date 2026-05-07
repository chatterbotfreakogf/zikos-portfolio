"""
ChatEngine — Hybrid Button-Flows + KI-Freitext.
Domäne: Recruiter-Dialog über Zikos Zissis.
"""

import json
from pathlib import Path
from ai_client import ask_ai
from session_store import load_session, save_session


DATA_DIR = Path(__file__).parent.parent / "data"


def load_flows() -> dict:
    flows_path = DATA_DIR / "flows.json"
    with open(flows_path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_cv() -> dict:
    cv_path = DATA_DIR / "cv.json"
    with open(cv_path, "r", encoding="utf-8") as f:
        return json.load(f)


class ChatEngine:

    def __init__(self):
        self.flows = load_flows()
        self.cv = load_cv()

    async def get_welcome(self) -> dict:
        return {
            "reply": self.flows["welcome"]["message"],
            "buttons": self.flows["welcome"]["buttons"],
            "source": "flow",
        }

    async def handle_message(self, session_id: str, message: str, button_action: str) -> dict:
        session = load_session(session_id)

        if button_action:
            result = await self._handle_button(session, button_action)
            session["metadata"]["flow_interactions"] += 1
        elif message:
            result = await self._handle_freetext(session, message)
        else:
            result = await self.get_welcome()

        session["metadata"]["messages_count"] += 1
        save_session(session_id, session)
        return result

    async def _handle_button(self, session: dict, action: str) -> dict:
        if action in ("main_menu", "welcome"):
            session["current_flow"] = None
            session["flow_step"] = 0
            return await self.get_welcome()

        if action in self.flows:
            flow = self.flows[action]
            session["current_flow"] = action
            session["flow_step"] = 0
            buttons = list(flow.get("buttons", []))
            if action != "welcome":
                buttons.append({"label": "Hauptmenü", "action": "main_menu"})
            return {
                "reply": flow["message"],
                "buttons": buttons,
                "source": "flow",
            }

        return await self._handle_freetext(session, f"Der Nutzer hat '{action}' ausgewählt.")

    async def _handle_freetext(self, session: dict, message: str) -> dict:
        session["history"].append({"role": "user", "content": message})
        ai_reply = await ask_ai(session["history"])
        session["history"].append({"role": "assistant", "content": ai_reply})
        session["metadata"]["ai_calls"] += 1

        if len(session["history"]) > 30:
            session["history"] = session["history"][-30:]

        return {
            "reply": ai_reply,
            "buttons": [{"label": "Hauptmenü", "action": "main_menu"}],
            "source": "ai",
        }
