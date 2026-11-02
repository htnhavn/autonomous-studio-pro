"""
@file main.py
@description FastAPI + WebSocket Hub & Embedded MCP Server for Autonomous Studio Pro.
Connects Desktop UI directly to the AI Film Crew and hardware acceleration pipelines.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents.director_crew import AutonomousFilmCrewOrchestrator
from mcp_server import EmbeddedMCPServer

app = FastAPI(
    title="Autonomous Studio Pro • AI Sidecar Engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        payload = json.dumps(message)
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.active_connections.discard(d)


manager = ConnectionManager()
orchestrator = AutonomousFilmCrewOrchestrator(broadcast_event=manager.broadcast)
mcp = EmbeddedMCPServer(orchestrator=orchestrator)


class MCPRequest(BaseModel):
    tool: str
    arguments: Dict[str, Any] = {}


class JobRequest(BaseModel):
    topicOrPrompt: str
    aspectRatio: str = "16:9"
    targetDurationSeconds: int = 60
    autoUploadToYouTube: bool = False


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    return {
        "status": "online",
        "service": "Autonomous Studio Pro Sidecar",
        "activeWebSocketClients": len(manager.active_connections),
    }


@app.post("/api/v1/mcp")
async def handle_mcp_call(req: MCPRequest) -> Dict[str, Any]:
    """Execute any tool from the Universal MCP Studio registry."""
    result = await mcp.execute_tool(req.tool, req.arguments)
    return {"result": result}


@app.post("/api/v1/jobs/autonomous")
async def launch_autonomous_job(job: JobRequest) -> Dict[str, Any]:
    """Launch full autonomous production pipeline (Frame 0 -> YouTube)."""
    payload = {
        "jobId": f"job_{int(asyncio.get_event_loop().time() * 1000)}",
        "input": {"topicOrPrompt": job.topicOrPrompt},
        "preferences": {
            "aspectRatio": job.aspectRatio,
            "targetDurationSeconds": job.targetDurationSeconds,
            "autoUploadToYouTube": job.autoUploadToYouTube,
            "qualityGateThreshold": 9.0,
        },
    }
    # Run in background
    asyncio.create_task(orchestrator.run_full_autonomous_pipeline(payload))
    return {"status": "dispatched", "job": payload}


@app.websocket("/ws/studio")
async def studio_websocket_endpoint(websocket: WebSocket) -> None:
    """Live bidirectional WebSocket for Ghost Cursors, Timeline Commands, and User Takeover."""
    await manager.connect(websocket)
    try:
        while True:
            raw_text = await websocket.receive_text()
            data = json.loads(raw_text)
            event_type = data.get("eventType")

            if event_type == "USER_PAUSE_TAKEOVER":
                orchestrator.set_paused(True)
                await manager.broadcast({
                    "eventType": "STUDIO_MODE_CHANGED",
                    "mode": "paused-by-user",
                })
            elif event_type == "USER_RESUME_AI":
                orchestrator.set_paused(False)
                await manager.broadcast({
                    "eventType": "STUDIO_MODE_CHANGED",
                    "mode": "running-autonomous",
                })
            elif event_type == "MCP_INVOKE":
                tool = data.get("tool")
                args = data.get("arguments", {})
                res = await mcp.execute_tool(tool, args)
                await websocket.send_text(json.dumps({
                    "eventType": "MCP_RESULT",
                    "tool": tool,
                    "result": res,
                }))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

