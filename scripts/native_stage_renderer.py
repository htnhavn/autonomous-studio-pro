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
import sys
import tempfile
import urllib.request
from typing import List, Tuple
from PIL import Image, ImageDraw, ImageFont


ROOT_DIR = Path(__file__).resolve().parent.parent
SWIFT_ENCODER = ROOT_DIR / "scripts" / "native_mp4_encoder.swift"
SWIFT_ENCODER_BIN = ROOT_DIR / "scripts" / "native_mp4_encoder_bin"


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        # macOS
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        # Windows
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\tahomabd.ttf" if bold else "C:\\Windows\\Fonts\\tahoma.ttf",
        # Linux / generic (DejaVu has Vietnamese coverage)
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size=size)
            except Exception:
                pass
    # Last resort: Pillow >=10.1 supports a scalable default font with size;
    # older versions return a tiny bitmap font that lacks Unicode coverage.
    try:
        return ImageFont.load_default(size=size)  # type: ignore[call-arg]
    except TypeError:
        print(
            "[warn] No TrueType font found; falling back to Pillow's tiny default font. "
            "Vietnamese/Unicode text may render incorrectly. Install DejaVu/Noto/Arial.",
            file=sys.stderr,
        )
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
                "📈 MACRO LIQUIDITY" if genre == "economics-stickman"
                else "🌌 EVENT HORIZON" if genre == "universe-cosmic"
                else "📜 EMPIRE MARCH"
            )
            draw.text((chart_x1 + 24, chart_y1 + 18), header_title, font=font_title, fill=(240, 248, 255))
            pct_val = 12.4 + progress * 28.5
            draw.text(
                (chart_x2 - 130, chart_y1 + 24),
                f"+{pct_val:.1f}% ▲",
                font=font_hud,
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
            img.save(frame_file, format="PNG", compress_level=1)

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


def _cover_image(img: Image.Image, w: int, h: int, zoom: float = 1.0, pan_x: int = 0, pan_y: int = 0) -> Image.Image:
    """Scale an image to cover w×h (like object-fit: cover) with optional zoom/pan."""
    iw, ih = img.size
    scale = max(w / iw, h / ih) * max(1.0, zoom)
    nw, nh = max(1, int(iw * scale)), max(1, int(ih * scale))
    resized = img.resize((nw, nh), Image.BILINEAR)
    left = (nw - w) // 2 - pan_x
    top = (nh - h) // 2 - pan_y
    left = max(0, min(nw - w, left))
    top = max(0, min(nh - h, top))
    return resized.crop((left, top, left + w, top + h))


def render_timeline_composite_mp4(
    output_mp4: Path,
    scenes: List[dict],
    width: int = 1280,
    height: int = 720,
    fps: int = 30,
    genre: str = "economics-stickman",
    agent_name: str = "🤖 Master Editor",
    title: str = "AUTONOMOUS MASTER EDIT",
) -> Path:
    """Render an assembled timeline: real A-roll/B-roll media per scene, Ken Burns
    motion, crossfade/whip transitions between scenes, HUD and word-highlight captions.

    `scenes` items: {startSec, durationSec, imagePath?, subtitle?, title?,
                     transitionIn?: {type, durationSec}, camera?}
    """
    output_mp4 = Path(output_mp4).resolve()
    output_mp4.parent.mkdir(parents=True, exist_ok=True)
    if not scenes:
        raise ValueError("render_timeline_composite_mp4 requires at least one scene")

    total_dur = max(float(s.get("startSec", 0)) + float(s.get("durationSec", 1)) for s in scenes)
    total_frames = max(1, int(round(total_dur * fps)))

    font_title = _load_font(24, bold=True)
    font_hud = _load_font(17, bold=True)
    font_sub = _load_font(30, bold=True)
    font_badge = _load_font(15, bold=True)

    if genre == "universe-cosmic":
        bg_color, accent = (8, 10, 26), (56, 189, 248)
    elif genre == "lore-chronicle":
        bg_color, accent = (28, 22, 16), (245, 158, 11)
    else:
        bg_color, accent = (12, 20, 28), (16, 185, 129)

    tmp_dir = Path(tempfile.mkdtemp(prefix="studio_timeline_frames_"))
    img_cache: dict = {}

    def load_img(path: str | None):
        if not path:
            return None
        if path not in img_cache:
            try:
                if path.startswith("http://") or path.startswith("https://"):
                    dl = tmp_dir / f"dl_{abs(hash(path)) % 100000}.img"
                    if not dl.exists():
                        with urllib.request.urlopen(path, timeout=30) as resp:
                            dl.write_bytes(resp.read())
                    raw = Image.open(dl).convert("RGB")
                else:
                    raw = Image.open(path).convert("RGB")
                # Pre-scale once to just above target size so per-frame Ken Burns
                # only crops a small window instead of resizing a huge image.
                img_cache[path] = _cover_image(raw, int(width * 1.2), int(height * 1.2), 1.0, 0, 0)
            except Exception:
                img_cache[path] = None
        return img_cache[path]

    try:
        for frame_idx in range(total_frames):
            t = frame_idx / float(fps)

            active_i = len(scenes) - 1
            for i, sc in enumerate(scenes):
                s0 = float(sc.get("startSec", 0))
                if s0 <= t < s0 + float(sc.get("durationSec", 1)):
                    active_i = i
                    break
            sc = scenes[active_i]
            s0 = float(sc.get("startSec", 0))
            dur = max(0.001, float(sc.get("durationSec", 1)))
            sp = min(1.0, max(0.0, (t - s0) / dur))

            frame = Image.new("RGB", (width, height), bg_color)
            draw = ImageDraw.Draw(frame)

            cur_img = load_img(sc.get("imagePath"))
            if cur_img is not None:
                cam = sc.get("camera", "slow-push-in-dramatic")
                zoom = 1.0 + (0.10 if "push" in cam else 0.04) * sp
                pan_x = int(16 * math.sin(sp * math.pi))
                pan_y = int(-8 * sp)
                cur = _cover_image(cur_img, width, height, zoom, pan_x, pan_y)

                trans = sc.get("transitionIn") or {}
                tdur = float(trans.get("durationSec", 0.0) or 0.0)
                if active_i > 0 and tdur > 0 and (t - s0) < tdur:
                    prev_img = load_img(scenes[active_i - 1].get("imagePath"))
                    if prev_img is not None:
                        prev = _cover_image(prev_img, width, height, 1.05, 0, 0)
                        a = min(1.0, max(0.0, (t - s0) / tdur))
                        if trans.get("type") in ("whip", "slide"):
                            off = int(width * (1.0 - a))
                            frame.paste(prev, (0, 0))
                            frame.paste(cur, (off, 0))
                        else:
                            frame.paste(Image.blend(prev, cur, a), (0, 0))
                    else:
                        frame.paste(cur, (0, 0))
                else:
                    frame.paste(cur, (0, 0))

                # Bottom gradient for caption legibility
                draw = ImageDraw.Draw(frame, "RGBA")
                for gy in range(140):
                    alpha = int(170 * (gy / 140.0))
                    draw.line([(0, height - 140 + gy), (width, height - 140 + gy)], fill=(0, 0, 0, alpha))
                draw = ImageDraw.Draw(frame)
            else:
                # Synthetic stage backdrop (no media): grid + glow
                grid = 64
                for gx in range(0, width, grid):
                    draw.line([(gx, 0), (gx, height)], fill=(22, 35, 48), width=1)
                for gy in range(0, height, grid):
                    draw.line([(0, gy), (width, gy)], fill=(22, 35, 48), width=1)

            # HUD bar
            draw.rounded_rectangle([24, 20, width - 24, 66], radius=10, fill=(15, 23, 42), outline=(30, 58, 138), width=2)
            draw.ellipse([40, 36, 54, 50], fill=accent)
            draw.text((64, 33), f"{agent_name}  •  {title.upper()[:38]}  •  {genre.upper()}", font=font_hud, fill=(226, 232, 240))
            tc = f"TC 00:00:{int(t):02d}:{frame_idx % fps:02d} ({fps}fps)"
            draw.text((width - 300, 33), tc, font=font_hud, fill=(56, 189, 248))

            # Scene badge
            scene_label = sc.get("title") or f"SCENE {active_i + 1}"
            draw.rounded_rectangle([24, 78, 24 + 10 + int(len(scene_label) * 9), 108], radius=6, fill=(0, 0, 0), outline=accent, width=2)
            draw.text((34, 84), scene_label, font=font_badge, fill=accent)

            # Subtitle with active-word highlight
            subtitle = (sc.get("subtitle") or sc.get("dialogue") or "").strip()
            if subtitle:
                words = subtitle.split()
                active_w = min(len(words) - 1, int(sp * len(words))) if words else 0
                shown = []
                for wi, wstr in enumerate(words):
                    shown.append(f"[{wstr.upper()}]" if wi == active_w else wstr)
                line = " ".join(shown)
                if len(line) > 64:
                    line = line[:64] + "..."
                draw.rounded_rectangle([120, height - 96, width - 120, height - 24], radius=12, fill=(9, 13, 22), outline=accent, width=2)
                draw.text((150, height - 78), line, font=font_sub, fill=(250, 204, 21))

            frame.save(tmp_dir / f"frame_{frame_idx:04d}.jpg", format="JPEG", quality=90)

        ffmpeg_bin = shutil.which("ffmpeg")
        if ffmpeg_bin:
            subprocess.run(
                [ffmpeg_bin, "-y", "-framerate", str(fps), "-i", str(tmp_dir / "frame_%04d.jpg"),
                 "-c:v", "libx264", "-pix_fmt", "yuv420p", str(output_mp4)],
                check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            )
        elif SWIFT_ENCODER_BIN.exists():
            subprocess.run([str(SWIFT_ENCODER_BIN), str(tmp_dir), str(fps), str(output_mp4)], check=True)
        elif shutil.which("swift") and SWIFT_ENCODER.exists():
            subprocess.run(["swift", str(SWIFT_ENCODER), str(tmp_dir), str(fps), str(output_mp4)], check=True)
        else:
            raise RuntimeError("Neither ffmpeg nor swift AVAssetWriter encoder found.")
        return output_mp4
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

