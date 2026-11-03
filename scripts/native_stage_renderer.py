#!/usr/bin/env python3
"""
@file native_stage_renderer.py
@description 0-Token Native Deterministic Stage & Stickman Video Renderer.
Renders 1280x720 HD frames of our Stickman Puppet Rig, 2.5D Camera Choreography,
Genre Backdrops (Economics / Cosmic / Lore), Animated Stage Widgets, and Subtitles,
then encodes directly to an H.264 .mp4 file using FFmpeg (Windows/Linux) or
AVFoundation hardware encoder (macOS).
"""

import math
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from typing import List, Tuple
from PIL import Image, ImageDraw, ImageFont


ROOT_DIR = Path(__file__).resolve().parent.parent
SWIFT_ENCODER = ROOT_DIR / "scripts" / "native_mp4_encoder.swift"
SWIFT_ENCODER_BIN = ROOT_DIR / "scripts" / "native_mp4_encoder_bin"


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size=size)
            except Exception:
                pass
    return ImageFont.load_default()


def render_stickman_stage_mp4(
    output_mp4: Path,
    genre: str = "economics-stickman",
    script_text: str = "Lãi suất FED đảo chiều! Dòng tiền thông minh bùng nổ trên biểu đồ!",
    duration_sec: float = 3.0,
    fps: int = 30,
    agent_name: str = "⚡ Flash Worker Agent",
    width: int = 1280,
    height: int = 720,
) -> Path:
    output_mp4 = Path(output_mp4).resolve()
    output_mp4.parent.mkdir(parents=True, exist_ok=True)

    total_frames = max(1, int(round(duration_sec * fps)))
    font_title = _load_font(26, bold=True)
    font_hud = _load_font(18, bold=True)
    font_sub = _load_font(30, bold=True)
    font_bubble = _load_font(20, bold=True)
    font_mono = _load_font(18, bold=False)

    words = [w for w in script_text.strip().split() if w]
    if not words:
        words = ["Autonomous", "Studio", "Pro", "0-Token", "Stage"]

    tmp_dir = Path(tempfile.mkdtemp(prefix="studio_stage_frames_"))
    try:
        for frame_idx in range(total_frames):
            t = frame_idx / float(fps)
            progress = frame_idx / float(max(1, total_frames - 1))

            # 1. Base Canvas & Genre Backdrop
            if genre == "universe-cosmic":
                bg_color = (8, 10, 26)
                accent_color = (56, 189, 248)
                secondary_color = (168, 85, 247)
            elif genre == "lore-chronicle":
                bg_color = (28, 22, 16)
                accent_color = (245, 158, 11)
                secondary_color = (239, 68, 68)
            else:
                # economics-stickman: Chalkboard & Bloomberg Terminal hybrid
                bg_color = (12, 20, 28)
                accent_color = (16, 185, 129)
                secondary_color = (245, 158, 11)

            img = Image.new("RGB", (width, height), bg_color)
            draw = ImageDraw.Draw(img)

            # 2.5D Camera Rig Simulation (slow-push-in-dramatic + subtle pan)
            cam_zoom = 1.0 + 0.12 * math.sin(progress * math.pi * 0.5)
            cam_pan_x = int(18 * math.sin(progress * math.pi))
            cam_pan_y = int(-8 * progress)

            # Perspective Grid Backdrop
            grid_spacing = int(64 * cam_zoom)
            for gx in range(0, width, max(24, grid_spacing)):
                x_pos = (gx + cam_pan_x) % width
                draw.line([(x_pos, 0), (x_pos, height)], fill=(22, 35, 48), width=1)
            for gy in range(0, height, max(24, grid_spacing)):
                y_pos = (gy + cam_pan_y) % height
                draw.line([(0, y_pos), (width, y_pos)], fill=(22, 35, 48), width=1)

            # 2. Floating Atmosphere Particles (Dollar Rain / Cosmic Stars / Embers)
            for p_i in range(18):
                px = int((p_i * 173 + frame_idx * (3 + (p_i % 3))) % (width - 60)) + 30
                py = int((p_i * 97 + frame_idx * (4 + (p_i % 4))) % (height - 140)) + 50
                if genre == "economics-stickman":
                    draw.text((px, py), "$", font=font_hud, fill=(16, 185, 129) if p_i % 2 == 0 else (34, 90, 68))
                elif genre == "universe-cosmic":
                    r = 2 + (p_i % 3)
                    draw.ellipse([px - r, py - r, px + r, py + r], fill=(180, 220, 255))
                else:
                    r = 3
                    draw.ellipse([px - r, py - r, px + r, py + r], fill=(245, 158, 11))

            # 3. Stage Widget on Right Side (Candlestick & Supply/Demand Chart)
            chart_x1 = 620 + cam_pan_x // 2
            chart_y1 = 110 + cam_pan_y // 2
            chart_x2 = 1190 + cam_pan_x // 2
            chart_y2 = 520 + cam_pan_y // 2

            # Panel Box
            draw.rounded_rectangle(
                [chart_x1, chart_y1, chart_x2, chart_y2],
                radius=18,
                fill=(16, 26, 38),
                outline=accent_color,
                width=3,
            )

            # Widget Header
            header_title = (
                "📈 MACRO LIQUIDITY & CANDLESTICK" if genre == "economics-stickman"
                else "🌌 EVENT HORIZON SCALE" if genre == "universe-cosmic"
                else "📜 ANCIENT EMPIRE MARCH"
            )
            draw.text((chart_x1 + 24, chart_y1 + 18), header_title, font=font_title, fill=(240, 248, 255))
            pct_val = 12.4 + progress * 28.5
            draw.text(
                (chart_x2 - 165, chart_y1 + 20),
                f"+{pct_val:.1f}% ▲",
                font=font_title,
                fill=(16, 185, 129),
            )

            # Animated Candlesticks & Supply/Demand Trend Curve
            candles = [
                (0.25, 0.42, False),
                (0.38, 0.22, False),
                (0.18, 0.35, True),
                (0.32, 0.52, True),
                (0.48, 0.68, True),
                (0.62, 0.82, True),
                (0.75, 0.94, True),
            ]
            visible_candles = max(2, int(len(candles) * min(1.0, progress * 1.25)))
            c_base_y = chart_y2 - 45
            c_height = (chart_y2 - chart_y1) - 120

            curve_pts: List[Tuple[int, int]] = []
            for idx in range(visible_candles):
                low_v, high_v, bullish = candles[idx]
                anim_boost = min(1.0, max(0.2, (progress * len(candles)) - idx + 0.5))
                cur_high = low_v + (high_v - low_v) * anim_boost

                cx = chart_x1 + 65 + idx * 72
                y_low = int(c_base_y - low_v * c_height)
                y_high = int(c_base_y - cur_high * c_height)
                top_y = min(y_low, y_high)
                bot_y = max(y_low, y_high)

                col = (16, 185, 129) if bullish else (239, 68, 68)
                # Wick
                draw.line([(cx, top_y - 16), (cx, bot_y + 16)], fill=col, width=3)
                # Body
                draw.rounded_rectangle([cx - 18, top_y, cx + 18, max(top_y + 12, bot_y)], radius=4, fill=col)
                curve_pts.append((cx, top_y - 10))

            if len(curve_pts) >= 2:
                draw.line(curve_pts, fill=(250, 204, 21), width=5)
                last_pt = curve_pts[-1]
                draw.ellipse([last_pt[0] - 8, last_pt[1] - 8, last_pt[0] + 8, last_pt[1] + 8], fill=(250, 204, 21))

            # 4. Professional Stage Presenter & Cinematic Media Compositor (No Crude Stickman)
            # Replaced crude Pillow stickman lines with broadcast presenter card & dynamic speaker visualizer
            actor_card_x1 = 90 + cam_pan_x
            actor_card_y1 = 110 + cam_pan_y
            actor_card_x2 = 560 + cam_pan_x
            actor_card_y2 = 520 + cam_pan_y

            # Stage Presenter Panel
            draw.rounded_rectangle(
                [actor_card_x1, actor_card_y1, actor_card_x2, actor_card_y2],
                radius=18,
                fill=(18, 26, 38),
                outline=accent_color,
                width=3,
            )

            # Presenter Header & Title
            presenter_title = (
                "👔 CHIEF ECONOMIST & MARKET STRATEGIST" if genre == "economics-stickman"
                else "🚀 LEAD ASTROPHYSICIST & EXPLORER" if genre == "universe-cosmic"
                else "📜 CHIEF HISTORIAN & WAR STRATEGIST"
            )
            draw.text((actor_card_x1 + 24, actor_card_y1 + 18), presenter_title, font=_load_font(16, bold=True), fill=accent_color)

            # Presenter Center Frame & Dynamic Waveform Visualizer
            presenter_inner_box = [actor_card_x1 + 24, actor_card_y1 + 54, actor_card_x2 - 24, actor_card_y2 - 70]
            draw.rounded_rectangle(presenter_inner_box, radius=12, fill=(10, 16, 26), outline=(30, 45, 65), width=2)

            # Animated presenter speech equalizer bars
            eq_bar_count = 20
            eq_w = (presenter_inner_box[2] - presenter_inner_box[0] - 40) // eq_bar_count
            for bar_i in range(eq_bar_count):
                bar_x = presenter_inner_box[0] + 20 + bar_i * eq_w
                bar_h = int((20 + 75 * abs(math.sin(t * 10.0 + bar_i * 0.45))) * (1.0 if (t % 1.5) < 1.2 else 0.15))
                bar_y1 = presenter_inner_box[3] - 20 - bar_h
                bar_y2 = presenter_inner_box[3] - 20
                draw.rectangle([bar_x, bar_y1, bar_x + eq_w - 4, bar_y2], fill=accent_color if bar_i % 3 != 0 else secondary_color)

            # Presenter Live Status & Directing Label
            stage_move_label = "⚡ Live Gesture: Explaining Supply/Demand Shock" if progress < 0.5 else "🚀 Live Gesture: Tactical Market Breakout"
            draw.text((actor_card_x1 + 24, actor_card_y2 - 50), stage_move_label, font=font_bubble, fill=(240, 248, 255))
            draw.text((actor_card_x1 + 24, actor_card_y2 - 25), "DIRECTOR AI: SYNCHRONIZED BROADCAST FEED", font=_load_font(12, bold=True), fill=(125, 211, 252))

            # 5. Top Live Agent HUD Bar (Showing Flash Agent Ghost Cursor Status)
            draw.rounded_rectangle([28, 22, 1252, 72], radius=12, fill=(15, 23, 42), outline=(30, 58, 138), width=2)
            draw.ellipse([46, 39, 62, 55], fill=(16, 185, 129))
            draw.text(
                (74, 34),
                f"{agent_name}  •  GENRE: {genre.upper()}  •  2.5D CAM: {cam_zoom:.2f}x",
                font=font_hud,
                fill=(226, 232, 240),
            )
            draw.text(
                (980, 34),
                f"TC 00:00:0{int(t):d}:{frame_idx % fps:02d} ({fps}fps)",
                font=font_mono,
                fill=(56, 189, 248),
            )

            # 6. Bottom Karaoke Word-by-Word Subtitle Bar
            active_word_idx = min(len(words) - 1, int(progress * len(words)))
            sub_box = [140, 610, 1140, 686]
            draw.rounded_rectangle(sub_box, radius=16, fill=(9, 13, 22), outline=(245, 158, 11), width=2)

            # Render centered subtitle with highlighted active word
            display_words = []
            for w_i, w_str in enumerate(words):
                if w_i == active_word_idx:
                    display_words.append(f"[{w_str.upper()}]")
                else:
                    display_words.append(w_str)
            sub_line = " ".join(display_words)
            if len(sub_line) > 62:
                sub_line = sub_line[:62] + "..."
            draw.text((180, 632), sub_line, font=font_sub, fill=(250, 204, 21))

            # Save frame PNG
            frame_file = tmp_dir / f"frame_{frame_idx:04d}.png"
            img.save(frame_file, format="PNG")

        # 7. Encode PNG sequence to H.264 .mp4
        ffmpeg_bin = shutil.which("ffmpeg")
        if ffmpeg_bin:
            cmd = [
                ffmpeg_bin,
                "-y",
                "-framerate",
                str(fps),
                "-i",
                str(tmp_dir / "frame_%04d.png"),
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                str(output_mp4),
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        elif SWIFT_ENCODER_BIN.exists():
            cmd = [
                str(SWIFT_ENCODER_BIN),
                str(tmp_dir),
                str(fps),
                str(output_mp4),
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        elif shutil.which("swift") and SWIFT_ENCODER.exists():
            cmd = [
                "swift",
                str(SWIFT_ENCODER),
                str(tmp_dir),
                str(fps),
                str(output_mp4),
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        else:
            raise RuntimeError("Neither ffmpeg nor swift AVAssetWriter encoder found.")

        return output_mp4
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

