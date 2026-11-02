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

            # 4. Stickman Puppet Rig (2D Skeletal Kinematics on Left Stage)
            # Switch moveSet dynamically: first half 'point-chart-upper-right', second half 'econ-celebrate-stonks'
            actor_cx = 310 + int(25 * math.sin(progress * math.pi))
            actor_cy = 370 + int(6 * math.sin(t * 8.0))  # breathing bounce

            # Head
            head_r = 42
            head_x = actor_cx
            head_y = actor_cy - 125
            draw.ellipse(
                [head_x - head_r, head_y - head_r, head_x + head_r, head_y + head_r],
                fill=(24, 34, 48),
                outline=(248, 250, 252),
                width=6,
            )

            # Eyes & Animated Lip-Sync Mouth
            eye_y = head_y - 10
            draw.ellipse([head_x - 18, eye_y - 5, head_x - 8, eye_y + 5], fill=(56, 189, 248))
            draw.ellipse([head_x + 8, eye_y - 5, head_x + 18, eye_y + 5], fill=(56, 189, 248))
            mouth_open = 4 + int(8 * abs(math.sin(t * 14.0)))
            draw.ellipse(
                [head_x - 12, head_y + 10, head_x + 12, head_y + 10 + mouth_open],
                fill=(244, 63, 94),
            )

            # Neck & Torso
            neck_pt = (head_x, head_y + head_r)
            hip_pt = (actor_cx, actor_cy + 40)
            draw.line([neck_pt, hip_pt], fill=(248, 250, 252), width=8)

            # Red Economics Tie
            draw.polygon(
                [
                    (neck_pt[0], neck_pt[1] + 6),
                    (neck_pt[0] - 10, neck_pt[1] + 55),
                    (neck_pt[0], neck_pt[1] + 72),
                    (neck_pt[0] + 10, neck_pt[1] + 55),
                ],
                fill=(239, 68, 68),
            )

            # Left Arm (Gesturing)
            shoulder_pt = (actor_cx, neck_pt[1] + 18)
            l_elbow = (shoulder_pt[0] - 55, shoulder_pt[1] + int(25 * math.cos(t * 6.0)))
            l_hand = (l_elbow[0] - 35, l_elbow[1] - int(35 * math.sin(t * 6.0)))
            draw.line([shoulder_pt, l_elbow, l_hand], fill=(248, 250, 252), width=7)

            # Right Arm (Pointing Pointer Stick at the Chart!)
            r_elbow = (shoulder_pt[0] + 62, shoulder_pt[1] - 15)
            r_hand = (r_elbow[0] + 58, r_elbow[1] - int(45 + 25 * math.sin(t * 5.0)))
            draw.line([shoulder_pt, r_elbow, r_hand], fill=(248, 250, 252), width=7)

            # Pointer Stick Prop extending from right hand to the chart!
            stick_tip = (r_hand[0] + 145, r_hand[1] - 55)
            draw.line([r_hand, stick_tip], fill=(250, 204, 21), width=4)
            draw.ellipse([stick_tip[0] - 6, stick_tip[1] - 6, stick_tip[0] + 6, stick_tip[1] + 6], fill=(239, 68, 68))

            # Legs
            l_knee = (hip_pt[0] - 32, hip_pt[1] + 68)
            l_foot = (hip_pt[0] - 48, hip_pt[1] + 135)
            r_knee = (hip_pt[0] + 32, hip_pt[1] + 68)
            r_foot = (hip_pt[0] + 48, hip_pt[1] + 135)
            draw.line([hip_pt, l_knee, l_foot], fill=(248, 250, 252), width=8)
            draw.line([hip_pt, r_knee, r_foot], fill=(248, 250, 252), width=8)

            # Stage Floor Glow
            draw.ellipse(
                [actor_cx - 110, hip_pt[1] + 125, actor_cx + 110, hip_pt[1] + 150],
                outline=accent_color,
                width=2,
            )

            # Speech Bubble above Stickman
            bubble_rect = [90, 95, 535, 165]
            draw.rounded_rectangle(bubble_rect, radius=14, fill=(24, 36, 52), outline=(56, 189, 248), width=2)
            bubble_txt = "⚡ Move-Set: point-chart-upper-right (0 Token)" if progress < 0.5 else "🚀 Move-Set: econ-celebrate-stonks (0 Token)"
            draw.text((112, 118), bubble_txt, font=font_bubble, fill=(125, 211, 252))

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

