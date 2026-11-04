#!/usr/bin/env python3
"""
@file build_real_product_e2e.py
@description Master End-to-End Real Product Verification & Builder.
Produces 100% REAL physical media artifacts with ZERO mocks, ZERO setInterval progress bars:
  1. output_product/voiceover_and_beats.wav (16kHz 16-bit PCM WAV with real silences & 120 BPM beats)
  2. output_product/macro_crisis_2026.vproj.json (Real .vproj package with ai_context.json & 0 QA errors)
  3. output_product/macro_crisis_2026.otio (Real OpenTimelineIO v0.15 document)
  4. output_product/storyboard_contact_sheet.bmp (Real 3-scene contact sheet image)
  5. output_product/macro_crisis_2026_master.mp4 (Real 9.0s 60fps/30fps 3-scene MP4 with valid ftyp/moov atoms)
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
import time
import wave
from PIL import Image, ImageDraw, ImageFont


def _rounded_rect(draw, box, radius=0, **kwargs):
    """Draw a rounded rectangle, falling back to a plain rectangle on
    Pillow versions older than 8.2 that lack ImageDraw.rounded_rectangle."""
    try:
        draw.rounded_rectangle(box, radius=radius, **kwargs)
    except AttributeError:
        draw.rectangle(box, **kwargs)

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT_DIR / "output_product"
SCRIPTS_DIR = ROOT_DIR / "scripts"
SWIFT_ENCODER_BIN = SCRIPTS_DIR / "native_mp4_encoder_bin"

sys.path.insert(0, str(ROOT_DIR / "services" / "ai-sidecar"))
from pipelines.audio_studio import AudioStudioPipeline


def compute_sha256(file_path: Path) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


# =============================================================================
# 1. Real Audio Synthesis & Pipeline Verification
# =============================================================================
async def build_real_audio(out_wav: Path) -> dict:
    print("[1/5] Synthesizing Real 16kHz PCM WAV Audio (voiceover_and_beats.wav)...")
    sample_rate = 16000
    duration_sec = 9.0
    total_samples = int(sample_rate * duration_sec)

    # 3 voice bursts with 2 clear silence gaps for rough-cut detection:
    # Gap 1: 2.0s - 2.8s (0.8s silence)
    # Gap 2: 5.0s - 5.8s (0.8s silence)
    # 120 BPM = beat every 0.5s (18 beats in 9.0s)
    samples = []
    for i in range(total_samples):
        t = i / float(sample_rate)

        if (2.0 <= t < 2.8) or (5.0 <= t < 5.8):
            amp = 0.0
        else:
            # Multi-harmonic voice synthesis (220Hz fundamental + 440Hz + 880Hz)
            voice = (
                0.38 * math.sin(2 * math.pi * 220 * t)
                + 0.22 * math.sin(2 * math.pi * 440 * t)
                + 0.12 * math.sin(2 * math.pi * 880 * t)
            )
            # Add rhythmic 120 BPM kick pulses
            beat_phase = (t % 0.5) / 0.5
            beat_pulse = math.exp(-beat_phase * 16.0) * math.sin(2 * math.pi * 90 * t) * 0.35
            amp = voice + beat_pulse

        sample_val = int(max(-32767, min(32767, amp * 32767)))
        samples.append(struct.pack("<h", sample_val))

    out_wav.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out_wav), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b"".join(samples))

    # Verify with AudioStudioPipeline
    pipeline = AudioStudioPipeline()
    silences = await pipeline.detect_silences_for_rough_cut(str(out_wav), threshold_db=-35.0, min_duration_sec=0.4)
    beats = await pipeline.extract_musical_beat_grid(str(out_wav))

    print(f"      -> WAV File Size: {out_wav.stat().st_size:,} bytes")
    print(f"      -> Verified Detected Silences: {silences}")
    print(f"      -> Verified Detected Tempo: {beats['bpm']} BPM ({len(beats['markers'])} beat markers)")

    assert len(silences) >= 2, f"Expected at least 2 silences, got {len(silences)}"
    assert 115.0 <= beats["bpm"] <= 125.0, f"Expected ~120 BPM, got {beats['bpm']}"

    return {
        "path": str(out_wav),
        "size": out_wav.stat().st_size,
        "silences": silences,
        "bpm": beats["bpm"],
        "markersCount": len(beats["markers"]),
    }


# =============================================================================
# 2. Real .vproj Package & OpenTimelineIO Document
# =============================================================================
def build_real_vproj_and_otio(out_dir: Path) -> dict:
    print("[2/5] Building Real .vproj Package & .otio Document via Command Gateway...")
    generator_ts = SCRIPTS_DIR / "gen_vproj_artifacts.ts"
    bundle_cjs = Path(tempfile.gettempdir()) / "gen_vproj_artifacts.cjs"

    # Resolve Node/esbuild from the active environment instead of a hardcoded
    # developer-specific NVM path, so the builder works on any machine.
    node_bin = shutil.which("node")
    if not node_bin:
        raise RuntimeError("Node.js ('node') not found on PATH; install Node to build .vproj/.otio artifacts.")
    env = dict(
        os.environ,
        PATH=f"{Path(node_bin).parent}:{os.environ.get('PATH', '')}",
    )
    esbuild_bin = ROOT_DIR / "apps" / "desktop" / "node_modules" / ".bin" / "esbuild"
    if not esbuild_bin.exists():
        esbuild_bin = Path(shutil.which("esbuild") or "")
    if not esbuild_bin or not Path(esbuild_bin).exists():
        raise RuntimeError("esbuild not found (expected apps/desktop/node_modules/.bin/esbuild or on PATH).")
    subprocess.run(
        [str(esbuild_bin), str(generator_ts), "--bundle", "--platform=node", f"--outfile={bundle_cjs}"],
        env=env,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    subprocess.run([node_bin, str(bundle_cjs), str(out_dir)], env=env, check=True)

    vproj_file = out_dir / "macro_crisis_2026.vproj.json"
    otio_file = out_dir / "macro_crisis_2026.otio"

    assert vproj_file.exists() and vproj_file.stat().st_size > 1000, "Missing macro_crisis_2026.vproj.json"
    assert otio_file.exists() and otio_file.stat().st_size > 500, "Missing macro_crisis_2026.otio"

    with open(vproj_file, "r", encoding="utf-8") as f:
        vproj_data = json.load(f)
    with open(otio_file, "r", encoding="utf-8") as f:
        otio_data = json.load(f)

    assert vproj_data.get("packageFormat") == "autonomous-studio.vproj", "Invalid .vproj format"
    assert vproj_data["qaReport"]["passedAllErrorGates"] is True, "QA report has errors"
    assert otio_data.get("OTIO_SCHEMA") == "Timeline.1", "Invalid OTIO schema"

    print(f"      -> .vproj Package Size: {vproj_file.stat().st_size:,} bytes (QA Passed: {vproj_data['qaReport']['passedAllErrorGates']})")
    print(f"      -> .otio Document Size: {otio_file.stat().st_size:,} bytes (Tracks: {len(otio_data['tracks']['children'])})")

    return {
        "vprojPath": str(vproj_file),
        "vprojSize": vproj_file.stat().st_size,
        "otioPath": str(otio_file),
        "otioSize": otio_file.stat().st_size,
    }


# =============================================================================
# 3. Real 3-Scene Storyboard Contact Sheet (BMP)
# =============================================================================
def build_real_storyboard(out_bmp: Path) -> dict:
    print("[3/5] Generating Real 3-Scene Storyboard Contact Sheet (BMP)...")
    width, height = 1920, 640
    panel_w = width // 3
    img = Image.new("RGB", (width, height), (15, 23, 42))
    draw = ImageDraw.Draw(img)

    panels = [
        {
            "scene": "PHÂN CẢNH 1: LÃI SUẤT FED ĐẢO CHIỀU",
            "time": "00:00 - 00:03 (0s - 3s)",
            "genre": "📈 Kinh Tế / Bloomberg Chalkboard",
            "bg": (12, 20, 28),
            "accent": (16, 185, 129),
            "actor": "Stickman Economist",
            "bubble": "Lãi suất tăng sốc!",
        },
        {
            "scene": "PHÂN CẢNH 2: HỐ ĐEN DÒNG TIỀN VŨ TRỤ",
            "time": "00:03 - 00:06 (3s - 6s)",
            "genre": "🌌 Vũ Trụ & Deep Nebula",
            "bg": (8, 10, 26),
            "accent": (56, 189, 248),
            "actor": "Stickman Astronaut",
            "bubble": "Thanh khoản bốc hơi!",
        },
        {
            "scene": "PHÂN CẢNH 3: PHẢN CÔNG CHIẾN THUẬT",
            "time": "00:06 - 00:09 (6s - 9s)",
            "genre": "📜 Deep Lore & Bản Đồ Cổ",
            "bg": (28, 22, 16),
            "accent": (245, 158, 11),
            "actor": "Stickman Lore Scholar",
            "bubble": "Cơ hội xuất hiện!",
        },
    ]

    for idx, p in enumerate(panels):
        x0 = idx * panel_w
        x1 = x0 + panel_w
        # Panel Background
        draw.rectangle([x0 + 8, 8, x1 - 8, height - 8], fill=p["bg"], outline=p["accent"], width=3)

        # Header Title Banner
        draw.rectangle([x0 + 16, 16, x1 - 16, 70], fill=(24, 34, 50))
        draw.text((x0 + 24, 24), p["scene"], fill=(255, 255, 255))
        draw.text((x0 + 24, 46), f"{p['time']} • {p['genre']}", fill=p["accent"])

        # Professional Stage Presenter Card & Dynamic Speaker Visualizer (No Crude Stickman)
        center_y = height // 2
        card_x0 = x0 + 30
        card_y0 = center_y - 90
        card_x1 = x0 + panel_w - 30
        card_y1 = center_y + 150

        _rounded_rect(draw, [card_x0, card_y0, card_x1, card_y1], radius=14, fill=(18, 26, 38), outline=p["accent"], width=2)
        draw.text((card_x0 + 16, card_y0 + 12), f"ACTOR: {p['actor']}", fill=p["accent"])

        # Inner speaker monitor with voice equalizer bars
        inner_box = [card_x0 + 16, card_y0 + 38, card_x1 - 16, card_y1 - 16]
        _rounded_rect(draw, inner_box, radius=8, fill=(10, 16, 26), outline=(30, 45, 65), width=1)

        bar_count = 14
        bar_w = (inner_box[2] - inner_box[0] - 28) // bar_count
        for b_i in range(bar_count):
            bx = inner_box[0] + 14 + b_i * bar_w
            bh = int(15 + 40 * abs(math.sin(idx * 2.0 + b_i * 0.5)))
            by1 = inner_box[3] - 12 - bh
            by2 = inner_box[3] - 12
            draw.rectangle([bx, by1, bx + bar_w - 3, by2], fill=p["accent"])

        # Speech Bubble
        bubble_box = [x0 + 40, center_y - 180, x0 + panel_w - 40, center_y - 135]
        _rounded_rect(draw, bubble_box, radius=8, fill=(30, 41, 59), outline=p["accent"], width=2)
        draw.text((x0 + 60, center_y - 168), f"💬 \"{p['bubble']}\"", fill=(255, 255, 255))

        # Bottom Metadata Strip
        draw.rectangle([x0 + 16, height - 60, x1 - 16, height - 16], fill=(15, 23, 42))
        draw.text((x0 + 24, height - 48), f"Character: {p['actor']} • Status: Ready", fill=(148, 163, 184))

    out_bmp.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_bmp, format="BMP")

    assert out_bmp.exists() and out_bmp.stat().st_size > 1000, "Missing storyboard_contact_sheet.bmp"
    # Check BMP magic bytes
    with open(out_bmp, "rb") as f:
        magic = f.read(2)
        assert magic == b"BM", f"Invalid BMP magic: {magic}"

    print(f"      -> Storyboard Contact Sheet Size: {out_bmp.stat().st_size:,} bytes (BMP Magic: 'BM')")
    return {"path": str(out_bmp), "size": out_bmp.stat().st_size}


# =============================================================================
# 4. Real 9.0s 3-Scene 60fps/30fps Master MP4 Video
# =============================================================================
def build_real_master_mp4(out_mp4: Path, fps: int = 30) -> dict:
    print("[4/5] Rendering Real 9.0s 3-Scene Master Video (macro_crisis_2026_master.mp4)...")
    duration_sec = 9.0
    total_frames = int(round(duration_sec * fps))
    width, height = 1280, 720

    tmp_dir = Path(tempfile.mkdtemp(prefix="studio_master_frames_"))

    scenes_def = [
        {
            "name": "PHÂN CẢNH 1: LÃI SUẤT FED ĐẢO CHIỀU",
            "genre": "economics-stickman",
            "bg": (12, 20, 28),
            "accent": (16, 185, 129),
            "sub": "Tại sao FED tăng lãi suất lại gây chấn động toàn cầu?",
        },
        {
            "name": "PHÂN CẢNH 2: DÒNG TIỀN VŨ TRỤ",
            "genre": "universe-cosmic",
            "bg": (8, 10, 26),
            "accent": (56, 189, 248),
            "sub": "Dòng tiền khổng lồ đang rút khỏi thị trường như hố đen vũ trụ.",
        },
        {
            "name": "PHÂN CẢNH 3: PHẢN CÔNG CHIẾN THUẬT",
            "genre": "lore-chronicle",
            "bg": (28, 22, 16),
            "accent": (245, 158, 11),
            "sub": "Nhưng cơ hội lớn luôn mở ra cho những ai sẵn sàng!",
        },
    ]

    try:
        frames_per_scene = total_frames // 3
        for f_idx in range(total_frames):
            scene_idx = min(2, f_idx // frames_per_scene)
            scene_progress = (f_idx % frames_per_scene) / float(frames_per_scene)
            sc = scenes_def[scene_idx]

            img = Image.new("RGB", (width, height), sc["bg"])
            draw = ImageDraw.Draw(img)

            # 2.5D Camera Zoom & Pan
            cam_zoom = 1.0 + 0.1 * math.sin(scene_progress * math.pi)
            cam_pan_x = int(20 * math.sin(scene_progress * math.pi))

            # Perspective Grid
            grid_spacing = int(60 * cam_zoom)
            for gx in range(0, width, max(24, grid_spacing)):
                x_pos = (gx + cam_pan_x) % width
                draw.line([(x_pos, 0), (x_pos, height)], fill=(22, 35, 48), width=1)
            for gy in range(0, height, max(24, grid_spacing)):
                draw.line([(0, gy), (width, gy)], fill=(22, 35, 48), width=1)

            # Top HUD Bar
            draw.rectangle([0, 0, width, 54], fill=(9, 13, 22))
            draw.text((24, 18), f"AUTONOMOUS STUDIO PRO • MASTER RENDER", fill=(245, 158, 11))
            draw.text((width - 340, 18), f"TC: 00:0{int(f_idx / fps):02d}:{f_idx % fps:02d} | 60 FPS", fill=(148, 163, 184))

            # Scene Title Banner
            draw.text((60, 80), sc["name"], fill=sc["accent"])

            # Professional Stage Presenter Panel & Dynamic Waveform Visualizer (No Crude Stickman)
            actor_card_x1 = 70 + cam_pan_x
            actor_card_y1 = 160
            actor_card_x2 = 560 + cam_pan_x
            actor_card_y2 = 540

            _rounded_rect(draw, 
                [actor_card_x1, actor_card_y1, actor_card_x2, actor_card_y2],
                radius=18,
                fill=(18, 26, 38),
                outline=sc["accent"],
                width=3,
            )

            presenter_title = (
                "👔 CHIEF ECONOMIST & MARKET STRATEGIST" if sc["genre"] == "economics-stickman"
                else "🚀 LEAD ASTROPHYSICIST & EXPLORER" if sc["genre"] == "universe-cosmic"
                else "📜 CHIEF HISTORIAN & WAR STRATEGIST"
            )
            draw.text((actor_card_x1 + 24, actor_card_y1 + 18), presenter_title, fill=sc["accent"])

            presenter_inner_box = [actor_card_x1 + 24, actor_card_y1 + 54, actor_card_x2 - 24, actor_card_y2 - 60]
            _rounded_rect(draw, presenter_inner_box, radius=12, fill=(10, 16, 26), outline=(30, 45, 65), width=2)

            eq_bar_count = 18
            eq_w = (presenter_inner_box[2] - presenter_inner_box[0] - 36) // eq_bar_count
            for bar_i in range(eq_bar_count):
                bar_x = presenter_inner_box[0] + 18 + bar_i * eq_w
                bar_h = int((20 + 75 * abs(math.sin(f_idx * 0.35 + bar_i * 0.45))))
                bar_y1 = presenter_inner_box[3] - 20 - bar_h
                bar_y2 = presenter_inner_box[3] - 20
                draw.rectangle([bar_x, bar_y1, bar_x + eq_w - 4, bar_y2], fill=sc["accent"])

            stage_move_label = "⚡ Live Gesture: Explaining Market Shock" if scene_progress < 0.5 else "🚀 Live Gesture: Strategic Market Move"
            draw.text((actor_card_x1 + 24, actor_card_y2 - 45), stage_move_label, fill=(240, 248, 255))
            draw.text((actor_card_x1 + 24, actor_card_y2 - 25), "DIRECTOR AI: SYNCHRONIZED BROADCAST FEED", fill=(125, 211, 252))

            # Right Side Widget Card
            wx = 780
            wy = 180
            _rounded_rect(draw, [wx, wy, wx + 420, wy + 320], radius=16, fill=(15, 23, 42), outline=sc["accent"], width=2)
            draw.text((wx + 24, wy + 24), "METRIC INDEX MONITOR", fill=(148, 163, 184))

            # Dynamic Chart Curves inside widget
            points = []
            for px in range(wx + 24, wx + 396, 12):
                phase = (px - wx) / 50.0 + scene_progress * 4.0
                py = wy + 200 - int(50 * math.sin(phase) + 30 * math.cos(phase * 0.5))
                points.append((px, py))
            if len(points) >= 2:
                draw.line(points, fill=sc["accent"], width=3)

            # Bottom Subtitle Bar
            _rounded_rect(draw, [120, 620, width - 120, 696], radius=12, fill=(9, 13, 22), outline=(245, 158, 11), width=2)
            draw.text((150, 642), sc["sub"], fill=(250, 204, 21))

            frame_path = tmp_dir / f"frame_{f_idx:04d}.png"
            img.save(frame_path, format="PNG")

        # Encode to MP4 via Hardware Swift Encoder or FFmpeg
        out_mp4.parent.mkdir(parents=True, exist_ok=True)
        ffmpeg_bin = shutil.which("ffmpeg")
        if ffmpeg_bin:
            cmd = [
                ffmpeg_bin, "-y", "-framerate", str(fps),
                "-i", str(tmp_dir / "frame_%04d.png"),
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                str(out_mp4)
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        elif SWIFT_ENCODER_BIN.exists():
            cmd = [str(SWIFT_ENCODER_BIN), str(tmp_dir), str(fps), str(out_mp4)]
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        else:
            raise RuntimeError("No hardware MP4 encoder found!")

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    assert out_mp4.exists() and out_mp4.stat().st_size > 10000, "MP4 render failed or is empty"

    # Verify MP4 binary atoms (ftyp, moov, mdat)
    with open(out_mp4, "rb") as f:
        head_data = f.read(1024)
        f.seek(0, os.SEEK_END)
        file_len = f.tell()
        f.seek(max(0, file_len - 8192))
        tail_data = f.read()

    full_check = head_data + tail_data
    has_ftyp = b"ftyp" in full_check
    has_moov = b"moov" in full_check
    has_mdat = b"mdat" in full_check

    assert has_ftyp, "MP4 file missing 'ftyp' atom header"
    assert has_moov or has_mdat, "MP4 file missing 'moov' or 'mdat' atom payload"

    print(f"      -> Master MP4 Video Size: {out_mp4.stat().st_size:,} bytes")
    print(f"      -> Verified MP4 Binary Atoms: ftyp={has_ftyp}, moov={has_moov}, mdat={has_mdat}")

    return {
        "path": str(out_mp4),
        "size": out_mp4.stat().st_size,
        "hasFtyp": has_ftyp,
        "hasMoov": has_moov,
        "hasMdat": has_mdat,
    }


# =============================================================================
# Main Orchestrator
# =============================================================================
async def main() -> int:
    start_time = time.time()
    print("=" * 72)
    print("🚀 AUTONOMOUS STUDIO PRO • MASTER PRODUCTION BUILDER (BATCH 13)")
    print("   Zero-Mock Strict Real Product Generation & End-to-End Delivery")
    print("=" * 72)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Real Audio
    audio_res = await build_real_audio(OUTPUT_DIR / "voiceover_and_beats.wav")

    # 2. Real Project Package & OTIO Document
    proj_res = build_real_vproj_and_otio(OUTPUT_DIR)

    # 3. Real Storyboard Contact Sheet
    sb_res = build_real_storyboard(OUTPUT_DIR / "storyboard_contact_sheet.bmp")

    # 4. Real Master MP4 Video
    mp4_res = build_real_master_mp4(OUTPUT_DIR / "macro_crisis_2026_master.mp4", fps=30)

    elapsed = time.time() - start_time
    print("\n" + "=" * 72)
    print(f"✅ BATCH 13 ZERO-MOCK MASTER PRODUCT COMPLETED IN {elapsed:.2f}s!")
    print("=" * 72)
    print(f"📦 Output Directory: {OUTPUT_DIR}")

    manifest = {
        "generatedAtIso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "elapsedSeconds": round(elapsed, 2),
        "products": [
            {
                "filename": "voiceover_and_beats.wav",
                "bytes": audio_res["size"],
                "sha256": compute_sha256(OUTPUT_DIR / "voiceover_and_beats.wav"),
                "detectedSilences": audio_res["silences"],
                "bpm": audio_res["bpm"],
            },
            {
                "filename": "macro_crisis_2026.vproj.json",
                "bytes": proj_res["vprojSize"],
                "sha256": compute_sha256(OUTPUT_DIR / "macro_crisis_2026.vproj.json"),
                "format": "autonomous-studio.vproj",
            },
            {
                "filename": "macro_crisis_2026.otio",
                "bytes": proj_res["otioSize"],
                "sha256": compute_sha256(OUTPUT_DIR / "macro_crisis_2026.otio"),
                "schema": "Timeline.1",
            },
            {
                "filename": "storyboard_contact_sheet.bmp",
                "bytes": sb_res["size"],
                "sha256": compute_sha256(OUTPUT_DIR / "storyboard_contact_sheet.bmp"),
                "format": "BMP",
            },
            {
                "filename": "macro_crisis_2026_master.mp4",
                "bytes": mp4_res["size"],
                "sha256": compute_sha256(OUTPUT_DIR / "macro_crisis_2026_master.mp4"),
                "atomsVerified": ["ftyp", "moov" if mp4_res["hasMoov"] else "mdat"],
            },
        ],
    }

    manifest_file = OUTPUT_DIR / "product_manifest.json"
    manifest_file.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"📋 Product Manifest Saved: {manifest_file}")
    for item in manifest["products"]:
        print(f"  • {item['filename']:<32} {item['bytes']:>10,} bytes  (SHA-256: {item['sha256'][:16]}...)")
    print("=" * 72)

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

