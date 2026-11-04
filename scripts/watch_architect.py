#!/usr/bin/env python3
"""
@file watch_architect.py
@description Background listener for the Flash Worker Agent.
Monitors the workspace for Architect (Argon) instructions / state changes in FLASH_SYNC.md:
  1. Detects when Architect updates FLASH_SYNC.md (mtime and content changed).
  2. Detects any new architect directive files or state transitions.
  3. Once triggered, prints the new Architect directives and exits with code 0
     so Antigravity's Reactive Wakeup immediately alerts Flash of new instructions!
"""

import hashlib
import os
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parent.parent
SYNC_FILE = ROOT / "FLASH_SYNC.md"
DIRECTIVES_FILE = ROOT / "ARCHITECT_DIRECTIVES.md"
POLL_INTERVAL_SEC = float(os.environ.get("ARCHITECT_WATCH_POLL_SEC", "2.0"))


def file_hash(path: Path) -> str:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except FileNotFoundError:
        return ""
    except OSError as exc:
        print(f"[Flash Listener] Cannot read {path}: {exc}", file=sys.stderr)
        return ""


def main() -> int:
    print(f"[Flash Listener] Listening for Architect (Argon) updates in {ROOT}...", flush=True)

    init_sync_hash = file_hash(SYNC_FILE)
    try:
        init_sync_mtime = SYNC_FILE.stat().st_mtime if SYNC_FILE.exists() else 0.0
    except OSError:
        init_sync_mtime = 0.0
    init_directives_hash = file_hash(DIRECTIVES_FILE)

    try:
        while True:
            time.sleep(POLL_INTERVAL_SEC)

            # Check FLASH_SYNC.md
            try:
                if SYNC_FILE.exists():
                    curr_mtime = SYNC_FILE.stat().st_mtime
                    if curr_mtime > init_sync_mtime:
                        curr_hash = file_hash(SYNC_FILE)
                        if curr_hash != init_sync_hash:
                            content = SYNC_FILE.read_text(encoding="utf-8")
                            print("\n==================================================================", flush=True)
                            print("🔔 ARCHITECT (ARGON) UPDATED FLASH_SYNC.md!", flush=True)
                            print("==================================================================", flush=True)
                            print(content[:1000], flush=True)
                            print("==================================================================", flush=True)
                            return 0
            except FileNotFoundError:
                # File removed between exists() and stat(); ignore this tick.
                pass

            # Check ARCHITECT_DIRECTIVES.md
            try:
                if DIRECTIVES_FILE.exists():
                    curr_dir_hash = file_hash(DIRECTIVES_FILE)
                    if curr_dir_hash != init_directives_hash:
                        content = DIRECTIVES_FILE.read_text(encoding="utf-8")
                        print("\n==================================================================", flush=True)
                        print("🔔 NEW ARCHITECT DIRECTIVE FILE DETECTED!", flush=True)
                        print("==================================================================", flush=True)
                        print(content[:1000], flush=True)
                        print("==================================================================", flush=True)
                        return 0
            except FileNotFoundError:
                pass
    except KeyboardInterrupt:
        print("\n[Flash Listener] Stopped by user.", flush=True)
        return 0


if __name__ == "__main__":
    sys.exit(main())

