"""
Zikos Zissis · Karriere-Chatbot — Backend Server (FastAPI).
Architektur 1:1 vom Lynis-Bot übernommen, Domäne: Lebenslauf statt Shop.
Ziel: Recruiter/HR können den Bot zu Profil, Stationen, Skills und Verfügbarkeit befragen.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import os
import asyncio
import httpx

load_dotenv(Path(__file__).parent.parent / ".env")

from chat_engine import ChatEngine
from session_store import list_sessions, get_session_stats


async def keep_alive():
    """Self-Ping alle 10 Min, damit Render Free-Tier nicht einschläft.
    URL wird automatisch aus RENDER_EXTERNAL_HOSTNAME (Render-injected) hergeleitet."""
    url = os.getenv("RENDER_EXTERNAL_URL", "")
    if not url:
        host = os.getenv("RENDER_EXTERNAL_HOSTNAME", "")
        if host:
            url = f"https://{host}"
    if not url:
        return
    while True:
        await asyncio.sleep(600)  # 10 Min — sicher unter Render-15-Min-Idle
        try:
            async with httpx.AsyncClient() as client:
                await client.get(f"{url}/health", timeout=15)
                print(f"[keep-warm] self-ping OK ({url})")
        except Exception as e:
            print(f"[keep-warm] self-ping failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(keep_alive())
    yield
    task.cancel()


app = FastAPI(title="Zikos Karriere-Chatbot", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
app.mount("/widget", StaticFiles(directory=str(FRONTEND_DIR)), name="widget")

engine = ChatEngine()


class ChatRequest(BaseModel):
    session_id: str
    message: str = ""
    button_action: str = ""


class ChatResponse(BaseModel):
    reply: str
    buttons: list[dict] = []
    source: str = ""


@app.get("/")
async def root():
    return FileResponse(
        FRONTEND_DIR / "index.html",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "zikos-karriere-chatbot"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    return await engine.handle_message(
        session_id=req.session_id,
        message=req.message,
        button_action=req.button_action,
    )


@app.get("/sessions")
async def sessions():
    return {"sessions": list_sessions()}


@app.get("/stats")
async def stats():
    return get_session_stats()


@app.websocket("/ws/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    await websocket.accept()
    try:
        welcome = await engine.get_welcome()
        await websocket.send_json(welcome)
        while True:
            data = await websocket.receive_json()
            result = await engine.handle_message(
                session_id=session_id,
                message=data.get("message", ""),
                button_action=data.get("button_action", ""),
            )
            await websocket.send_json(result)
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8091))
    print(f"\n  Zikos · Karriere-Chatbot")
    print(f"  ========================")
    print(f"  URL: http://localhost:{port}")
    print()
    uvicorn.run(app, host="0.0.0.0", port=port)
