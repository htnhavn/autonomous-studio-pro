#!/usr/bin/env python3
"""
@file watch_flash_worker.py
@description Background listener for the Architect Agent.
Monitors the workspace for Flash Worker activity in a parallel chat window:
  1. Watches `FLASH_SYNC.md` for `STATE: FLASH_DONE_BATCH`, OR
  2. Watches `apps/`, `packages/`, `services/`, `CHECKLIST.md` for file modifications
     followed by a 25-second quiet period (after Flash finishes writing a batch of files).
Once triggered, runs an automated syntax/type pre-audit and exits with code 0
so Antigravity's Reactive Wakeup immediately resumes the Architect Agent!
"""

import os
import py_compile
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WATCH_DIRS = [
    ROOT / "apps",
    ROOT / "packages",
    ROOT / "services",
    ROOT / "scripts",
    ROOT / "exports",
]
SYNC_FILE = ROOT / "FLASH_SYNC.md"
CHECKLIST_FILE = ROOT / "CHECKLIST.md"

QUIET_SECONDS_WHEN_BATCH_COMPLETE = 5.0
QUIET_SECONDS_AFTER_LAST_EDIT = 45.0
POLL_INTERVAL_SEC = 2.0


def all_expected_targets_exist(changed_since_start: set[str]) -> bool:
    return (
        (ROOT / "ARCHITECTURE.md").exists()
        and (ROOT / "PROJECT_PACKAGE_SPEC.md").exists()
        and (ROOT / "IMPLEMENTATION_STATUS.md").exists()
        and "services/ai-sidecar/pipelines/audio_studio.py" in changed_since_start
    )


def snapshot_mtimes() -> dict[str, float]:
    snap: dict[str, float] = {}
    ignore_dirs = {"node_modules", "__pycache__", "target", "dist", ".git", ".vite"}
    for d in WATCH_DIRS:
        if not d.exists():
            continue
        for root_dir, dirs, files in os.walk(d):
            # Prune heavy or transient directories in-place so os.walk never enters them
            dirs[:] = [
                sub for sub in dirs
                if not sub.startswith(".") and sub not in ignore_dirs
            ]
            root_path = Path(root_dir)
            for fname in files:
                if fname.startswith("."):
                    continue
                p = root_path / fname
                try:
                    snap[str(p.relative_to(ROOT))] = p.stat().st_mtime
                except OSError:
                    pass
    for f in (SYNC_FILE, CHECKLIST_FILE):
        if f.exists():
            try:
                snap[str(f.relative_to(ROOT))] = f.stat().st_mtime
            except OSError:
                pass
    return snap


def check_sync_done_flag() -> bool:
    if not SYNC_FILE.exists():
        return False
    try:
        lines = SYNC_FILE.read_text(encoding="utf-8").splitlines()[:8]
        return any(line.strip() == "STATE: FLASH_DONE_BATCH" for line in lines)
    except OSError:
        return False


def run_pre_audit(changed_files: list[str]) -> str:
    lines = [
        "==================================================================",
        "🔔 FLASH WORKER BATCH COMPLETED — ARCHITECT PRE-AUDIT REPORT",
        "==================================================================",
        f"Changed / Created Files ({len(changed_files)}):",
    ]
    for cf in sorted(changed_files):
        lines.append(f"  - {cf}")

    # Audit Python files
    py_errors = []
    for p in (ROOT / "services").rglob("*.py"):
        try:
            py_compile.compile(str(p), doraise=True)
        except Exception as e:
            py_errors.append(f"{p.relative_to(ROOT)}: {e}")

    if py_errors:
        lines.append("\n❌ PYTHON SYNTAX ERRORS DETECTED:")
        for err in py_errors:
            lines.append(f"  * {err}")
    else:
        lines.append("\n✅ Python Pre-Audit: All .py files in services/ compile cleanly.")

    lines.append("==================================================================")
    return "\n".join(lines)


def main() -> int:
    print(f"[Architect Watcher] Listening for Flash Worker changes in {ROOT}...", flush=True)
    initial_snap = snapshot_mtimes()
    changed_since_start: set[str] = set()
    last_change_ts: float | None = None
    prev_snap = dict(initial_snap)

    while True:
        time.sleep(POLL_INTERVAL_SEC)
        curr_snap = snapshot_mtimes()

        # Detect any new or modified files compared to prev_snap
        newly_touched = []
        for rel_path, mtime in curr_snap.items():
            if rel_path not in prev_snap or mtime > prev_snap[rel_path]:
                newly_touched.append(rel_path)
                if rel_path != "FLASH_SYNC.md":
                    changed_since_start.add(rel_path)

        if newly_touched:
            last_change_ts = time.time()
            print(f"[Architect Watcher] Detected Flash touching: {', '.join(newly_touched)}", flush=True)
            prev_snap = curr_snap

        # Trigger 1: Explicit STATE: FLASH_DONE_BATCH in top header of FLASH_SYNC.md
        if check_sync_done_flag():
            print("[Architect Watcher] Detected STATE: FLASH_DONE_BATCH in FLASH_SYNC.md!", flush=True)
            print(run_pre_audit(list(changed_since_start)), flush=True)
            return 0

        # Trigger 2: All expected batch files exist/updated and settled for 20s
        if all_expected_targets_exist(changed_since_start) and last_change_ts is not None:
            idle_time = time.time() - last_change_ts
            if idle_time >= QUIET_SECONDS_WHEN_BATCH_COMPLETE:
                print(
                    f"[Architect Watcher] All expected batch targets created and settled for {idle_time:.1f}s!",
                    flush=True,
                )
                print(run_pre_audit(list(changed_since_start)), flush=True)
                return 0

        # Trigger 3: Code files were modified and settled for QUIET_SECONDS_AFTER_LAST_EDIT (120s fallback)
        if changed_since_start and last_change_ts is not None:
            idle_time = time.time() - last_change_ts
            if idle_time >= QUIET_SECONDS_AFTER_LAST_EDIT:
                print(
                    f"[Architect Watcher] Flash settled for {idle_time:.1f}s after modifying {len(changed_since_start)} files.",
                    flush=True,
                )
                print(run_pre_audit(list(changed_since_start)), flush=True)
                return 0


if __name__ == "__main__":
    sys.exit(main())
