#!/usr/bin/env python3
"""
@file studio_agent_cli.py
@description Universal External Agent Controller CLI for Autonomous Studio Pro.
Allows any external coding agent (VS Code, Antigravity, Claude Code, Cursor, Codex, OpenClaw)
to drive the Studio Timeline, move live Ghost Cursors, compile 0-Token Stickman/2.5D Stage videos,
inject B-Roll/Shaders/Color Grades, and trigger SOP Playbooks in real time.

Dual-Transport Architecture:
  1. Writes live event packets to `apps/desktop/public/live-agent-bridge.json` (polled every 250ms by UI)
     so external agents can drive the Studio UI live even when only `npm run dev` is running!
  2. Forwards commands to `http://127.0.0.1:8765/mcp` if the Python FastAPI Sidecar is online.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parent.parent
BRIDGE_JSON_PATH = ROOT / "apps" / "desktop" / "public" / "live-agent-bridge.json"
SIDECAR_HTTP_URL = "http://127.0.0.1:8765"


def read_bridge_state() -> Dict[str, Any]:
    if not BRIDGE_JSON_PATH.exists():
        return {"seqId": 0, "updatedAtMs": 0, "activeExternalAgent": None, "events": []}
    try:
        return json.loads(BRIDGE_JSON_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"seqId": 0, "updatedAtMs": 0, "activeExternalAgent": None, "events": []}


def emit_bridge_events(
    events: List[Dict[str, Any]],
    agent_id: str = "agent_vscode_external",
    agent_name: str = "🤖 VS Code / Antigravity Agent",
    provider: str = "external-mcp",
) -> int:
    BRIDGE_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    state = read_bridge_state()
    seq_id = int(state.get("seqId", 0))

    stamped_events = state.get("events", [])
    for ev in events:
        seq_id += 1
        ev_copy = dict(ev)
        ev_copy["seqId"] = seq_id
        ev_copy["timestampMs"] = int(time.time() * 1000)
        stamped_events.append(ev_copy)

    # Keep last 40 events in the ring buffer
    stamped_events = stamped_events[-40:]

    next_state = {
        "seqId": seq_id,
        "updatedAtMs": int(time.time() * 1000),
        "activeExternalAgent": {
            "agentId": agent_id,
            "displayName": agent_name,
            "provider": provider,
            "lastSeenMs": int(time.time() * 1000),
        },
        "events": stamped_events,
    }
    BRIDGE_JSON_PATH.write_text(
        json.dumps(next_state, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return seq_id


def forward_to_sidecar_if_online(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any] | None:
    req_body = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": uuid.uuid4().hex[:8],
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{SIDECAR_HTTP_URL}/mcp",
        data=req_body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=1.2) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def make_ghost_cursor_event(
    timeline_sec: float,
    status: str,
    bubble: str,
    target_track_id: str | None = None,
    target_clip_id: str | None = None,
    reasoning: str | None = None,
    agent_id: str = "agent_vscode_external",
    agent_name: str = "🤖 VS Code / Antigravity Agent",
    color_hex: str = "#06B6D4",
) -> Dict[str, Any]:
    return {
        "eventType": "AGENT_GHOST_CURSOR",
        "cursor": {
            "agentId": agent_id,
            "role": "external-mcp",
            "displayName": agent_name,
            "colorHex": color_hex,
            "provider": "external-mcp",
            "status": status,
            "currentTimelineTime": {"value": int(round(timeline_sec * 60)), "rate": 60},
            "targetTrackId": target_track_id,
            "targetClipId": target_clip_id,
            "liveActionBubble": bubble,
            "reasoningStream": reasoning,
            "updatedAtMs": int(time.time() * 1000),
        },
    }


def make_timeline_command_event(
    command: Dict[str, Any],
    reasoning: str,
    agent_id: str = "agent_vscode_external",
    agent_name: str = "🤖 VS Code / Antigravity Agent",
) -> Dict[str, Any]:
    return {
        "eventType": "TIMELINE_COMMAND",
        "envelope": {
            "commandId": f"ext_cmd_{uuid.uuid4().hex[:8]}",
            "actor": {
                "kind": "agent",
                "id": agent_id,
                "role": "external-mcp",
                "displayName": agent_name,
            },
            "timestampMs": int(time.time() * 1000),
            "reasoning": reasoning,
            "command": command,
        },
    }


def cmd_compile_stage(args: argparse.Namespace) -> int:
    events = [
        make_ghost_cursor_event(
            timeline_sec=0.0,
            status="thinking",
            bubble=f"⚡ [VS Code Agent] Dựng kịch bản sân khấu '{args.genre}' (0 Token)...",
            target_track_id="track-stage-1",
            reasoning=f"Compiling script via {args.genre} Genre Kit",
            agent_name=args.agent_name,
        ),
        make_timeline_command_event(
            command={
                "type": "PROJECT_COMPILE_DETERMINISTIC_STAGE",
                "scriptText": args.script,
                "genreKit": args.genre,
                "replaceExistingStageTrack": not args.append,
            },
            reasoning=f"External Agent compiled stage script using {args.genre}.",
            agent_name=args.agent_name,
        ),
    ]
    seq = emit_bridge_events(events, agent_name=args.agent_name)
    forward_to_sidecar_if_online(
        "stage.compile_deterministic_draft",
        {
            "scriptText": args.script,
            "genreKit": args.genre,
            "replaceExistingStageTrack": not args.append,
            "autonomyTier": args.tier,
        },
    )
    print(json.dumps({"ok": True, "seqId": seq, "action": "compile-stage", "genreKit": args.genre}, ensure_ascii=False))
    return 0


def cmd_cursor(args: argparse.Namespace) -> int:
    ev = make_ghost_cursor_event(
        timeline_sec=args.time,
        status=args.status,
        bubble=args.bubble,
        target_track_id=args.track,
        target_clip_id=args.clip,
        reasoning=args.reasoning,
        agent_name=args.agent_name,
    )
    seq = emit_bridge_events([ev], agent_name=args.agent_name)
    print(json.dumps({"ok": True, "seqId": seq, "action": "cursor", "timeSec": args.time}, ensure_ascii=False))
    return 0


def cmd_insert_broll(args: argparse.Namespace) -> int:
    asset_id = f"asset_ext_{uuid.uuid4().hex[:6]}"
    clip_id = f"clip_ext_{uuid.uuid4().hex[:6]}"
    asset = {
        "id": asset_id,
        "name": f"{args.query} (VS Code Agent)",
        "kind": args.kind,
        "localFilePath": args.url,
        "semanticTags": args.query.split(),
        "aestheticScore": 9.5,
        "origin": {
            "provider": "unsplash" if args.kind == "image" else "pexels",
            "searchQuery": args.query,
            "sourceUrl": args.url,
        },
    }
    clip = {
        "id": clip_id,
        "name": f"🖼️ {args.query}",
        "trackId": args.track,
        "assetId": asset_id,
        "kind": "video",
        "timelineRange": {
            "startTime": {"value": int(round(args.start * 60)), "rate": 60},
            "duration": {"value": int(round(args.duration * 60)), "rate": 60},
        },
        "sourceRange": {
            "startTime": {"value": 0, "rate": 60},
            "duration": {"value": int(round(args.duration * 60)), "rate": 60},
        },
        "speedMultiplier": 1.0,
        "blendMode": "normal",
        "enabled": True,
        "lockedByUser": False,
        "agentProvenance": {
            "agentId": "agent_vscode_external",
            "agentRole": "external-mcp",
            "modelId": "vscode-agent",
            "reasoningSummary": f"Inserted B-Roll for '{args.query}'",
            "timestampIso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
        "transform": {
            "positionX": {"staticValue": 0, "keyframes": []},
            "positionY": {"staticValue": 0, "keyframes": []},
            "positionZ": {"staticValue": 0, "keyframes": []},
            "scaleX": {"staticValue": 1, "keyframes": []},
            "scaleY": {"staticValue": 1, "keyframes": []},
            "rotationX": {"staticValue": 0, "keyframes": []},
            "rotationY": {"staticValue": 0, "keyframes": []},
            "rotationZ": {"staticValue": 0, "keyframes": []},
            "anchorX": {"staticValue": 0, "keyframes": []},
            "anchorY": {"staticValue": 0, "keyframes": []},
            "opacity": {"staticValue": 1, "keyframes": []},
        },
        "shaders": [
            {
                "id": f"sh_{uuid.uuid4().hex[:6]}",
                "shaderId": args.shader,
                "name": args.shader,
                "enabled": True,
                "mix": {"staticValue": 1.0, "keyframes": []},
                "uniforms": {},
            }
        ]
        if args.shader
        else [],
        "colorGrade": {
            "enabled": False,
            "exposure": {"staticValue": 0, "keyframes": []},
            "contrast": {"staticValue": 1, "keyframes": []},
            "saturation": {"staticValue": 1, "keyframes": []},
            "temperature": {"staticValue": 0, "keyframes": []},
            "tint": {"staticValue": 0, "keyframes": []},
            "lift": [0, 0, 0, 0],
            "gamma": [0, 0, 0, 0],
            "gain": [0, 0, 0, 0],
            "lutIntensity": {"staticValue": 1, "keyframes": []},
            "filmGrainIntensity": {"staticValue": 0, "keyframes": []},
            "halationIntensity": {"staticValue": 0, "keyframes": []},
        },
        "aiVfx": {},
        "audio": {
            "volumeDb": {"staticValue": 0, "keyframes": []},
            "pan": {"staticValue": 0, "keyframes": []},
            "mute": False,
            "fadeInDuration": {"value": 0, "rate": 60},
            "fadeOutDuration": {"value": 0, "rate": 60},
            "aiDenoiseEnabled": False,
            "aiVocalIsolationEnabled": False,
            "duckingRole": "none",
            "duckingAmountDb": 0,
        },
    }

    events = [
        make_ghost_cursor_event(
            timeline_sec=args.start,
            status="searching-web",
            bubble=f"🔍 [VS Code Agent] Thả B-Roll '{args.query}' vào {args.start:.1f}s...",
            target_track_id=args.track,
            agent_name=args.agent_name,
        ),
        make_timeline_command_event(
            command={"type": "MEDIA_POOL_REGISTER_ASSET", "asset": asset},
            reasoning=f"Register asset '{args.query}'",
            agent_name=args.agent_name,
        ),
        {
            "eventType": "LIVE_ASSET_FLIGHT",
            "flight": {
                "eventId": f"flight_{uuid.uuid4().hex[:6]}",
                "agentId": "agent_vscode_external",
                "asset": asset,
                "targetTrackId": args.track,
                "targetStartTime": {"value": int(round(args.start * 60)), "rate": 60},
                "searchQueryUsed": args.query,
                "vlmMatchScore": 9.5,
                "timestampMs": int(time.time() * 1000),
            },
        },
        make_timeline_command_event(
            command={
                "type": "CLIP_INSERT",
                "trackId": args.track,
                "clip": clip,
                "rippleShiftSubsequentClips": False,
            },
            reasoning=f"Insert B-Roll '{args.query}' at {args.start}s",
            agent_name=args.agent_name,
        ),
    ]
    seq = emit_bridge_events(events, agent_name=args.agent_name)
    print(json.dumps({"ok": True, "seqId": seq, "clipId": clip_id, "assetId": asset_id}, ensure_ascii=False))
    return 0


def cmd_raw_command(args: argparse.Namespace) -> int:
    command_obj = json.loads(args.json)
    events = [
        make_ghost_cursor_event(
            timeline_sec=args.time,
            status="cutting",
            bubble=args.bubble or f"⚡ [VS Code Agent] Thực thi {command_obj.get('type')}...",
            agent_name=args.agent_name,
        ),
        make_timeline_command_event(
            command=command_obj,
            reasoning=args.reasoning or "Dispatched from external VS Code Agent",
            agent_name=args.agent_name,
        ),
    ]
    seq = emit_bridge_events(events, agent_name=args.agent_name)
    print(json.dumps({"ok": True, "seqId": seq, "commandType": command_obj.get("type")}, ensure_ascii=False))
    return 0


def cmd_render_video(args: argparse.Namespace) -> int:
    from native_stage_renderer import render_stickman_stage_mp4

    events = [
        make_ghost_cursor_event(
            timeline_sec=0.0,
            status="rendering-vfx",
            bubble=f"🎬 [{args.agent_name}] Kết xuất video 0-Token '{args.genre}' ({args.duration}s)...",
            target_track_id="track-stage-1",
            reasoning=f"Rendering deterministic 0-token stage MP4 ({args.duration}s)",
            agent_name=args.agent_name,
        ),
        make_timeline_command_event(
            command={
                "type": "PROJECT_COMPILE_DETERMINISTIC_STAGE",
                "scriptText": args.script,
                "genreKit": args.genre,
                "replaceExistingStageTrack": True,
            },
            reasoning=f"{args.agent_name} compiled & rendered 0-token video.",
            agent_name=args.agent_name,
        ),
    ]
    seq = emit_bridge_events(events, agent_name=args.agent_name)
    out_path = render_stickman_stage_mp4(
        output_mp4=Path(args.output),
        genre=args.genre,
        script_text=args.script,
        duration_sec=args.duration,
        fps=args.fps,
        agent_name=args.agent_name,
    )
    print(
        json.dumps(
            {
                "ok": True,
                "seqId": seq,
                "action": "render-video",
                "outputMp4": str(out_path),
                "durationSec": args.duration,
                "fps": args.fps,
                "sizeBytes": out_path.stat().st_size,
            },
            ensure_ascii=False,
        )
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--agent-name", default="🤖 VS Code / Antigravity Agent", help="Display name on Ghost Cursor")

    p = argparse.ArgumentParser(description="Autonomous Studio Pro — External Agent Controller CLI", parents=[common])
    sub = p.add_subparsers(dest="subcmd", required=True)

    # 1. compile-stage
    p_stage = sub.add_parser("compile-stage", parents=[common], help="Compile script into 0-Token Stickman/Cosmic/Lore stage scenes")
    p_stage.add_argument("--genre", default="economics-stickman", choices=["economics-stickman", "universe-cosmic", "lore-chronicle"])
    p_stage.add_argument("--script", required=True, help="Full narration script or sentences")
    p_stage.add_argument("--tier", default="tier-1-eco-puppeteer")
    p_stage.add_argument("--append", action="store_true", help="Append instead of replacing track-stage-1")
    p_stage.set_defaults(func=cmd_compile_stage)

    # 2. cursor
    p_cur = sub.add_parser("cursor", parents=[common], help="Move External Agent Ghost Cursor on the live timeline")
    p_cur.add_argument("--time", type=float, default=0.0, help="Timeline position in seconds")
    p_cur.add_argument("--status", default="cutting", choices=["idle", "thinking", "searching-web", "cutting", "rendering-vfx", "reviewing"])
    p_cur.add_argument("--bubble", required=True, help="Live action bubble text shown next to Ghost Cursor")
    p_cur.add_argument("--track", default="track-stage-1")
    p_cur.add_argument("--clip", default=None)
    p_cur.add_argument("--reasoning", default=None)
    p_cur.set_defaults(func=cmd_cursor)

    # 3. insert-broll
    p_broll = sub.add_parser("insert-broll", parents=[common], help="Fly and insert a Web/Stock B-Roll clip onto the timeline")
    p_broll.add_argument("--query", required=True, help="Visual title / search query")
    p_broll.add_argument("--url", default="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80")
    p_broll.add_argument("--kind", default="image", choices=["image", "video"])
    p_broll.add_argument("--track", default="track-video-broll")
    p_broll.add_argument("--start", type=float, default=0.0)
    p_broll.add_argument("--duration", type=float, default=4.0)
    p_broll.add_argument("--shader", default="capcut.3d-zoom-pro")
    p_broll.set_defaults(func=cmd_insert_broll)

    # 4. command
    p_cmd = sub.add_parser("command", parents=[common], help="Send any raw TimelineCommand JSON object to the Studio store")
    p_cmd.add_argument("--json", required=True, help="JSON string of TimelineCommand")
    p_cmd.add_argument("--time", type=float, default=0.0)
    p_cmd.add_argument("--bubble", default=None)
    p_cmd.add_argument("--reasoning", default=None)
    p_cmd.set_defaults(func=cmd_raw_command)

    # 5. render-video (0-Token Native Stickman & 2.5D Stage MP4 Renderer)
    p_ren = sub.add_parser("render-video", parents=[common], help="Render a real H.264 .mp4 video using the 0-Token Stickman Stage Engine")
    p_ren.add_argument("--genre", default="economics-stickman", choices=["economics-stickman", "universe-cosmic", "lore-chronicle"])
    p_ren.add_argument("--script", required=True, help="Narration script for subtitles and stage choreography")
    p_ren.add_argument("--duration", type=float, default=3.0, help="Video duration in seconds")
    p_ren.add_argument("--fps", type=int, default=30, help="Frames per second")
    p_ren.add_argument("--output", default="exports/flash_stickman_demo_3s.mp4", help="Output MP4 file path")
    p_ren.set_defaults(func=cmd_render_video)

    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())

