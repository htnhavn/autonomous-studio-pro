#!/usr/bin/env python3
"""
@file clone_references.py
@description Clones all 14 open-source reference repositories into `references/`
when setting up Autonomous Studio Pro on a new machine (Windows PC / macOS / Linux).
"""

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
REF_DIR = ROOT / "references"

REPOS = {
    "artcraft": "https://github.com/artcraft-app/artcraft.git",
    "WeftCut": "https://github.com/WeftCut/WeftCut.git",
    "Clypra": "https://github.com/Clypra/Clypra.git",
    "OpenCut": "https://github.com/OpenCut-app/OpenCut.git",
    "FableCut": "https://github.com/FableCut/FableCut.git",
    "gl-transitions": "https://github.com/gl-transitions/gl-transitions.git",
    "revideo": "https://github.com/redotvideo/revideo.git",
    "agentic-video-editor": "https://github.com/agentic-video-editor/agentic-video-editor.git",
    "autobroll": "https://github.com/autobroll/autobroll.git",
    "MoneyPrinterTurbo": "https://github.com/harry0703/MoneyPrinterTurbo.git",
    "ShortGPT": "https://github.com/RayVentura/ShortGPT.git",
    "whisperX": "https://github.com/m-bain/whisperX.git",
    "auto-editor": "https://github.com/WyattBlue/auto-editor.git",
    "olive": "https://github.com/olive-editor/olive.git",
}


def main() -> int:
    REF_DIR.mkdir(parents=True, exist_ok=True)
    failures: list[str] = []
    for name, url in REPOS.items():
        dest = REF_DIR / name
        if dest.exists():
            print(f"[SKIP] {name} already exists at {dest}")
            continue
        print(f"[CLONE] Cloning {name} from {url}...")
        result = subprocess.run(["git", "clone", "--depth", "1", url, str(dest)], check=False)
        if result.returncode != 0:
            print(f"[FAIL] {name} failed to clone (exit {result.returncode})", file=sys.stderr)
            failures.append(name)
    if failures:
        print(f"\n{len(failures)} reference repo(s) failed: {', '.join(failures)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

