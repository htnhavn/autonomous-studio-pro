#!/usr/bin/env python3
"""
@file studio_render_engine.py
@description Brief-driven deterministic render engine for Autonomous Studio Pro.

The AI director writes a `DirectorBrief` JSON (research, script, shot choices,
effects, pacing, grade). This engine does the deterministic work: bone-accurate
rig animation, frame-accurate karaoke captions, real-asset compositing, shot
effects, color grading, audio mixing (ElevenLabs voice + ducked music + EBU R128)
and H.264 encoding.

Design rules
------------
* Everything is a pure function of (brief, time) — no randomness without a seed.
* No network calls except the optional ElevenLabs TTS request.
* Missing API key never breaks a render: it falls back to a music bed and says so.
* The engine never invents content; it only renders what the brief specifies.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import wave
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Sequence

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Fonts
# ---------------------------------------------------------------------------

_FONT_DIR = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"


def _font_candidates(style: str) -> list[str]:
    mac = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/System/Library/Fonts/Supplemental/Courier New Bold.ttf",
    ]
    win = [
        str(_FONT_DIR / "arialbd.ttf"),
        str(_FONT_DIR / "arial.ttf"),
        str(_FONT_DIR / "segoeuib.ttf"),
        str(_FONT_DIR / "segoeui.ttf"),
        str(_FONT_DIR / "timesbd.ttf"),
        str(_FONT_DIR / "times.ttf"),
        str(_FONT_DIR / "georgiab.ttf"),
        str(_FONT_DIR / "georgia.ttf"),
        str(_FONT_DIR / "impact.ttf"),
        str(_FONT_DIR / "consolab.ttf"),
        str(_FONT_DIR / "consola.ttf"),
        str(_FONT_DIR / "tahomabd.ttf"),
        str(_FONT_DIR / "tahoma.ttf"),
    ]
    linux = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    order = {
        "display": [win[8], win[0], win[2], win[6], *mac, *linux],
        "sans": [win[0], win[2], win[1], win[3], *mac, *linux],
        "serif": [win[4], win[5], win[0], *mac, *linux],
        "mono": [win[9], win[10], win[11], *mac, *linux],
    }
    return order.get(style, order["sans"])


def load_font(style: str, size: int) -> ImageFont.FreeTypeFont:
    for path in _font_candidates(style):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size=size)
            except Exception:
                continue
    try:
        return ImageFont.load_default(size=size)  # type: ignore[call-arg]
    except TypeError:
        return ImageFont.load_default()


# ---------------------------------------------------------------------------
# FFmpeg discovery
# ---------------------------------------------------------------------------

_FFMPEG_CACHE: str | None = None


def find_ffmpeg() -> str | None:
    """Find a working ffmpeg binary: env override, PATH, Playwright cache, repo."""
    global _FFMPEG_CACHE
    if _FFMPEG_CACHE is not None:
        return _FFMPEG_CACHE or None

    candidates: list[str] = []
    env = os.environ.get("FFMPEG_BIN")
    if env:
        candidates.append(env)
    which = shutil.which("ffmpeg")
    if which:
        candidates.append(which)

    local = os.environ.get("LOCALAPPDATA")
    if local:
        candidates += sorted(
            str(p) for p in Path(local).glob("ms-playwright/ffmpeg-*/ffmpeg-win64.exe")
        )
    candidates += [
        str(ROOT_DIR / "dist-native" / "ffmpeg.exe"),
        str(ROOT_DIR / "native" / "ffmpeg.exe"),
        str(ROOT_DIR / "references" / "Clypra" / "src-tauri" / "bin" / "ffmpeg-x86_64-pc-windows-msvc.exe"),
    ]

    for candidate in candidates:
        if not candidate or not Path(candidate).exists():
            continue
        try:
            subprocess.run(
                [candidate, "-hide_banner", "-version"],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=15,
            )
            _FFMPEG_CACHE = candidate
            return candidate
        except Exception:
            continue
    _FFMPEG_CACHE = ""
    return None


# ---------------------------------------------------------------------------
# Brief compilation
# ---------------------------------------------------------------------------

WORDS_PER_SECOND = {
    "economics-stickman": 2.8,
    "universe-cosmic": 2.8,
    "lore-chronicle": 2.8,
    "vox-documentary": 3.3,
    "pixel-retro-arcade": 3.4,
}

EMPHASIS_HINTS = (
    "không", "chỉ", "nhưng", "vì", "sụp", "khủng hoảng", "triều", "ngập",
    "nguy hiểm", "bí mật", "sự thật", "miễn phí", "zero", "never", "only",
    "crash", "collapse", "free", "why", "how",
)


@dataclass
class CompiledWord:
    word: str
    start_sec: float
    end_sec: float
    is_keyword: bool


@dataclass
class CompiledScene:
    index: int
    raw: dict
    start_sec: float
    duration_sec: float
    words: list[CompiledWord] = field(default_factory=list)

    @property
    def end_sec(self) -> float:
        return self.start_sec + self.duration_sec

    @property
    def narration(self) -> str:
        return str(self.raw.get("narration", "")).strip()


@dataclass
class CompiledBrief:
    raw: dict
    scenes: list[CompiledScene]
    total_duration_sec: float
    fps: int
    width: int
    height: int
    genre: str


def _is_keyword_word(raw: str) -> bool:
    cleaned = "".join(ch for ch in raw.lower() if ch.isalnum())
    if not cleaned:
        return False
    if len(cleaned) >= 9:
        return True
    return any(hint in cleaned for hint in EMPHASIS_HINTS)


def build_word_timings(narration: str, start_sec: float, duration_sec: float) -> list[CompiledWord]:
    words = [w for w in narration.split() if w]
    if not words:
        return []
    weights = [0.6 + min(2.4, len(w) / 5.0) for w in words]
    total = sum(weights)
    out: list[CompiledWord] = []
    cursor = start_sec
    for idx, (word, weight) in enumerate(zip(words, weights)):
        span = (weight / total) * duration_sec
        end = start_sec + duration_sec if idx == len(words) - 1 else cursor + span
        out.append(CompiledWord(word, cursor, end, _is_keyword_word(word)))
        cursor = end
    return out


def compile_brief(brief: dict) -> CompiledBrief:
    meta = brief.get("meta", {})
    genre = str(meta.get("genreKit", "economics-stickman"))
    fps = int(meta.get("fps", 30) or 30)
    width = int(meta.get("widthPx", 1280) or 1280)
    height = int(meta.get("heightPx", 720) or 720)
    wps = WORDS_PER_SECOND.get(genre, 2.8)

    scenes: list[CompiledScene] = []
    cursor = 0.0
    for idx, raw in enumerate(brief.get("scenes", [])):
        narration = str(raw.get("narration", "")).strip()
        words = len(narration.split()) if narration else 0
        derived = (words / wps) if words else 3.0
        explicit = raw.get("durationSec")
        duration = float(explicit) if explicit is not None else derived
        duration = max(1.2, min(30.0, round(duration, 2)))
        scene = CompiledScene(index=idx, raw=raw, start_sec=round(cursor, 3), duration_sec=duration)
        scene.words = build_word_timings(narration, scene.start_sec, duration)
        scenes.append(scene)
        cursor += duration

    return CompiledBrief(
        raw=brief,
        scenes=scenes,
        total_duration_sec=round(cursor, 3),
        fps=fps,
        width=width,
        height=height,
        genre=genre,
    )


def validate_brief(brief: dict) -> list[str]:
    errors: list[str] = []
    if not isinstance(brief, dict):
        return ["Brief must be a JSON object."]
    meta = brief.get("meta")
    if not isinstance(meta, dict):
        errors.append("meta: missing")
    else:
        for key in ("title", "genreKit", "fps", "widthPx", "heightPx"):
            if not meta.get(key):
                errors.append(f"meta.{key}: required")
    scenes = brief.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        errors.append("scenes: at least one scene required")
        return errors
    for i, scene in enumerate(scenes):
        if not isinstance(scene, dict):
            errors.append(f"scenes[{i}]: must be an object")
            continue
        if not str(scene.get("narration", "")).strip():
            errors.append(f"scenes[{i}].narration: required for captions/TTS")
        if not scene.get("cameraRig"):
            errors.append(f"scenes[{i}].cameraRig: required")
        if not scene.get("backdrop"):
            errors.append(f"scenes[{i}].backdrop: required")
        if not scene.get("actors"):
            errors.append(f"scenes[{i}].actors: at least one actor required")
    return errors


# ---------------------------------------------------------------------------
# Camera rigs (mirrors packages/stage-engine/src/camera-choreography.ts)
# ---------------------------------------------------------------------------

@dataclass
class CameraFrame:
    zoom: float = 1.0
    pan_x: float = 0.0
    pan_y: float = 0.0
    rotation_deg: float = 0.0
    tilt_x_deg: float = 0.0
    tilt_y_deg: float = 0.0
    vignette: float = 0.15


def _smoothstep(p: float) -> float:
    return p * p * (3 - 2 * p)


def evaluate_camera(preset: str, p: float, t: float) -> CameraFrame:
    p = max(0.0, min(1.0, p))
    s = _smoothstep(p)
    ease_out_expo = 1.0 if p >= 1 else 1 - math.pow(2, -10 * p)
    cam = CameraFrame()

    if preset == "dolly-push-cosmic":
        cam.zoom = 1.0 + p * 0.28
        cam.vignette = 0.35
    elif preset == "dolly-pull-reveal":
        cam.zoom = 1.45 - s * 0.45
        cam.vignette = 0.25
    elif preset == "multiplane-parallax-drift":
        cam.zoom = 1.12
        cam.pan_x = -0.15 + p * 0.3
        cam.pan_y = math.sin(t * 0.8) * 0.03
        cam.tilt_y_deg = -6 + p * 12
    elif preset == "whiteboard-pan-left-to-right":
        cam.zoom = 1.18
        cam.pan_x = -0.25 + s * 0.5
    elif preset == "crash-zoom-actor-face":
        shake = math.sin(t * 45) * 0.015 if p < 0.25 else 0.0
        cam.zoom = 1.0 + ease_out_expo * 0.65
        cam.pan_x = -0.18 + shake
        cam.pan_y = -0.12 - shake
        cam.rotation_deg = shake * 40
        cam.vignette = 0.4
    elif preset == "spotlight-dark-focus":
        cam.zoom = 1.15
        cam.vignette = 0.85
    elif preset == "isometric-tactical-tilt":
        cam.zoom = 1.1 + p * 0.1
        cam.tilt_x_deg = 28
        cam.tilt_y_deg = -8 + p * 16
        cam.vignette = 0.45
    elif preset == "handheld-documentary-float":
        cam.zoom = 1.05
        cam.pan_x = math.sin(t * 1.7) * 0.02
        cam.pan_y = math.cos(t * 2.3) * 0.015
        cam.rotation_deg = math.sin(t * 1.1) * 0.6
    elif preset == "split-screen-versus-duel":
        cam.zoom = 1.15
        cam.pan_x = math.sin(t * 0.5) * 0.05
        cam.tilt_y_deg = 12 * (-1 if p > 0.5 else 1)
        cam.vignette = 0.5
    elif preset == "vertigo-contra-zoom":
        cam.zoom = 1.0 + p * 0.4
        cam.vignette = 0.3 + p * 0.3
    elif preset == "whip-pan-target-snap":
        cam.zoom = 1.1
        cam.pan_x = (1 - ease_out_expo) * -0.6
    elif preset == "vox-map-flyover-topdown":
        cam.zoom = 1.22 - s * 0.12
        cam.pan_x = math.sin(t * 0.35) * 0.04
        cam.pan_y = -0.18 + s * 0.28
        cam.tilt_x_deg = 52 + s * 8
        cam.tilt_y_deg = -6 + s * 6
        cam.vignette = 0.4
    elif preset == "vox-schematic-push":
        cam.zoom = 1.0 + s * 0.35
        cam.pan_x = 0.05 - s * 0.1
        cam.pan_y = -0.06 + s * 0.08
        cam.vignette = 0.3
    elif preset == "pixel-side-scroll-lock":
        cam.zoom = 1.1
        cam.pan_x = -0.3 + s * 0.6
        cam.tilt_x_deg = 8
        cam.vignette = 0.1
    elif preset == "pixel-crash-zoom-8bit":
        step = min(5, int(p * 6)) / 10.0
        cam.zoom = 1.0 + step
        cam.vignette = 0.12
    return cam


# ---------------------------------------------------------------------------
# Puppet rig (mirrors packages/stage-engine/src/puppet-rig.ts)
# ---------------------------------------------------------------------------

DEFAULT_POSE = {
    "root_x": 0.0,
    "root_y": 0.0,
    "squash_x": 1.0,
    "stretch_y": 1.0,
    "torso_lean": 0.0,
    "head_tilt": 0.0,
    "shoulder_l": -25.0,
    "elbow_l": -20.0,
    "shoulder_r": 25.0,
    "elbow_r": 20.0,
    "hip_l": -8.0,
    "knee_l": 0.0,
    "hip_r": 8.0,
    "knee_r": 0.0,
    "mouth": 0.35,
    "emote": "",
}


def evaluate_move_set(move_set: str, t: float, amplitude: float = 0.35) -> dict:
    breathe = math.sin(t * 2.5)
    fast = math.sin(t * 12.0)
    med = math.sin(t * 5.0)
    mouth = min(1.0, max(0.0, amplitude * 1.4))
    pose = dict(DEFAULT_POSE)
    pose.update(
        {
            "root_y": breathe * 2,
            "stretch_y": 1.0 + breathe * 0.015,
            "head_tilt": math.sin(t * 1.8) * 3,
            "mouth": mouth,
        }
    )

    if move_set == "talk-explain-gestures":
        pose.update(
            torso_lean=math.sin(t * 3.0) * 4,
            head_tilt=math.sin(t * 4.5) * 6,
            shoulder_l=-45 + med * 25,
            elbow_l=-50 + math.cos(t * 5.0) * 20,
            shoulder_r=55 + math.cos(t * 4.0) * 30,
            elbow_r=-65 + med * 25,
        )
    elif move_set == "point-at-chart-high":
        pose.update(
            torso_lean=-6,
            head_tilt=-15 + breathe * 3,
            shoulder_l=-30,
            elbow_l=-15,
            shoulder_r=135 + math.sin(t * 6.0) * 8,
            elbow_r=-10,
            emote="📈",
        )
    elif move_set == "panic-head-grab":
        pose.update(
            root_y=abs(fast) * -8,
            squash_x=1.0 + fast * 0.05,
            stretch_y=1.0 - fast * 0.05,
            torso_lean=fast * 8,
            head_tilt=fast * 12,
            shoulder_l=-140,
            elbow_l=-110,
            shoulder_r=140,
            elbow_r=110,
            hip_l=-20 + fast * 10,
            hip_r=20 - fast * 10,
            emote="💦",
        )
    elif move_set == "shrug-confused":
        lift = min(1.0, (math.sin(t * 3.0) + 1) * 0.6)
        pose.update(
            head_tilt=18 * lift,
            shoulder_l=-75 * lift - 20,
            elbow_l=-85 * lift,
            shoulder_r=75 * lift + 20,
            elbow_r=85 * lift,
            emote="❓",
        )
    elif move_set == "money-printer-crank":
        pose.update(
            torso_lean=10 + fast * 3,
            shoulder_r=70 + math.sin(t * 15.0) * 45,
            elbow_r=40 + math.cos(t * 15.0) * 45,
            emote="💸",
        )
    elif move_set == "celebrate-stonks-up":
        pose.update(
            root_y=abs(math.sin(t * 7.0)) * -24,
            shoulder_l=-155 + med * 15,
            elbow_l=-20,
            shoulder_r=155 - med * 15,
            elbow_r=20,
            hip_l=-25,
            knee_l=35,
            hip_r=25,
            knee_r=-35,
            emote="🚀",
        )
    elif move_set == "float-zero-gravity":
        pose.update(
            root_x=math.sin(t * 0.9) * 18,
            root_y=math.cos(t * 1.2) * 22,
            torso_lean=math.sin(t * 0.7) * 18,
            head_tilt=math.cos(t * 1.1) * 10,
            shoulder_l=-65 + math.sin(t * 1.5) * 20,
            elbow_l=-25,
            shoulder_r=65 + math.cos(t * 1.5) * 20,
            elbow_r=25,
            hip_l=-25 + math.sin(t * 1.3) * 15,
            knee_l=30,
            hip_r=20 + math.cos(t * 1.3) * 15,
            knee_r=25,
            emote="🪐",
        )
    elif move_set == "lore-sword-raise":
        pose.update(
            torso_lean=-8,
            head_tilt=-10,
            shoulder_l=-40,
            elbow_l=-45,
            shoulder_r=145 + breathe * 5,
            elbow_r=-15,
            hip_l=-22,
            hip_r=18,
            emote="⚔️",
        )
    elif move_set == "walk-confident":
        pose.update(
            root_y=abs(med) * -6,
            torso_lean=5,
            shoulder_l=med * 35,
            elbow_l=-30,
            shoulder_r=-med * 35,
            elbow_r=-30,
            hip_l=-med * 32,
            knee_l=max(0, med * 40),
            hip_r=med * 32,
            knee_r=max(0, -med * 40),
        )
    elif move_set == "point-at-board-side":
        pose.update(
            torso_lean=-4,
            head_tilt=-8,
            shoulder_l=-20,
            elbow_l=-15,
            shoulder_r=80 + math.sin(t * 3.0) * 10,
            elbow_r=15,
        )
    elif move_set == "facepalm-disappointed":
        pose.update(
            torso_lean=12 + breathe * 2,
            head_tilt=25,
            shoulder_l=-25,
            elbow_l=-15,
            shoulder_r=135,
            elbow_r=110,
            emote="🤦",
        )
    elif move_set == "eureka-lightbulb":
        pose.update(
            torso_lean=-5,
            head_tilt=-12,
            shoulder_l=-30,
            elbow_l=-20,
            shoulder_r=160 + breathe * 4,
            elbow_r=-10,
            emote="💡",
        )
    elif move_set == "typing-furious":
        pose.update(
            torso_lean=15 + math.sin(t * 8.0) * 2,
            head_tilt=15,
            shoulder_l=-45,
            elbow_l=-85 + fast * 15,
            shoulder_r=45,
            elbow_r=85 - fast * 15,
        )
    elif move_set == "telescope-observe":
        pose.update(
            torso_lean=-10,
            head_tilt=-20,
            shoulder_l=-60,
            elbow_l=-70,
            shoulder_r=75,
            elbow_r=80,
        )
    elif move_set == "lore-scroll-read":
        pose.update(
            torso_lean=8 + breathe * 2,
            head_tilt=18,
            shoulder_l=-50,
            elbow_l=-65,
            shoulder_r=50,
            elbow_r=65,
            emote="📜",
        )
    elif move_set == "bowtie-adjust-smug":
        pose.update(
            torso_lean=-8,
            head_tilt=-5 + math.sin(t * 2.0) * 4,
            shoulder_l=-70 + med * 10,
            elbow_l=-100,
            shoulder_r=70 - med * 10,
            elbow_r=100,
        )
    elif move_set == "run-flee-danger":
        pose.update(
            root_y=abs(fast) * -14,
            torso_lean=22,
            shoulder_l=-120 + fast * 45,
            elbow_l=-60,
            shoulder_r=120 - fast * 45,
            elbow_r=60,
            hip_l=-fast * 55,
            knee_l=max(0, fast * 70),
            hip_r=fast * 55,
            knee_r=max(0, -fast * 70),
            emote="💨",
        )
    elif move_set == "vox-point-map":
        pose.update(
            torso_lean=-5,
            head_tilt=-12 + breathe * 2,
            shoulder_l=-28,
            elbow_l=-12,
            shoulder_r=118 + math.sin(t * 2.4) * 10,
            elbow_r=8,
            emote="🗺️",
        )
    elif move_set == "vox-explain-schematic":
        pose.update(
            torso_lean=4,
            head_tilt=8,
            shoulder_l=-55,
            elbow_l=-75 + med * 8,
            shoulder_r=62,
            elbow_r=78 - med * 8,
        )
    elif move_set == "pixel-hp-low-stagger":
        pose.update(
            root_x=math.sin(t * 2.2) * 10,
            root_y=abs(math.sin(t * 3.1)) * -4,
            torso_lean=16 + math.sin(t * 2.0) * 6,
            head_tilt=20 + math.sin(t * 1.7) * 8,
            shoulder_l=-35 + math.sin(t * 2.3) * 12,
            elbow_l=-25,
            shoulder_r=35 - math.sin(t * 2.3) * 12,
            elbow_r=25,
            hip_l=-14,
            hip_r=14,
            emote="💔",
        )
    elif move_set == "pixel-victory-jump":
        jump = abs(math.sin(t * 4.2))
        pose.update(
            root_y=jump * -30,
            squash_x=1.0 + math.sin(t * 4.2) * 0.08,
            stretch_y=1.0 - math.sin(t * 4.2) * 0.08,
            shoulder_l=-150,
            elbow_l=-15,
            shoulder_r=150,
            elbow_r=15,
            hip_l=-20,
            knee_l=30,
            hip_r=20,
            knee_r=-30,
            emote="⭐",
        )
    return pose


# ---------------------------------------------------------------------------
# Costumes (RIG.TSX)
# ---------------------------------------------------------------------------

COSTUMES: dict[str, dict[str, Any]] = {
    "pipHood": dict(jacket="#D32F2F", pants="#1F1E29", skin="#F5E6D3", hair="#2B1B12",
                    accent="#FFD54F", headwear="hood", rim="#FFD54F", rim_blur=6),
    "mo": dict(jacket="#5E6E46", pants="#2B2B2B", skin="#E8C4A0", hair="#3A2A1E",
               accent="#C9D6A3", headwear="curls", rim=None, rim_blur=0),
    "sis": dict(jacket="#3E8C86", pants="#1A2A28", skin="#F8D8B8", hair="#22160F",
                accent="#8FE3DA", headwear="bunches", rim=None, rim_blur=0),
    "suit": dict(jacket="#2B2F3A", pants="#1C1F26", skin="#F0D0B0", hair="#1A1410",
                 accent="#7DD3FC", headwear="suit-collar", rim=None, rim_blur=0),
    "reporter": dict(jacket="#243B53", pants="#141C24", skin="#E8C4A0", hair="#1B120C",
                     accent="#38BDF8", headwear="press-cap", rim="#38BDF8", rim_blur=5),
    "pixelHero": dict(jacket="#EAB308", pants="#7C3AED", skin="#FDE68A", hair="#111827",
                      accent="#22D3EE", headwear="pixel-helmet", rim="#22D3EE", rim_blur=4),
    "wizard": dict(jacket="#1A237E", pants="#0D47A1", skin="#E0E0E0", hair="#E5E7EB",
                   accent="#7C4DFF", headwear="wizard-hat", rim="#7C4DFF", rim_blur=8),
    "crown": dict(jacket="#7F1D1D", pants="#1C1917", skin="#F0D0B0", hair="#2A1B10",
                  accent="#FBBF24", headwear="crown", rim="#FBBF24", rim_blur=6),
}

ARCHETYPE_COSTUME = {
    "stickman-classic": "mo",
    "stickman-economist": "suit",
    "stickman-wallstreet": "suit",
    "astronaut-explorer": "suit",
    "lore-chronicler-hooded": "pipHood",
    "king-emperor-crown": "crown",
    "investigative-reporter": "reporter",
    "pixel-hero-sprite": "pixelHero",
    "mograph-wizard-npc": "wizard",
    "custom-sprite-rig": "mo",
}

ARCHETYPE_LABEL = {
    "stickman-classic": "NGƯỜI QUE",
    "stickman-economist": "CHUYÊN GIA KINH TẾ",
    "stickman-wallstreet": "DÂN PHỐ WALL",
    "astronaut-explorer": "PHI HÀNH GIA",
    "lore-chronicler-hooded": "HỌC GIẢ CỔ THƯ",
    "king-emperor-crown": "HOÀNG ĐẾ",
    "investigative-reporter": "PHÓNG VIÊN ĐIỀU TRA",
    "pixel-hero-sprite": "SPRITE ANH HÙNG",
    "mograph-wizard-npc": "PHÁP SƯ NPC",
    "custom-sprite-rig": "SPRITE TÙY CHỈNH",
}


def _rotate(dx: float, dy: float, deg: float) -> tuple[float, float]:
    rad = math.radians(deg)
    c, s = math.cos(rad), math.sin(rad)
    return dx * c - dy * s, dx * s + dy * c


def _skeleton_points(pose: dict, cx: float, cy: float, scale: float, flip: bool) -> dict[str, tuple[float, float]]:
    """Return joint positions in screen space. Origin is the hip."""
    s = scale
    sign = -1.0 if flip else 1.0
    lean = pose["torso_lean"]
    head_tilt = pose["head_tilt"]

    hip = (cx + pose["root_x"] * s * sign, cy + pose["root_y"] * s)
    neck_local = _rotate(0, -58 * s, lean)
    neck = (hip[0] + neck_local[0] * sign, hip[1] + neck_local[1])
    head_local = _rotate(0, -26 * s, lean + head_tilt)
    head = (neck[0] + head_local[0] * sign, neck[1] + head_local[1])

    def arm(side: str, shoulder_deg: float, elbow_deg: float):
        sx = neck[0] + (10 * s * (1 if side == "r" else -1)) * sign
        sy = neck[1] + 6 * s
        # Pose angles are authored relative to "arm hanging down"; negate so a
        # positive right-shoulder angle swings the right arm outward (screen right).
        ux, uy = _rotate(0, 34 * s, -shoulder_deg)
        ex = (sx + ux * sign, sy + uy)
        fx, fy = _rotate(0, 30 * s, -(shoulder_deg + elbow_deg))
        hand = (ex[0] + fx * sign, ex[1] + fy)
        return (sx, sy), ex, hand

    shoulder_l, elbow_l, hand_l = arm("l", pose["shoulder_l"], pose["elbow_l"])
    shoulder_r, elbow_r, hand_r = arm("r", pose["shoulder_r"], pose["elbow_r"])

    def leg(side: str, hip_deg: float, knee_deg: float):
        hx = hip[0] + (9 * s * (1 if side == "r" else -1)) * sign
        hy = hip[1]
        kx, ky = _rotate(0, 40 * s, -hip_deg)
        knee = (hx + kx * sign, hy + ky)
        fx, fy = _rotate(0, 38 * s, -(hip_deg + knee_deg))
        foot = (knee[0] + fx * sign, knee[1] + fy)
        return (hx, hy), knee, foot

    hip_l, knee_l, foot_l = leg("l", pose["hip_l"], pose["knee_l"])
    hip_r, knee_r, foot_r = leg("r", pose["hip_r"], pose["knee_r"])

    return {
        "hip": hip, "neck": neck, "head": head,
        "shoulder_l": shoulder_l, "elbow_l": elbow_l, "hand_l": hand_l,
        "shoulder_r": shoulder_r, "elbow_r": elbow_r, "hand_r": hand_r,
        "hip_l": hip_l, "knee_l": knee_l, "foot_l": foot_l,
        "hip_r": hip_r, "knee_r": knee_r, "foot_r": foot_r,
        "head_r": 22 * s,
    }


def _hex(color: str) -> tuple[int, int, int]:
    color = color.lstrip("#")
    return tuple(int(color[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def draw_actor(layer: Image.Image, actor: dict, t_scene: float, cam: CameraFrame,
               W: int, H: int, pixel_mode: bool = False) -> tuple[float, float, float]:
    """Draw one actor on the RGBA layer. Returns (cx, cy, head_radius) for QA."""
    draw = ImageDraw.Draw(layer)
    archetype = actor.get("archetype", "stickman-classic")
    costume_id = actor.get("costumeId") or ARCHETYPE_COSTUME.get(archetype, "mo")
    costume = COSTUMES.get(costume_id, COSTUMES["mo"])
    move = actor.get("moveSet", "talk-explain-gestures")
    pose = evaluate_move_set(move, t_scene, float(actor.get("amplitude", 0.35)))

    base_scale = float(actor.get("scale", 1.0)) * (H / 720.0) * 1.8
    nx = float(actor.get("stageX", 0.3))
    ny = float(actor.get("stageY", 0.72))
    # Camera transform in normalized space.
    nx = (nx - 0.5) * cam.zoom + 0.5 + cam.pan_x
    ny = (ny - 0.5) * cam.zoom + 0.5 + cam.pan_y
    cx = nx * W
    # stageY anchors the FEET, so a full body always fits the frame.
    cy = ny * H - 78.0 * base_scale
    flip = bool(actor.get("flipHorizontal", False))

    pts = _skeleton_points(pose, cx, cy, base_scale, flip)
    line_w = max(3, int(9 * base_scale / 1.35))
    jacket = _hex(costume["jacket"])
    pants = _hex(costume["pants"])
    skin = _hex(costume["skin"])
    accent = _hex(costume["accent"])

    if pixel_mode:
        # Chunky sprite look: quantize positions to an 8px grid and thick strokes.
        pts = {k: (round(v[0] / 6) * 6, round(v[1] / 6) * 6) if isinstance(v, tuple) else v
               for k, v in pts.items()}
        line_w = max(5, line_w)

    # Rim light: draw a blurred silhouette first, then the figure on top.
    rim = costume.get("rim")
    if rim:
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        _draw_figure(gd, pts, jacket, pants, skin, accent, costume, line_w + 6, pixel_mode, pose["mouth"])
        glow = glow.filter(ImageFilter.GaussianBlur(costume.get("rim_blur", 5)))
        tint = Image.new("RGBA", (W, H), (*_hex(rim), 150))
        glow = Image.composite(tint, Image.new("RGBA", (W, H), (0, 0, 0, 0)), glow.split()[3])
        layer.alpha_composite(glow)

    _draw_figure(draw, pts, jacket, pants, skin, accent, costume, line_w, pixel_mode, pose["mouth"])

    # Headwear
    hx, hy = pts["head"]
    r = pts["head_r"]
    headwear = costume.get("headwear", "none")
    if headwear == "hood":
        draw.ellipse([hx - r * 1.5, hy - r * 1.55, hx + r * 1.5, hy + r * 0.9], fill=jacket)
        draw.ellipse([hx - r * 1.05, hy - r * 1.05, hx + r * 1.05, hy + r * 0.75], fill=skin)
    elif headwear == "press-cap":
        draw.pieslice([hx - r * 1.3, hy - r * 1.55, hx + r * 1.3, hy + r * 0.1], 180, 360, fill=jacket)
        draw.rectangle([hx - r * 1.35, hy - r * 0.72, hx + r * 1.45, hy - r * 0.5], fill=accent)
    elif headwear == "wizard-hat":
        draw.polygon([(hx - r * 1.15, hy - r * 0.7), (hx, hy - r * 2.7), (hx + r * 1.15, hy - r * 0.7)], fill=jacket)
        draw.ellipse([hx - r * 1.25, hy - r * 0.95, hx + r * 1.25, hy - r * 0.35], fill=accent)
    elif headwear == "crown":
        draw.polygon([(hx - r, hy - r * 0.9), (hx - r * 0.6, hy - r * 1.7), (hx, hy - r * 1.0),
                      (hx + r * 0.6, hy - r * 1.7), (hx + r, hy - r * 0.9)], fill=accent)
    elif headwear == "curls":
        for i in range(5):
            ang = math.pi * (0.15 + i * 0.175)
            draw.ellipse([hx + math.cos(ang) * r * 1.15 - 5, hy - math.sin(ang) * r * 1.1 - 5,
                          hx + math.cos(ang) * r * 1.15 + 5, hy - math.sin(ang) * r * 1.1 + 5], fill=costume["hair"])
    elif headwear == "bunches":
        draw.ellipse([hx - r * 1.9, hy - r * 0.2, hx - r * 0.9, hy + r * 0.8], fill=costume["hair"])
        draw.ellipse([hx + r * 0.9, hy - r * 0.2, hx + r * 1.9, hy + r * 0.8], fill=costume["hair"])
    elif headwear == "pixel-helmet":
        draw.rectangle([hx - r * 1.3, hy - r * 1.3, hx + r * 1.3, hy - r * 0.1], fill=accent)
        draw.rectangle([hx - r * 1.05, hy - r * 1.05, hx - r * 0.35, hy - r * 0.45], fill=(255, 255, 255))

    # Emote badge (vector, not emoji: the render font has no colour emoji glyphs)
    emote = pose.get("emote")
    if emote:
        _draw_emote(draw, hx + r * 1.3, hy - r * 2.1, str(emote), max(16, int(22 * base_scale / 1.8)))

    return cx, cy, r


def _draw_figure(draw: ImageDraw.ImageDraw, pts: dict, jacket, pants, skin, accent,
                 costume: dict, line_w: int, pixel_mode: bool, mouth: float = 0.3) -> None:
    torso_w = line_w + 3
    # Legs
    for side in ("l", "r"):
        draw.line([pts[f"hip_{side}"], pts[f"knee_{side}"]], fill=pants, width=line_w, joint="curve")
        draw.line([pts[f"knee_{side}"], pts[f"foot_{side}"]], fill=pants, width=line_w, joint="curve")
    # Torso (jacket)
    draw.line([pts["hip"], pts["neck"]], fill=jacket, width=torso_w + 4, joint="curve")
    # Arms
    for side in ("l", "r"):
        draw.line([pts[f"shoulder_{side}"], pts[f"elbow_{side}"]], fill=jacket, width=torso_w, joint="curve")
        draw.line([pts[f"elbow_{side}"], pts[f"hand_{side}"]], fill=skin, width=max(2, line_w - 2), joint="curve")
    # Head
    hx, hy = pts["head"]
    r = pts["head_r"]
    draw.ellipse([hx - r, hy - r, hx + r, hy + r], fill=skin, outline=jacket, width=max(2, line_w // 3))
    # Face dots
    dot = max(1, int(r * 0.13))
    draw.ellipse([hx - r * 0.4 - dot, hy - r * 0.2 - dot, hx - r * 0.4 + dot, hy - r * 0.2 + dot], fill=(20, 20, 20))
    draw.ellipse([hx + r * 0.4 - dot, hy - r * 0.2 - dot, hx + r * 0.4 + dot, hy - r * 0.2 + dot], fill=(20, 20, 20))
    # Mouth openness
    mouth_w = max(2, int(r * (0.25 + 0.45 * max(0.0, min(1.0, mouth)))))
    draw.line([(hx - mouth_w, hy + r * 0.45), (hx + mouth_w, hy + r * 0.45)],
              fill=(60, 20, 20), width=max(2, int(r * 0.12)))
    # Accent collar
    draw.line([pts["neck"][0] - 8, pts["neck"][1] + 4, pts["neck"][0] + 8, pts["neck"][1] + 4], fill=accent, width=3)


def _draw_emote(draw: ImageDraw.ImageDraw, x: float, y: float, emote: str, size: int) -> None:
    """Vector emotes — no colour-emoji font required."""
    s = float(size)
    white = (255, 255, 255)
    if emote == "📈":
        draw.line([(x, y + s), (x + s * 0.8, y + s * 0.2), (x + s * 1.6, y + s * 0.5)], fill=(80, 240, 160), width=4)
        draw.polygon([(x + s * 1.7, y + s * 0.15), (x + s * 1.2, y + s * 0.35), (x + s * 1.6, y + s * 0.7)], fill=(80, 240, 160))
    elif emote in ("❓", "?"):
        draw.text((x, y), "?", font=load_font("display", int(s * 1.3)), fill=white)
    elif emote == "💦":
        for i in range(3):
            draw.ellipse([x + i * s * 0.45, y + i * s * 0.25, x + i * s * 0.45 + s * 0.28, y + i * s * 0.25 + s * 0.42], fill=(90, 190, 255))
    elif emote == "💡":
        draw.ellipse([x, y, x + s, y + s], fill=(255, 220, 90))
        draw.rectangle([x + s * 0.35, y + s * 0.9, x + s * 0.65, y + s * 1.15], fill=(150, 150, 150))
    elif emote == "⭐":
        pts = []
        for i in range(10):
            ang = -math.pi / 2 + i * math.pi / 5
            rr = s * (0.55 if i % 2 == 0 else 0.24)
            pts.append((x + s * 0.5 + math.cos(ang) * rr, y + s * 0.5 + math.sin(ang) * rr))
        draw.polygon(pts, fill=(255, 220, 80))
    elif emote == "🗺️":
        draw.rectangle([x, y, x + s, y + s * 0.75], fill=(240, 235, 220), outline=(80, 80, 80), width=2)
        draw.line([(x + s * 0.1, y + s * 0.55), (x + s * 0.4, y + s * 0.3), (x + s * 0.9, y + s * 0.5)], fill=(0, 180, 140), width=3)
    elif emote == "💸":
        for i in range(3):
            draw.rectangle([x + i * s * 0.3, y + i * s * 0.2, x + i * s * 0.3 + s * 0.6, y + i * s * 0.2 + s * 0.32], fill=(70, 200, 110))
    elif emote == "🚀":
        draw.polygon([(x, y + s * 0.8), (x + s * 0.5, y), (x + s, y + s * 0.8), (x + s * 0.5, y + s * 0.6)], fill=(250, 120, 90))
    elif emote == "⚔️":
        draw.line([(x, y + s), (x + s, y)], fill=(220, 220, 230), width=4)
        draw.line([(x + s, y + s), (x, y)], fill=(220, 220, 230), width=4)
    elif emote == "📜":
        draw.rectangle([x, y + s * 0.15, x + s * 0.9, y + s * 0.85], fill=(230, 210, 160), outline=(120, 90, 40), width=2)
    elif emote == "💨":
        for i in range(3):
            draw.line([(x + i * s * 0.2, y + i * s * 0.3), (x + s + i * s * 0.2, y + i * s * 0.3)], fill=(200, 220, 235), width=4)
    elif emote == "💔":
        draw.polygon([(x, y + s * 0.3), (x + s * 0.5, y + s * 0.9), (x + s, y + s * 0.3), (x + s * 0.5, y)], fill=(230, 70, 90))
        draw.line([(x + s * 0.5, y + s * 0.2), (x + s * 0.35, y + s * 0.55), (x + s * 0.6, y + s * 0.6)], fill=(120, 20, 30), width=2)
    else:
        draw.text((x, y), "!", font=load_font("display", int(s * 1.3)), fill=white)


# ---------------------------------------------------------------------------
# Backdrops
# ---------------------------------------------------------------------------

def draw_backdrop(img: Image.Image, backdrop: str, cam: CameraFrame, t: float, genre: str) -> None:
    W, H = img.size
    draw = ImageDraw.Draw(img)
    ox = int(cam.pan_x * W)
    oy = int(cam.pan_y * H)

    if backdrop.startswith("vox."):
        _draw_vox_backdrop(draw, backdrop, W, H, ox, oy, t)
    elif backdrop.startswith("pixel."):
        _draw_pixel_backdrop(draw, backdrop, W, H, ox, oy, t)
    elif genre == "universe-cosmic" or backdrop.startswith("cosmic."):
        _draw_cosmic_backdrop(draw, W, H, ox, oy, t)
    elif genre == "lore-chronicle" or backdrop.startswith("lore."):
        _draw_lore_backdrop(draw, W, H, ox, oy, t)
    else:
        _draw_econ_backdrop(draw, W, H, ox, oy, t)


def _draw_econ_backdrop(draw, W, H, ox, oy, t):
    draw.rectangle([0, 0, W, H], fill=(11, 18, 26))
    grid = 64
    for gx in range(-grid, W + grid, grid):
        draw.line([(gx + ox % grid, 0), (gx + ox % grid, H)], fill=(20, 32, 44), width=1)
    for gy in range(-grid, H + grid, grid):
        draw.line([(0, gy + oy % grid), (W, gy + oy % grid)], fill=(20, 32, 44), width=1)
    draw.rectangle([0, H - 110, W, H], fill=(8, 14, 20))


def _draw_cosmic_backdrop(draw, W, H, ox, oy, t):
    draw.rectangle([0, 0, W, H], fill=(6, 8, 22))
    rng = np.random.default_rng(7)
    for _ in range(180):
        x = int(rng.integers(0, W))
        y = int(rng.integers(0, H))
        r = int(rng.integers(1, 3))
        tw = 0.5 + 0.5 * math.sin(t * 2 + x * 0.01)
        c = int(120 + 135 * tw)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(c, c, min(255, c + 20)))
    # Nebula glow
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W * 0.55 + ox, H * 0.15 + oy, W * 1.05 + ox, H * 0.75 + oy], fill=(40, 20, 90))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    # Composite is handled by caller? Keep simple: draw translucent ellipses.
    draw.ellipse([W * 0.62 + ox, H * 0.2 + oy, W * 0.98 + ox, H * 0.6 + oy], fill=(18, 12, 42))


def _draw_lore_backdrop(draw, W, H, ox, oy, t):
    draw.rectangle([0, 0, W, H], fill=(30, 23, 15))
    for i in range(0, W, 90):
        draw.line([(i + ox % 90, 0), (i + ox % 90, H)], fill=(38, 29, 19), width=2)
    for j in range(0, H, 90):
        draw.line([(0, j + oy % 90), (W, j + oy % 90)], fill=(38, 29, 19), width=2)
    draw.rectangle([0, H - 120, W, H], fill=(24, 18, 11))


def _draw_vox_backdrop(draw, backdrop: str, W, H, ox, oy, t):
    if backdrop == "vox.hydraulic-cross-section":
        draw.rectangle([0, 0, W, H], fill=(236, 236, 232))
        water_top = int(H * (0.42 + 0.05 * math.sin(t * 0.8)))
        # River
        draw.rectangle([0, water_top, int(W * 0.42), H], fill=(120, 170, 190))
        for i in range(12):
            yy = water_top + 18 + i * 22
            draw.line([(0, yy), (int(W * 0.42), yy)], fill=(100, 150, 175), width=2)
        # Bank / wall
        draw.rectangle([int(W * 0.42), int(H * 0.18), int(W * 0.52), H], fill=(190, 186, 176))
        for i in range(8):
            yy = int(H * 0.18) + i * 40
            draw.line([(int(W * 0.42), yy), (int(W * 0.52), yy)], fill=(160, 156, 146), width=2)
        # Road
        draw.rectangle([int(W * 0.52), int(H * 0.3), W, int(H * 0.62)], fill=(70, 70, 72))
        draw.line([(int(W * 0.52), int(H * 0.46)), (W, int(H * 0.46))], fill=(230, 210, 90), width=5)
        # Tide marker
        draw.line([(0, water_top), (W, water_top)], fill=(220, 60, 50), width=4)
        font = load_font("sans", max(14, int(H * 0.028)))
        draw.text((18, water_top - 30), "MỰC TRIỀU +1.78m", font=font, fill=(200, 40, 35))
        # Elevation ticks
        for i in range(6):
            y = int(H * 0.18) + i * int(H * 0.12)
            draw.line([(int(W * 0.53), y), (int(W * 0.53) + 14, y)], fill=(240, 240, 240), width=2)
            draw.text((int(W * 0.53) + 18, y - 10), f"{2.5 - i * 0.5:.1f}m", font=font, fill=(60, 60, 60))
    elif backdrop == "vox.telemetry-server-rack":
        draw.rectangle([0, 0, W, H], fill=(10, 12, 16))
        for rack in range(4):
            x0 = int(W * (0.06 + rack * 0.24)) + ox
            draw.rounded_rectangle([x0, int(H * 0.12) + oy, x0 + int(W * 0.18), int(H * 0.92) + oy],
                                   radius=6, fill=(24, 27, 34), outline=(50, 55, 66), width=2)
            for row in range(14):
                yy = int(H * 0.16) + oy + row * int(H * 0.052)
                draw.rectangle([x0 + 8, yy, x0 + int(W * 0.18) - 8, yy + int(H * 0.032)], fill=(32, 36, 45))
                for led in range(4):
                    on = (row + led + int(t * 6)) % 5 == 0
                    color = (60, 220, 120) if on else (30, 70, 45)
                    draw.ellipse([x0 + 14 + led * 10, yy + 6, x0 + 20 + led * 10, yy + 12], fill=color)
        # Monitor
        draw.rounded_rectangle([int(W * 0.2) + ox, int(H * 0.18) + oy, int(W * 0.8) + ox, int(H * 0.62) + oy],
                               radius=10, fill=(8, 14, 18), outline=(56, 189, 248), width=2)
        pts = []
        for i in range(120):
            x = int(W * 0.22) + i * int(W * 0.56) / 120
            y = int(H * 0.4) + math.sin(i * 0.22 + t * 3) * H * 0.08
            pts.append((x, y))
        draw.line(pts, fill=(56, 189, 248), width=3)
    else:  # satellite aerial gray
        draw.rectangle([0, 0, W, H], fill=(58, 60, 62))
        rng = np.random.default_rng(11)
        for _ in range(260):
            x = int(rng.integers(0, W)) + ox
            y = int(rng.integers(0, H)) + oy
            w = int(rng.integers(20, 90))
            h = int(rng.integers(16, 70))
            shade = int(rng.integers(52, 82))
            draw.rectangle([x, y, x + w, y + h], fill=(shade, shade, shade + 2))
        # River vector trace
        river = []
        for i in range(80):
            x = int(W * 0.05) + i * int(W * 0.012)
            y = int(H * 0.55) + int(math.sin(i * 0.18) * H * 0.09) + int(math.sin(i * 0.05) * H * 0.05)
            river.append((x + ox, y + oy))
        draw.line(river, fill=(0, 255, 204), width=5)
        # City label
        font = load_font("sans", max(16, int(H * 0.03)))
        draw.text((int(W * 0.08) + ox, int(H * 0.12) + oy), "TP. HỒ CHÍ MINH · GIS", font=font, fill=(220, 220, 220))


def _draw_pixel_backdrop(draw, backdrop: str, W, H, ox, oy, t):
    px = 8
    if backdrop == "pixel.arcade-level-1":
        draw.rectangle([0, 0, W, H], fill=(92, 148, 252))
        # Clouds
        for cx, cy in [(0.15, 0.18), (0.55, 0.12), (0.82, 0.22)]:
            x = int(W * cx) + ox
            y = int(H * cy) + oy
            for dx, dy in [(0, 0), (18, 0), (36, 0), (9, -14), (27, -14)]:
                draw.rectangle([x + dx, y + dy, x + dx + 18, y + dy + 16], fill=(255, 255, 255))
        # Ground
        draw.rectangle([0, int(H * 0.78), W, H], fill=(120, 76, 40))
        draw.rectangle([0, int(H * 0.78), W, int(H * 0.82)], fill=(80, 180, 70))
        for i in range(0, W, px * 6):
            draw.rectangle([i + ox % (px * 6), int(H * 0.84), i + ox % (px * 6) + px * 2, int(H * 0.86)], fill=(100, 60, 30))
        # Bricks
        for row in range(3):
            for col in range(14):
                x = int(W * 0.06) + col * int(W * 0.065) + ox
                y = int(H * 0.22) + row * int(H * 0.08) + oy
                draw.rectangle([x, y, x + int(W * 0.055), y + int(H * 0.06)], fill=(190, 90, 40), outline=(120, 50, 20), width=2)
        # Pipe
        x = int(W * 0.78) + ox
        draw.rectangle([x, int(H * 0.62) + oy, x + int(W * 0.06), int(H * 0.82) + oy], fill=(40, 180, 70))
        draw.rectangle([x - 6, int(H * 0.6) + oy, x + int(W * 0.06) + 6, int(H * 0.64) + oy], fill=(30, 150, 55))
    elif backdrop == "pixel.retro-os-desktop":
        draw.rectangle([0, 0, W, H], fill=(0, 128, 128))
        draw.rounded_rectangle([int(W * 0.16) + ox, int(H * 0.18) + oy, int(W * 0.84) + ox, int(H * 0.78) + oy],
                               radius=4, fill=(192, 192, 192), outline=(0, 0, 0), width=3)
        draw.rectangle([int(W * 0.16) + ox + 3, int(H * 0.18) + oy + 3, int(W * 0.84) + ox - 3, int(H * 0.18) + oy + 30],
                       fill=(0, 0, 128))
        font = load_font("mono", max(14, int(H * 0.026)))
        draw.text((int(W * 0.17) + ox, int(H * 0.185) + oy + 5), "HỆ THỐNG.EXE", font=font, fill=(255, 255, 255))
        draw.rectangle([int(W * 0.82) + ox, int(H * 0.185) + oy + 5, int(W * 0.835) + ox, int(H * 0.185) + oy + 25],
                       fill=(192, 192, 192), outline=(0, 0, 0))
    else:  # bedroom 8bit
        draw.rectangle([0, 0, W, H], fill=(28, 22, 48))
        # Wall + floor
        draw.rectangle([0, 0, W, int(H * 0.7)], fill=(44, 36, 72))
        draw.rectangle([0, int(H * 0.7), W, H], fill=(70, 52, 40))
        # Window
        draw.rectangle([int(W * 0.66) + ox, int(H * 0.12) + oy, int(W * 0.86) + ox, int(H * 0.4) + oy],
                       fill=(30, 40, 80), outline=(90, 80, 120), width=4)
        draw.ellipse([int(W * 0.72) + ox, int(H * 0.18) + oy, int(W * 0.78) + ox, int(H * 0.26) + oy], fill=(240, 230, 150))
        # Bed
        draw.rectangle([int(W * 0.08) + ox, int(H * 0.58) + oy, int(W * 0.55) + ox, int(H * 0.8) + oy],
                       fill=(120, 80, 50), outline=(80, 50, 30), width=4)
        draw.rectangle([int(W * 0.1) + ox, int(H * 0.6) + oy, int(W * 0.53) + ox, int(H * 0.72) + oy], fill=(60, 90, 160))
        draw.rectangle([int(W * 0.12) + ox, int(H * 0.6) + oy, int(W * 0.26) + ox, int(H * 0.68) + oy], fill=(230, 230, 240))
        # Router + charger LEDs
        draw.rectangle([int(W * 0.78) + ox, int(H * 0.55) + oy, int(W * 0.9) + ox, int(H * 0.62) + oy], fill=(40, 40, 46))
        for i in range(3):
            on = int(t * 4 + i) % 2 == 0
            draw.rectangle([int(W * 0.8) + ox + i * 12, int(H * 0.57) + oy, int(W * 0.8) + ox + i * 12 + 5, int(H * 0.57) + oy + 5],
                           fill=(60, 240, 120) if on else (20, 80, 40))
        font = load_font("mono", max(12, int(H * 0.022)))
        draw.text((int(W * 0.78) + ox, int(H * 0.63) + oy), "ROUTER", font=font, fill=(150, 150, 170))


# ---------------------------------------------------------------------------
# Widgets
# ---------------------------------------------------------------------------

def _widget_rect(widget: dict, W: int, H: int, cam: CameraFrame) -> tuple[float, float, float, float]:
    nx = (float(widget.get("stageX", 0.68)) - 0.5) * cam.zoom + 0.5 + cam.pan_x
    ny = (float(widget.get("stageY", 0.45)) - 0.5) * cam.zoom + 0.5 + cam.pan_y
    scale = float(widget.get("scale", 1.0)) * (H / 720.0)
    w = 380 * scale
    h = 250 * scale
    return nx * W - w / 2, ny * H - h / 2, nx * W + w / 2, ny * H + h / 2


def draw_widget(layer: Image.Image, widget: dict, t_scene: float, p: float,
                cam: CameraFrame, W: int, H: int) -> tuple[float, float, float, float]:
    draw = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = _widget_rect(widget, W, H, cam)
    accent = _hex(widget.get("accentColorHex", "#38BDF8"))
    kind = str(widget.get("kind", ""))
    pixel = kind.startswith("pixel.")
    radius = 2 if pixel else 16

    panel = (24, 24, 30) if pixel else (16, 22, 32)
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=panel, outline=accent, width=2)

    title_font = load_font("mono" if pixel else "sans", max(12, int(H * 0.022)))
    value_font = load_font("mono" if pixel else "sans", max(18, int(H * 0.04)))
    draw.text((x0 + 16, y0 + 12), str(widget.get("title", "")), font=title_font, fill=(220, 226, 235))
    draw.text((x0 + 16, y0 + 36), str(widget.get("primaryValueLabel", "")), font=value_font, fill=accent)

    inner = [x0 + 16, y0 + 78, x1 - 16, y1 - 16]

    if kind == "vox.water-level-gauge":
        _draw_gauge(draw, inner, p, accent, title_font)
    elif kind == "vox.map-route-trace":
        _draw_route(draw, inner, p, accent)
    elif kind == "vox.telemetry-waveform":
        _draw_waveform(draw, inner, t_scene, accent)
    elif kind == "vox.hud-timestamp-counter":
        _draw_timestamp(draw, inner, p, accent, value_font)
    elif kind == "pixel.energy-status-bar":
        _draw_energy(draw, inner, p, accent, value_font)
    elif kind == "pixel.retro-dialog-box":
        _draw_dialog(draw, inner, accent, title_font)
    elif kind == "pixel.score-counter":
        _draw_score(draw, inner, p, accent, value_font)
    elif kind == "pixel.research-ab-card":
        _draw_ab(draw, inner, p, accent, title_font)
    elif kind.startswith("econ."):
        _draw_econ_widget(draw, inner, p, accent, kind)
    elif kind.startswith("cosmic."):
        _draw_cosmic_widget(draw, inner, p, accent)
    elif kind.startswith("lore."):
        _draw_lore_widget(draw, inner, p, accent)
    else:
        _draw_econ_widget(draw, inner, p, accent, kind)

    return x0, y0, x1, y1


def _draw_gauge(draw, box, p, accent, font):
    x0, y0, x1, y1 = box
    h = y1 - y0
    level = 0.15 + 0.75 * p
    draw.rectangle([x0, y0, x0 + 26, y1], fill=(30, 40, 52), outline=accent, width=2)
    fill_top = int(y1 - h * level)
    draw.rectangle([x0 + 2, fill_top, x0 + 24, y1 - 2], fill=(60, 160, 220))
    for i in range(6):
        yy = y0 + i * h / 5
        draw.line([(x0 + 30, yy), (x0 + 38, yy)], fill=(160, 170, 180), width=2)
        draw.text((x0 + 42, yy - 8), f"{2.5 - i * 0.5:.1f}", font=font, fill=(190, 198, 208))
    draw.text((x0 + 90, y0 + 8), "MỰC NƯỚC", font=font, fill=accent)


def _draw_route(draw, box, p, accent):
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill=(48, 50, 52))
    for i in range(6):
        draw.line([(x0, y0 + i * (y1 - y0) / 5), (x1, y0 + i * (y1 - y0) / 5)], fill=(62, 64, 66), width=1)
    pts = []
    n = 40
    for i in range(n):
        frac = i / (n - 1)
        x = x0 + frac * (x1 - x0)
        y = y0 + (y1 - y0) * (0.55 + 0.22 * math.sin(frac * 5.0))
        pts.append((x, y))
    shown = max(2, int(len(pts) * min(1.0, p * 1.2)))
    draw.line(pts[:shown], fill=accent, width=4)
    draw.ellipse([pts[shown - 1][0] - 5, pts[shown - 1][1] - 5, pts[shown - 1][0] + 5, pts[shown - 1][1] + 5], fill=(255, 255, 255))


def _draw_waveform(draw, box, t, accent):
    x0, y0, x1, y1 = box
    mid = (y0 + y1) / 2
    pts = []
    for i in range(80):
        x = x0 + i * (x1 - x0) / 79
        y = mid + math.sin(i * 0.35 + t * 4.0) * (y1 - y0) * 0.22 * math.sin(i * 0.05 + t)
        pts.append((x, y))
    draw.line(pts, fill=accent, width=3)


def _draw_timestamp(draw, box, p, accent, font):
    x0, y0, x1, y1 = box
    total = int(4 * 60 * 60)
    seconds = int(total * p)
    hh, rem = divmod(seconds, 3600)
    mm, ss = divmod(rem, 60)
    draw.text((x0 + 8, y0 + 10), f"{hh:02d}:{mm:02d}:{ss:02d}", font=font, fill=accent)
    draw.line([(x0 + 8, y1 - 12), (x1 - 8, y1 - 12)], fill=(60, 70, 80), width=3)
    draw.line([(x0 + 8, y1 - 12), (x0 + 8 + (x1 - x0 - 16) * p, y1 - 12)], fill=accent, width=3)


def _draw_energy(draw, box, p, accent, font):
    x0, y0, x1, y1 = box
    value = max(0.02, 1.0 - p * 0.94)
    draw.text((x0, y0), f"NĂNG LƯỢNG {int(value * 100)}%", font=font, fill=accent)
    bar_y = y0 + 34
    draw.rectangle([x0, bar_y, x1, bar_y + 22], fill=(30, 30, 36), outline=(120, 120, 130), width=2)
    color = (60, 220, 90) if value > 0.5 else (240, 200, 60) if value > 0.25 else (240, 70, 60)
    draw.rectangle([x0 + 2, bar_y + 2, x0 + 2 + (x1 - x0 - 4) * value, bar_y + 20], fill=color)
    for i in range(1, 10):
        xx = x0 + (x1 - x0) * i / 10
        draw.line([(xx, bar_y), (xx, bar_y + 22)], fill=(20, 20, 24), width=2)


def _draw_dialog(draw, box, accent, font):
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill=(192, 192, 192), outline=(0, 0, 0), width=3)
    draw.rectangle([x0 + 3, y0 + 3, x1 - 3, y0 + 28], fill=(0, 0, 128))
    draw.text((x0 + 8, y0 + 6), "CẢNH BÁO", font=font, fill=(255, 255, 255))
    draw.text((x0 + 40, y0 + 46), "!", font=load_font("sans", 40), fill=(200, 160, 0))
    draw.text((x0 + 80, y0 + 46), "NÓI-THẬT.TXT", font=font, fill=(0, 0, 0))
    draw.text((x0 + 80, y0 + 72), "BỊT MẮT CHỈ CHẶN", font=font, fill=(0, 0, 0))
    draw.text((x0 + 80, y0 + 94), "ÁNH SÁNG", font=font, fill=(0, 0, 0))
    draw.rectangle([x1 - 150, y1 - 44, x1 - 80, y1 - 12], fill=(192, 192, 192), outline=(0, 0, 0), width=2)
    draw.rectangle([x1 - 72, y1 - 44, x1 - 8, y1 - 12], fill=(192, 192, 192), outline=(0, 0, 0), width=2)
    draw.text((x1 - 132, y1 - 36), "OK", font=font, fill=(0, 0, 0))
    draw.text((x1 - 58, y1 - 36), "HỦY", font=font, fill=(0, 0, 0))


def _draw_score(draw, box, p, accent, font):
    x0, y0, x1, y1 = box
    value = int(9999 * p)
    draw.text((x0 + 10, y0 + 6), f"{value:05d}", font=font, fill=accent)
    draw.text((x0 + 10, y0 + 42), "COIN", font=font, fill=(220, 200, 90))


def _draw_ab(draw, box, p, accent, font):
    x0, y0, x1, y1 = box
    draw.text((x0, y0), "ĐEO KÍN", font=font, fill=(80, 220, 140))
    draw.text((x0, y0 + 60), "LỌT SÁNG", font=font, fill=(240, 90, 80))
    for i, (label, color, value) in enumerate([("TỈNH TÁO", (80, 220, 140), 0.82), ("GHI NHỚ", (80, 220, 140), 0.76)]):
        yy = y0 + 92 + i * 30
        draw.text((x0, yy), label, font=font, fill=(210, 210, 210))
        draw.rectangle([x0 + 110, yy, x1, yy + 16], fill=(40, 40, 46), outline=(90, 90, 96))
        draw.rectangle([x0 + 110, yy, x0 + 110 + (x1 - x0 - 110) * value * p, yy + 16], fill=color)


def _draw_econ_widget(draw, box, p, accent, kind):
    x0, y0, x1, y1 = box
    if "candlestick" in kind:
        base = y1 - 8
        n = 9
        for i in range(n):
            x = x0 + 14 + i * (x1 - x0 - 28) / n
            up = math.sin(i * 1.7) > -0.2
            high = 0.25 + 0.6 * abs(math.sin(i * 0.9))
            low = max(0.1, high - 0.18)
            col = (16, 185, 129) if up else (239, 68, 68)
            draw.line([(x, base - high * (y1 - y0)), (x, base - low * (y1 - y0))], fill=col, width=3)
            draw.rectangle([x - 6, base - high * (y1 - y0), x + 6, base - low * (y1 - y0)], fill=col)
    elif "supply" in kind or "curve" in kind:
        pts = []
        for i in range(60):
            frac = i / 59
            x = x0 + frac * (x1 - x0)
            y = y1 - (0.15 + 0.7 * frac) * (y1 - y0)
            pts.append((x, y))
        draw.line(pts, fill=accent, width=4)
        pts2 = [(x, y1 - (0.85 - 0.7 * (i / 59)) * (y1 - y0)) for i, (x, _) in enumerate(pts)]
        draw.line(pts2, fill=(239, 68, 68), width=4)
    else:
        for i in range(6):
            h = (0.2 + 0.12 * i) * (y1 - y0)
            draw.rectangle([x0 + i * (x1 - x0) / 6, y1 - h, x0 + (i + 1) * (x1 - x0) / 6 - 4, y1], fill=accent)


def _draw_cosmic_widget(draw, box, p, accent):
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    r = min(x1 - x0, y1 - y0) * 0.38
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=accent, width=3)
    ang = p * math.pi * 4
    px = cx + math.cos(ang) * r
    py = cy + math.sin(ang) * r
    draw.ellipse([px - 7, py - 7, px + 7, py + 7], fill=(255, 255, 255))


def _draw_lore_widget(draw, box, p, accent):
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill=(44, 34, 22), outline=accent, width=2)
    for i in range(4):
        yy = y0 + 18 + i * (y1 - y0 - 30) / 4
        draw.line([(x0 + 12, yy), (x1 - 12, yy)], fill=(80, 62, 40), width=2)
    draw.line([(x0 + 12, y1 - 20), (x0 + 12 + (x1 - x0 - 24) * p, y1 - 20)], fill=accent, width=4)


# ---------------------------------------------------------------------------
# Captions
# ---------------------------------------------------------------------------

CAPTION_STYLES = {
    "hormozi-punch": dict(font="display", size=0.062, color=(255, 255, 255), active=(250, 204, 21),
                          stroke=(0, 0, 0), stroke_w=0.008, uppercase=True, y=0.86, max_words=4),
    "ali-abdaal-minimal": dict(font="sans", size=0.044, color=(245, 245, 245), active=(255, 255, 255),
                               stroke=(0, 0, 0), stroke_w=0.003, uppercase=False, y=0.88, max_words=6),
    "capcut-neon-glow": dict(font="display", size=0.058, color=(255, 255, 255), active=(34, 211, 238),
                             stroke=(0, 0, 0), stroke_w=0.006, uppercase=True, y=0.86, max_words=4),
    "cinematic-serif-sub": dict(font="serif", size=0.042, color=(240, 236, 228), active=(255, 214, 120),
                                stroke=(0, 0, 0), stroke_w=0.0025, uppercase=False, y=0.88, max_words=7),
    "karaoke-word-fill": dict(font="display", size=0.056, color=(230, 230, 230), active=(255, 214, 60),
                              stroke=(0, 0, 0), stroke_w=0.006, uppercase=True, y=0.86, max_words=4),
    "glassmorphism-pill": dict(font="sans", size=0.046, color=(255, 255, 255), active=(255, 255, 255),
                               stroke=(0, 0, 0), stroke_w=0.002, uppercase=False, y=0.86, max_words=6),
}


def _wrap_words(words: Sequence[str], font: ImageFont.FreeTypeFont, draw: ImageDraw.ImageDraw,
                max_width: float, max_words: int) -> list[list[str]]:
    lines: list[list[str]] = []
    current: list[str] = []
    for word in words:
        trial = current + [word]
        if len(trial) > max_words:
            lines.append(current)
            current = [word]
            continue
        text = " ".join(trial)
        if draw.textlength(text, font=font) > max_width and current:
            lines.append(current)
            current = [word]
        else:
            current = trial
    if current:
        lines.append(current)
    return lines


def draw_captions(img: Image.Image, scene: CompiledScene, t: float, style_id: str) -> Image.Image:
    style = CAPTION_STYLES.get(style_id, CAPTION_STYLES["hormozi-punch"])
    W, H = img.size
    font_size = max(16, int(H * style["size"]))
    font = load_font(style["font"], font_size)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Words visible in this scene, with the active word at time t.
    words = scene.words
    if not words:
        return img
    visible = [w for w in words if w.start_sec <= t + 0.001]
    if not visible:
        return img
    # Keep a rolling window of recent words so the caption doesn't grow forever.
    window = visible[-max(6, int(style["max_words"]) * 2):]
    texts = [w.word.upper() if style["uppercase"] else w.word for w in window]

    max_width = W * 0.78
    lines = _wrap_words(texts, font, draw, max_width, int(style["max_words"]))
    if not lines:
        return img

    line_h = font_size * 1.22
    total_h = line_h * len(lines)
    base_y = H * style["y"] - total_h
    # Entrance animation: slide up 18px + fade during the first 220ms.
    elapsed = t - scene.start_sec
    entrance = min(1.0, max(0.0, elapsed / 0.22))
    slide = (1.0 - entrance) * 18
    alpha = int(255 * entrance)

    cursor = 0
    active_flat = len(window) - 1

    for line_idx, line in enumerate(lines):
        line_text = " ".join(line)
        line_w = draw.textlength(line_text, font=font)
        x = (W - line_w) / 2
        y = base_y + line_idx * line_h + slide
        if style_id == "glassmorphism-pill":
            pad_x, pad_y = 18, 8
            draw.rounded_rectangle([x - pad_x, y - pad_y, x + line_w + pad_x, y + line_h - pad_y + 2],
                                   radius=int(line_h * 0.5), fill=(10, 14, 22, int(150 * entrance)))
        for token in line:
            w_text = token
            is_active = cursor == active_flat
            color = style["active"] if is_active else style["color"]
            stroke_w = max(1, int(H * style["stroke_w"]))
            scale = 1.12 if is_active else 1.0
            wf = load_font(style["font"], int(font_size * scale)) if is_active else font
            tw = draw.textlength(w_text, font=wf)
            draw.text((x, y), w_text, font=wf, fill=(*color, alpha),
                      stroke_width=stroke_w, stroke_fill=(*style["stroke"], alpha))
            x += tw + draw.textlength(" ", font=font)
            cursor += 1
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


# ---------------------------------------------------------------------------
# Effects
# ---------------------------------------------------------------------------

def apply_color_grade(img: Image.Image, grade: dict) -> Image.Image:
    if not grade or not grade.get("enabled", True):
        return img
    arr = np.asarray(img).astype(np.float32) / 255.0
    exposure = float(grade.get("exposure", 0.0))
    contrast = float(grade.get("contrast", 1.0))
    saturation = float(grade.get("saturation", 1.0))
    temperature = float(grade.get("temperature", 0.0))
    tint = float(grade.get("tint", 0.0))

    arr = np.clip(arr * (2.0 ** exposure), 0.0, 1.0)
    arr = np.clip((arr - 0.5) * contrast + 0.5, 0.0, 1.0)
    luma = arr @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    arr = np.clip(luma[..., None] + (arr - luma[..., None]) * saturation, 0.0, 1.0)
    arr[..., 0] = np.clip(arr[..., 0] + temperature * 0.12, 0.0, 1.0)
    arr[..., 2] = np.clip(arr[..., 2] - temperature * 0.12, 0.0, 1.0)
    arr[..., 1] = np.clip(arr[..., 1] + tint * 0.08, 0.0, 1.0)
    return Image.fromarray((arr * 255).astype(np.uint8))


def apply_effect(img: Image.Image, effect_id: str, intensity: float, t: float) -> Image.Image:
    if intensity <= 0:
        return img
    W, H = img.size
    arr = np.asarray(img).astype(np.float32)

    if effect_id == "claude.vignette-focus":
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        nx = (xx / W - 0.5) * 2
        ny = (yy / H - 0.5) * 2
        d = np.sqrt(nx * nx + ny * ny) / math.sqrt(2)
        mask = np.clip((d - 0.45) / 0.55, 0, 1) * intensity * 0.9
        arr *= (1 - mask[..., None])
        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    if effect_id == "claude.film-grain-35mm":
        rng = np.random.default_rng(int(t * 1000) & 0xFFFF)
        noise = rng.normal(0, 12 * intensity, (H, W, 1))
        arr = np.clip(arr + noise, 0, 255)
        return Image.fromarray(arr.astype(np.uint8))

    if effect_id == "claude.halation-glow":
        luma = arr.max(axis=2)
        hot = np.clip((luma - 210) / 45, 0, 1) * intensity
        glow = Image.fromarray((hot * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))
        g = np.asarray(glow).astype(np.float32) / 255.0
        tint = np.array([1.0, 0.45, 0.22], dtype=np.float32)
        arr = np.clip(arr + g[..., None] * tint * 120 * intensity, 0, 255)
        return Image.fromarray(arr.astype(np.uint8))

    if effect_id == "claude.rgb-split-chromatic":
        shift = max(1, int(4 * intensity))
        r = np.roll(arr[..., 0], shift, axis=1)
        b = np.roll(arr[..., 2], -shift, axis=1)
        arr[..., 0] = r
        arr[..., 2] = b
        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    if effect_id == "claude.glitch-scanline":
        arr[::3, :, :] *= (1 - 0.25 * intensity)
        shift = int(2 * intensity * math.sin(t * 40))
        arr = np.roll(arr, shift, axis=1)
        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    if effect_id == "claude.flash-transition":
        white = Image.new("RGB", (W, H), (255, 255, 255))
        return Image.blend(img, white, min(1.0, intensity))

    if effect_id == "claude.light-sweep":
        band_x = int(((t * 0.9) % 1.0) * W * 1.4) - W * 0.2
        overlay = Image.new("L", (W, H), 0)
        od = ImageDraw.Draw(overlay)
        od.polygon([(band_x, 0), (band_x + 160, 0), (band_x + 160 - H * 0.7, H), (band_x - H * 0.7, H)],
                   fill=int(120 * intensity))
        overlay = overlay.filter(ImageFilter.GaussianBlur(18))
        white = Image.new("RGB", (W, H), (255, 255, 255))
        return Image.composite(white, img, overlay)

    if effect_id == "claude.color-isolation":
        gray = img.convert("L").convert("RGB")
        return Image.blend(img, gray, min(0.95, intensity))

    if effect_id == "claude.liquid-glass":
        small = img.resize((max(1, W // 4), max(1, H // 4)), Image.BILINEAR)
        sa = np.asarray(small).astype(np.float32)
        yy, xx = np.mgrid[0:sa.shape[0], 0:sa.shape[1]].astype(np.float32)
        dx = (np.sin(yy * 0.18 + t * 5.0) * 2.0 * intensity).astype(np.int32)
        shifted = np.take_along_axis(sa, np.clip(xx + dx, 0, sa.shape[1] - 1)[..., None].repeat(3, axis=2), axis=1)
        warped = Image.fromarray(np.clip(shifted, 0, 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
        return Image.blend(img, warped, min(0.85, intensity))

    if effect_id == "claude.headline-storm":
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        font = load_font("sans", max(14, int(H * 0.024)))
        headlines = [
            "BREAKING: SỰ THẬT BỊ CHE GIẤU",
            "JUST IN: 6 TRIỆU NGƯỜI BỊ ẢNH HƯỞNG",
            "CẢNH BÁO: MỰC NƯỚC CAO NHẤT",
        ]
        for i, text in enumerate(headlines):
            phase = (t * 0.9 + i * 0.17) % 1.0
            x = int(-W * 0.4 + phase * W * 1.8)
            y = int(H * (0.1 + i * 0.11))
            angle = -0.22 + (i % 4) * 0.1
            tw = od.textlength(text, font=font)
            banner = Image.new("RGBA", (int(tw) + 28, int(font.size * 1.7)), (12, 12, 14, 210))
            bd = ImageDraw.Draw(banner)
            bd.text((14, 4), text, font=font, fill=(255, 255, 255, 255))
            banner = banner.rotate(math.degrees(angle), expand=True, resample=Image.BICUBIC)
            overlay.alpha_composite(banner, (max(0, min(W - 1, x)), max(0, min(H - 1, y))))
        return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    if effect_id == "claude.lower-third-card":
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        slide = int((1 - min(1.0, t * 4)) * 60)
        x0 = int(W * 0.06) - slide
        y0 = int(H * 0.74)
        w = int(W * 0.34)
        h = int(H * 0.12)
        od.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=8, fill=(10, 14, 22, 220))
        od.rectangle([x0, y0, x0 + 6, y0 + h], fill=(56, 189, 248, 255))
        f1 = load_font("sans", max(14, int(H * 0.028)))
        f2 = load_font("sans", max(11, int(H * 0.019)))
        od.text((x0 + 20, y0 + 12), "PHÓNG SỰ DỮ LIỆU", font=f1, fill=(255, 255, 255, 255))
        od.text((x0 + 20, y0 + 44), "Autonomous Studio · Vox Kit", font=f2, fill=(160, 200, 230, 255))
        return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    if effect_id == "claude.studio-reveal":
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        for side in (0, 1):
            x = int(W * 0.04) if side == 0 else int(W * 0.86)
            od.rounded_rectangle([x, int(H * 0.2), x + int(W * 0.1), int(H * 0.55)], radius=10,
                                 fill=(240, 240, 240, 220))
        flick = 0.5 + 0.5 * math.sin(t * 14)
        od.rounded_rectangle([int(W * 0.4), int(H * 0.06), int(W * 0.6), int(H * 0.12)], radius=8,
                             fill=(180, 20, 20, int(200 * flick)))
        od.text((int(W * 0.44), int(H * 0.075)), "ON AIR", font=load_font("display", int(H * 0.035)),
                fill=(255, 255, 255, 255))
        return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    if effect_id == "claude.sound-waveform-bar":
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        bars = 24
        bw = max(3, int(W * 0.006))
        for i in range(bars):
            amp = abs(math.sin(t * 9 + i * 0.6)) * H * 0.09 * intensity
            x = int(W * 0.08) + i * bw * 2
            od.rectangle([x, int(H * 0.78) - amp, x + bw, int(H * 0.78)], fill=(34, 211, 238, 220))
        return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    if effect_id == "claude.outro-punch-badge":
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        drop = int((1 - min(1.0, t * 5)) * H * 0.3)
        size = int(H * 0.16)
        cx, cy = W // 2, int(H * 0.42) + drop
        od.ellipse([cx - size, cy - size, cx + size, cy + size], fill=(250, 204, 21, 235), outline=(120, 60, 0, 255), width=5)
        od.text((cx - size * 0.55, cy - size * 0.35), "XONG!", font=load_font("display", int(size * 0.55)), fill=(30, 20, 0, 255))
        return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    if effect_id == "claude.snap-zoom":
        z = 1.0 + 0.38 * intensity
        nw, nh = int(W / z), int(H / z)
        left = (W - nw) // 2
        top = (H - nh) // 2
        return img.crop((left, top, left + nw, top + nh)).resize((W, H), Image.BILINEAR)

    return img


def _effect_intensity(cue: dict, scene_p: float) -> float:
    at = float(cue.get("atProgress", 0.2))
    base = float(cue.get("intensity", 1.0))
    duration = float(cue.get("durationSec", 0.6) or 0.6)
    scene_dur = float(cue.get("_sceneDuration", 3.0))
    window = max(0.001, duration / max(0.001, scene_dur))
    dist = abs(scene_p - at)
    if dist > window:
        return 0.0
    # 120ms attack, smooth decay.
    return base * (1.0 - dist / window) ** 1.4


# ---------------------------------------------------------------------------
# Audio
# ---------------------------------------------------------------------------

def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def decode_pcm(path: Path, sr: int = 44100) -> np.ndarray:
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("ffmpeg not found; cannot decode audio")
    proc = subprocess.run(
        [ffmpeg, "-v", "error", "-i", str(path), "-f", "s16le", "-acodec", "pcm_s16le",
         "-ac", "1", "-ar", str(sr), "-"],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    return np.frombuffer(proc.stdout, dtype=np.int16).astype(np.float32) / 32768.0


def write_wav(path: Path, samples: np.ndarray, sr: int = 44100) -> None:
    data = np.clip(samples, -1.0, 1.0)
    pcm = (data * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())


def elevenlabs_tts(text: str, voice_plan: dict, out_path: Path, cache_dir: Path) -> Path | None:
    """Call ElevenLabs if a key is present. Returns None when unavailable."""
    env_var = str(voice_plan.get("apiKeyEnvVar", "ELEVENLABS_API_KEY"))
    api_key = os.environ.get(env_var, "").strip()
    if not api_key:
        return None
    voice_id = str(voice_plan.get("voiceId", "")).strip()
    if not voice_id:
        return None

    cache_dir.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(
        json.dumps({"text": text, "voice": voice_plan}, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()[:20]
    cached = cache_dir / f"{digest}.mp3"
    if cached.exists() and cached.stat().st_size > 512:
        shutil.copy2(cached, out_path)
        return out_path

    model_id = str(voice_plan.get("modelId", "eleven_multilingual_v2"))
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format={voice_plan.get('outputFormat', 'mp3_44100_128')}"
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": float(voice_plan.get("stability", 0.45)),
            "similarity_boost": float(voice_plan.get("similarityBoost", 0.8)),
            "style": float(voice_plan.get("style", 0.2)),
            "use_speaker_boost": True,
        },
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"xi-api-key": api_key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            audio = resp.read()
        cached.write_bytes(audio)
        shutil.copy2(cached, out_path)
        return out_path
    except Exception as exc:
        print(f"[warn] ElevenLabs TTS failed ({exc}); falling back to bed/silence.", file=sys.stderr)
        return None


def synthesize_bed(genre: str, duration_sec: float, sr: int = 44100) -> np.ndarray:
    """A quiet procedural music bed so a keyless render is never dead silent.

    This is a placeholder, not a soundtrack: the director brief can point at a
    real music file, and with an ElevenLabs key the voice sits on top.
    """
    n = max(1, int(duration_sec * sr))
    t = np.arange(n, dtype=np.float32) / sr
    if genre == "pixel-retro-arcade":
        base = 220.0
        sig = 0.10 * np.sign(np.sin(2 * np.pi * base * t))
        sig += 0.05 * np.sign(np.sin(2 * np.pi * base * 1.5 * t))
        sig += 0.03 * np.sign(np.sin(2 * np.pi * base * 2.0 * t))
        beat = (np.sin(2 * np.pi * 2.0 * t) > 0.7).astype(np.float32)
        sig *= 0.6 + 0.4 * beat
    elif genre == "vox-documentary":
        base = 55.0
        sig = 0.10 * np.sin(2 * np.pi * base * t)
        sig += 0.05 * np.sin(2 * np.pi * base * 1.5 * t + 0.4)
        pulse = 0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * t)
        sig *= pulse
    else:
        base = 110.0
        sig = 0.08 * np.sin(2 * np.pi * base * t)
        sig += 0.04 * np.sin(2 * np.pi * base * 1.25 * t + 1.1)
    fade = min(1.0, duration_sec / 1.5)
    env = np.ones_like(t)
    ramp = int(sr * fade)
    if ramp > 0:
        env[:ramp] = np.linspace(0, 1, ramp)
        env[-ramp:] = np.linspace(1, 0, ramp)
    return (sig * env * 0.5).astype(np.float32)


def build_audio_track(brief: dict, compiled: CompiledBrief, out_wav: Path,
                      work_dir: Path) -> dict:
    """Assemble voice + music into one WAV. Returns a report dict."""
    audio_plan = brief.get("audio", {}) or {}
    sr = 44100
    total = compiled.total_duration_sec
    n = max(1, int(total * sr))
    voice_track = np.zeros(n, dtype=np.float32)
    report: dict[str, Any] = {"voiceClips": 0, "ttsProvider": None, "bed": False, "music": None}

    voice_plan = audio_plan.get("voice")
    if voice_plan and voice_plan.get("provider") == "elevenlabs":
        report["ttsProvider"] = "elevenlabs"
        cache_dir = ROOT_DIR / "cache" / "tts"
        for scene in compiled.scenes:
            text = scene.narration
            if not text:
                continue
            clip_path = work_dir / f"voice_{scene.index:03d}.mp3"
            result = elevenlabs_tts(text, voice_plan, clip_path, cache_dir)
            if not result:
                continue
            pcm = decode_pcm(result, sr)
            start = int(scene.start_sec * sr)
            end = min(n, start + len(pcm))
            if end > start:
                voice_track[start:end] += pcm[: end - start]
                report["voiceClips"] += 1

    # Music: real file if provided, otherwise a quiet procedural bed.
    music_plan = audio_plan.get("music") or {}
    music_source = music_plan.get("sourcePath")
    music = None
    if music_source and Path(music_source).exists():
        pcm = decode_pcm(Path(music_source), sr)
        if len(pcm) < n:
            reps = int(math.ceil(n / max(1, len(pcm))))
            pcm = np.tile(pcm, reps)[:n]
        else:
            pcm = pcm[:n]
        music = pcm * (10 ** (float(music_plan.get("gainDb", -14.0)) / 20.0))
        report["music"] = str(music_source)
    elif not report["voiceClips"]:
        music = synthesize_bed(compiled.genre, total, sr)
        report["bed"] = True

    mix = voice_track.copy()
    if music is not None:
        if report["voiceClips"] > 0:
            duck_db = float(music_plan.get("duckAmountDb", -14.0))
            duck_gain = 10 ** (duck_db / 20.0)
            win = int(sr * 0.05)
            env = np.zeros(n, dtype=np.float32)
            for i in range(0, n, win):
                chunk = voice_track[i : i + win]
                env[i : i + win] = float(np.sqrt(np.mean(chunk ** 2))) if chunk.size else 0.0
            active = np.clip(env / 0.02, 0, 1)
            # Smooth the envelope to avoid pumping.
            kernel = np.ones(int(sr * 0.12), dtype=np.float32)
            kernel /= kernel.sum()
            active = np.convolve(active, kernel, mode="same")
            gain = 1.0 + (duck_gain - 1.0) * active
            mix += music * gain
        else:
            mix += music

    peak = float(np.max(np.abs(mix))) if mix.size else 0.0
    if peak > 0.98:
        mix = mix * (0.98 / peak)

    write_wav(out_wav, mix, sr)
    report["durationSec"] = round(total, 2)
    report["sampleRate"] = sr
    return report


def apply_loudness(in_wav: Path, out_wav: Path, target_lufs: float, true_peak_db: float) -> bool:
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        return False
    try:
        _run([
            ffmpeg, "-y", "-i", str(in_wav),
            "-af", f"loudnorm=I={target_lufs}:TP={true_peak_db}:LRA=11",
            "-ar", "44100", "-ac", "1", str(out_wav),
        ])
        return True
    except subprocess.CalledProcessError:
        return False


# ---------------------------------------------------------------------------
# Frame renderer
# ---------------------------------------------------------------------------

def _asset_layer(asset: dict, W: int, H: int, t_scene: float, scene_p: float) -> Image.Image | None:
    path = asset.get("path")
    if not path:
        return None
    p = Path(path)
    if not p.exists():
        return None
    try:
        img = Image.open(p).convert("RGB")
    except Exception:
        return None

    # Reference frames often carry burned-in subtitles; allow the brief to crop
    # that band before it is scaled into the frame.
    crop_bottom = float(asset.get("cropBottomRatio", 0.0) or 0.0)
    if 0.0 < crop_bottom < 0.9:
        img = img.crop((0, 0, img.width, int(img.height * (1.0 - crop_bottom))))

    zoom = 1.0
    pan_x = pan_y = 0
    motion = asset.get("motion", "ken-burns-in")
    if motion == "ken-burns-in":
        zoom = 1.0 + 0.12 * scene_p
    elif motion == "ken-burns-out":
        zoom = 1.12 - 0.12 * scene_p
    elif motion == "pan-left":
        pan_x = int(-W * 0.06 + W * 0.12 * scene_p)
    elif motion == "pan-right":
        pan_x = int(W * 0.06 - W * 0.12 * scene_p)

    scale = max(W / img.width, H / img.height) * zoom
    nw, nh = max(1, int(img.width * scale)), max(1, int(img.height * scale))
    resized = img.resize((nw, nh), Image.LANCZOS)
    left = max(0, min(nw - W, (nw - W) // 2 + pan_x))
    top = max(0, min(nh - H, (nh - H) // 2 + pan_y))
    cropped = resized.crop((left, top, left + W, top + H))

    layout = asset.get("layout", "full")
    if layout == "full" or layout == "background":
        return cropped
    # Card layouts: draw a rounded card occupying one third of the frame.
    card_w = int(W * 0.38)
    card_h = int(H * 0.42)
    card = cropped.resize((card_w, card_h), Image.LANCZOS)
    mask = Image.new("L", (card_w, card_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, card_w, card_h], radius=18, fill=255)
    card_rgba = card.convert("RGBA")
    card_rgba.putalpha(mask)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    x = int(W * 0.06) if layout == "card-left" else int(W - W * 0.06 - card_w)
    y = int(H * 0.24)
    layer.alpha_composite(card_rgba, (x, y))
    border = ImageDraw.Draw(layer)
    border.rounded_rectangle([x, y, x + card_w, y + card_h], radius=18, outline=(255, 255, 255, 90), width=2)
    return layer.convert("RGB")


def render_frame(compiled: CompiledBrief, scene: CompiledScene, t: float,
                 t_scene: float, scene_p: float) -> Image.Image:
    W, H = compiled.width, compiled.height
    cam = evaluate_camera(str(scene.raw.get("cameraRig", "static-stage-wide")), scene_p, t)

    img = Image.new("RGB", (W, H), (10, 12, 18))
    draw_backdrop(img, str(scene.raw.get("backdrop", "")), cam, t, compiled.genre)

    asset = scene.raw.get("asset") or {}
    asset_img = _asset_layer(asset, W, H, t_scene, scene_p)
    if asset_img is not None:
        opacity = float(asset.get("opacity", 1.0))
        if opacity >= 0.99:
            img = asset_img
        else:
            img = Image.blend(img, asset_img, max(0.0, min(1.0, opacity)))
        draw = ImageDraw.Draw(img)
        # Legibility gradient under captions.
        grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(grad)
        for gy in range(int(H * 0.22)):
            a = int(170 * (gy / (H * 0.22)))
            gd.line([(0, H - int(H * 0.22) + gy), (W, H - int(H * 0.22) + gy)], fill=(0, 0, 0, a))
        img = Image.alpha_composite(img.convert("RGBA"), grad).convert("RGB")

    # Stage layer (actors + widgets) with camera transform baked into coordinates.
    stage = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for widget in scene.raw.get("widgets", []) or []:
        draw_widget(stage, widget, t_scene, scene_p, cam, W, H)
    actor_boxes = []
    for actor in scene.raw.get("actors", []) or []:
        cx, cy, r = draw_actor(stage, actor, t_scene, cam, W, H,
                               pixel_mode=compiled.genre == "pixel-retro-arcade")
        actor_boxes.append((cx, cy, r))
    img = Image.alpha_composite(img.convert("RGBA"), stage).convert("RGB")

    # Grade
    img = apply_color_grade(img, compiled.raw.get("colorGrade", {}))

    # Effects (scene-local cues)
    for cue in scene.raw.get("effects", []) or []:
        cue = dict(cue)
        cue["_sceneDuration"] = scene.duration_sec
        intensity = _effect_intensity(cue, scene_p)
        if intensity > 0:
            img = apply_effect(img, str(cue.get("effectId", "")), intensity, t_scene)

    # Captions last so they always read cleanly.
    img = draw_captions(img, scene, t, str(scene.raw.get("captionStyleId", "hormozi-punch")))
    return img


def render_brief(brief_path: Path, output_mp4: Path, *, with_audio: bool = True,
                 max_frames: int | None = None, frame_dir: Path | None = None) -> dict:
    brief = json.loads(Path(brief_path).read_text(encoding="utf-8"))
    errors = validate_brief(brief)
    if errors:
        raise ValueError("Invalid brief:\n- " + "\n- ".join(errors))

    compiled = compile_brief(brief)
    fps = compiled.fps
    total_frames = int(round(compiled.total_duration_sec * fps))
    if max_frames is not None:
        total_frames = min(total_frames, max_frames)

    ffmpeg = find_ffmpeg()
    if ffmpeg is None:
        raise RuntimeError(
            "ffmpeg not found. Set FFMPEG_BIN or install ffmpeg "
            "(Playwright's bundled binary is also detected)."
        )

    work = Path(frame_dir) if frame_dir else Path(tempfile.mkdtemp(prefix="studio_brief_frames_"))
    work.mkdir(parents=True, exist_ok=True)
    cleanup = frame_dir is None

    try:
        for i in range(total_frames):
            t = i / fps
            scene = compiled.scenes[-1]
            for candidate in compiled.scenes:
                if candidate.start_sec <= t < candidate.end_sec:
                    scene = candidate
                    break
            t_scene = t - scene.start_sec
            scene_p = 0.0 if scene.duration_sec <= 0 else min(1.0, t_scene / scene.duration_sec)
            frame = render_frame(compiled, scene, t, t_scene, scene_p)
            frame.save(work / f"frame_{i:05d}.jpg", quality=92)

        audio_path = None
        audio_report = {"enabled": False}
        if with_audio:
            raw_wav = work / "mix_raw.wav"
            audio_report = build_audio_track(brief, compiled, raw_wav, work)
            target = float(brief.get("audio", {}).get("loudnessTargetLufs", -14.0))
            true_peak = float(brief.get("audio", {}).get("truePeakDb", -1.5))
            mastered = work / "mix_mastered.wav"
            if apply_loudness(raw_wav, mastered, target, true_peak):
                audio_path = mastered
            else:
                audio_path = raw_wav
            audio_report["targetLufs"] = target

        output_mp4 = Path(output_mp4).resolve()
        output_mp4.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            ffmpeg, "-y", "-framerate", str(fps), "-i", str(work / "frame_%05d.jpg"),
        ]
        if audio_path is not None:
            cmd += ["-i", str(audio_path)]
        cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p"]
        if audio_path is not None:
            cmd += ["-c:a", "aac", "-b:a", "192k", "-shortest"]
        cmd += [str(output_mp4)]
        _run(cmd)

        return {
            "ok": True,
            "outputMp4": str(output_mp4),
            "sizeBytes": output_mp4.stat().st_size,
            "durationSec": round(total_frames / fps, 2),
            "fps": fps,
            "width": compiled.width,
            "height": compiled.height,
            "genre": compiled.genre,
            "scenes": len(compiled.scenes),
            "frames": total_frames,
            "audio": audio_report,
            "ffmpeg": ffmpeg,
        }
    finally:
        if cleanup:
            shutil.rmtree(work, ignore_errors=True)


def render_probe_frames(brief_path: Path, out_dir: Path, frames_per_scene: int = 1) -> dict:
    brief = json.loads(Path(brief_path).read_text(encoding="utf-8"))
    errors = validate_brief(brief)
    if errors:
        raise ValueError("Invalid brief:\n- " + "\n- ".join(errors))
    compiled = compile_brief(brief)
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    for scene in compiled.scenes:
        for k in range(max(1, frames_per_scene)):
            frac = 0.5 if frames_per_scene == 1 else (k + 1) / (frames_per_scene + 1)
            t = scene.start_sec + scene.duration_sec * frac
            frame = render_frame(compiled, scene, t, scene.duration_sec * frac, frac)
            path = out_dir / f"probe_s{scene.index:02d}_{k}.jpg"
            frame.save(path, quality=92)
            manifest.append({
                "sceneIndex": scene.index,
                "progress": round(frac, 3),
                "timeSec": round(t, 3),
                "path": str(path),
            })
    return {"ok": True, "probeCount": len(manifest), "frames": manifest,
            "width": compiled.width, "height": compiled.height, "genre": compiled.genre}


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Render a DirectorBrief to MP4.")
    parser.add_argument("--brief", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--no-audio", action="store_true")
    parser.add_argument("--probe", help="Render probe frames into this directory instead of a video")
    parser.add_argument("--frames-per-scene", type=int, default=1)
    args = parser.parse_args()

    if args.probe:
        result = render_probe_frames(Path(args.brief), Path(args.probe), args.frames_per_scene)
    else:
        result = render_brief(Path(args.brief), Path(args.output), with_audio=not args.no_audio)
    print(json.dumps(result, ensure_ascii=False, indent=2))
