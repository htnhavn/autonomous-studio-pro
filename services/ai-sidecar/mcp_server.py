"""
@file mcp_server.py
@description Embedded Model Context Protocol (MCP) Server for Autonomous Studio Pro.
Exposes JSON-RPC 2.0 endpoints for tools across timeline, asset hunting, shaders, motion, and audio.
Allows any coding agent (Claude Code, Gemini, Codex, OpenClaw) to drive the timeline live.
"""

from __future__ import annotations

import json
from typing import Any, Callable, Dict, List, Optional
from agents.director_crew import AutonomousFilmCrewOrchestrator


class EmbeddedMCPServer:
    """
    Handles MCP JSON-RPC requests from local or remote AI agents
    and routes them to the orchestrator and timeline bus.
    """

    def __init__(self, orchestrator: AutonomousFilmCrewOrchestrator) -> None:
        self.orchestrator = orchestrator
        self._tool_handlers: Dict[str, Callable[[Dict[str, Any]], Any]] = {}
        self._register_default_handlers()

    def _register_default_handlers(self) -> None:
        self._tool_handlers["timeline.split_and_ripple_cut"] = self._handle_split_ripple
        self._tool_handlers["timeline.insert_broll_clip"] = self._handle_insert_broll
        self._tool_handlers["hunter.search_and_score_media"] = self._handle_search_media
        self._tool_handlers["hunter.capture_news_article_highlight"] = self._handle_news_highlight
        self._tool_handlers["motion.inject_procedural_graphic"] = self._handle_motion_graphic
        self._tool_handlers["vfx.apply_shader_and_transition"] = self._handle_shader_transition
        self._tool_handlers["aivfx.rotoscope_text_behind_subject"] = self._handle_rotoscope_text
        self._tool_handlers["aivfx.convert_image_to_3d_parallax"] = self._handle_3d_parallax
        self._tool_handlers["audio.transcribe_and_build_dynamic_captions"] = self._handle_audio_captions
        self._tool_handlers["audio.master_mix_beat_sync_and_sfx"] = self._handle_audio_mastering
        self._tool_handlers["youtube.generate_package_and_publish"] = self._handle_youtube_publish
        self._tool_handlers["stage.compile_deterministic_draft"] = self._handle_stage_compile_draft
        self._tool_handlers["stage.compose_choreographed_scene"] = self._handle_stage_compose_scene

    async def execute_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        handler = self._tool_handlers.get(name)
        if not handler:
            return {"error": f"Tool '{name}' not found in Studio MCP Registry"}
        return await handler(arguments)

    # Tool Handlers
    async def _handle_split_ripple(self, args: Dict[str, Any]) -> Dict[str, Any]:
        clip_id = args["clipId"]
        remove_start = args["removeStartSec"]
        remove_end = args["removeEndSec"]
        reasoning = args.get("reasoning", "Ripple cut dead air")

        await self.orchestrator.emit_ghost_cursor(
            role="rough-cut",
            timeline_sec=remove_start,
            status="cutting",
            action_bubble=f"✂️ Cắt bỏ {remove_end - remove_start:.1f}s và dồn clip...",
            target_clip_id=clip_id,
            reasoning=reasoning,
        )

        await self.orchestrator.emit_timeline_command(
            role="rough-cut",
            command={
                "type": "CLIP_SPLIT",
                "clipId": clip_id,
                "splitAtTimelineTime": {"value": int(remove_start * 60), "rate": 60},
            },
            reasoning=reasoning,
        )
        return {"success": True, "cutRangeSec": [remove_start, remove_end]}

    async def _handle_insert_broll(self, args: Dict[str, Any]) -> Dict[str, Any]:
        asset_id = args["assetId"]
        track_id = args["trackId"]
        start_sec = args["startTimeSec"]
        duration_sec = args["durationSec"]
        reasoning = args.get("reasoning", "Inserted contextual B-Roll")

        await self.orchestrator.emit_ghost_cursor(
            role="asset-hunter",
            timeline_sec=start_sec,
            status="cutting",
            action_bubble=f"📥 Đặt B-Roll '{asset_id}' vào track {track_id}",
            target_track_id=track_id,
            reasoning=reasoning,
        )
        return {"success": True, "insertedAtSec": start_sec}

    async def _handle_search_media(self, args: Dict[str, Any]) -> Dict[str, Any]:
        query = args["query"]
        await self.orchestrator.emit_ghost_cursor(
            role="asset-hunter",
            timeline_sec=0.0,
            status="searching-web",
            action_bubble=f"🔍 Săn tư liệu web: '{query}'...",
        )
        return {
            "query": query,
            "bestCandidate": {
                "id": f"harvested_{query}",
                "provider": "pexels",
                "aestheticScore": 9.4,
            },
        }

    async def _handle_news_highlight(self, args: Dict[str, Any]) -> Dict[str, Any]:
        query = args["searchQueryOrUrl"]
        quote = args["quoteToHighlight"]
        start_sec = args["startTimeSec"]

        await self.orchestrator.emit_ghost_cursor(
            role="asset-hunter",
            timeline_sec=start_sec,
            status="searching-web",
            action_bubble=f"📰 Chụp bài báo & Tô dạ quang: '{quote[:30]}...'",
        )
        return {"success": True, "capturedQuote": quote}

    async def _handle_motion_graphic(self, args: Dict[str, Any]) -> Dict[str, Any]:
        template_id = args["templateId"]
        start_sec = args["startTimeSec"]
        track_id = args["trackId"]

        await self.orchestrator.emit_ghost_cursor(
            role="vfx-motion",
            timeline_sec=start_sec,
            status="rendering-vfx",
            action_bubble=f"✨ Code đồ họa chuyển động: {template_id}",
            target_track_id=track_id,
        )
        return {"success": True, "templateId": template_id}

    async def _handle_shader_transition(self, args: Dict[str, Any]) -> Dict[str, Any]:
        clip_id = args["clipId"]
        shader_id = args.get("shaderId", "capcut.3d-zoom-pro")
        await self.orchestrator.emit_ghost_cursor(
            role="vfx-motion",
            timeline_sec=0.0,
            status="rendering-vfx",
            action_bubble=f"🎨 Áp shader {shader_id}",
            target_clip_id=clip_id,
        )
        return {"success": True, "appliedShader": shader_id}

    async def _handle_rotoscope_text(self, args: Dict[str, Any]) -> Dict[str, Any]:
        clip_id = args["clipId"]
        headline = args["headlineTextBehindSubject"]
        await self.orchestrator.emit_ghost_cursor(
            role="vfx-motion",
            timeline_sec=0.0,
            status="rendering-vfx",
            action_bubble=f"👤 SAM 2.1 tách nền & đặt chữ '{headline}' sau lưng",
            target_clip_id=clip_id,
        )
        return {"success": True, "headline": headline}

    async def _handle_3d_parallax(self, args: Dict[str, Any]) -> Dict[str, Any]:
        clip_id = args["clipId"]
        preset = args["cameraMovePreset"]
        await self.orchestrator.emit_ghost_cursor(
            role="vfx-motion",
            timeline_sec=0.0,
            status="rendering-vfx",
            action_bubble=f"🎥 Depth 3D Parallax: {preset}",
            target_clip_id=clip_id,
        )
        return {"success": True, "cameraPreset": preset}

    async def _handle_audio_captions(self, args: Dict[str, Any]) -> Dict[str, Any]:
        style = args["stylePresetId"]
        await self.orchestrator.emit_ghost_cursor(
            role="sound-designer",
            timeline_sec=0.0,
            status="cutting",
            action_bubble=f"🎙️ WhisperX tạo phụ đề nhảy: {style}",
        )
        return {"success": True, "stylePresetId": style}

    async def _handle_audio_mastering(self, args: Dict[str, Any]) -> Dict[str, Any]:
        target_lufs = args.get("targetLufs", -14.0)
        await self.orchestrator.emit_ghost_cursor(
            role="sound-designer",
            timeline_sec=0.0,
            status="cutting",
            action_bubble=f"🎧 Librosa Beat-Sync & Chuẩn hóa {target_lufs} LUFS",
        )
        return {"success": True, "targetLufs": target_lufs}

    async def _handle_youtube_publish(self, args: Dict[str, Any]) -> Dict[str, Any]:
        codec = args.get("renderCodec", "h264_nvenc")
        await self.orchestrator.emit_ghost_cursor(
            role="youtube-publisher",
            timeline_sec=0.0,
            status="rendering-vfx",
            action_bubble=f"🚀 Render 4K ({codec}) + Auto-Publish YouTube",
        )
        return {
            "success": True,
            "renderCodec": codec,
            "videoUrl": "https://youtube.com/watch?v=sample_autonomous_output",
        }

    async def _handle_stage_compile_draft(self, args: Dict[str, Any]) -> Dict[str, Any]:
        script_text = args.get("scriptText", "")
        genre_kit = args.get("genreKit", "economics-stickman")
        replace_track = args.get("replaceExistingStageTrack", True)
        autonomy_tier = args.get("autonomyTier", "tier-0-zero-ai")
        playbook_id = args.get("playbookId")

        return await self.orchestrator.compile_deterministic_stage_draft(
            script_text=script_text,
            genre_kit=genre_kit,
            replace_track=replace_track,
            autonomy_tier=autonomy_tier,
            playbook_id=playbook_id,
        )

    async def _handle_stage_compose_scene(self, args: Dict[str, Any]) -> Dict[str, Any]:
        clip_id = args["clipId"]
        stage_scene = args["stageScene"]
        reasoning = args.get("reasoning")

        return await self.orchestrator.compose_choreographed_scene(
            clip_id=clip_id,
            stage_scene=stage_scene,
            reasoning=reasoning,
        )


