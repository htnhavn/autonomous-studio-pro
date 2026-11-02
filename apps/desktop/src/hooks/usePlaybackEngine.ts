/**
 * @file usePlaybackEngine.ts
 * @description 60fps High-Precision Playback Engine Hook.
 * Uses requestAnimationFrame with delta-time compensation to drive playheadTime smoothly
 * across Stickman Puppets, Motion Code, Dynamic Captions, and Video tracks.
 * Supports Spacebar Play/Pause keyboard shortcut.
 */

import { useEffect, useRef } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import {
  toSeconds,
  fromSeconds,
  addTime,
} from '../../../../packages/core-schema/src/rational-time';

export function usePlaybackEngine(): void {
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const playheadTime = useStudioStore((s) => s.playheadTime);
  const setPlayheadTime = useStudioStore((s) => s.setPlayheadTime);
  const togglePlay = useStudioStore((s) => s.togglePlay);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);
  const fps = useStudioStore((s) => s.project.settings.fps) || 60;

  const lastFrameTimeRef = useRef<number | null>(null);
  const playheadSecRef = useRef<number>(toSeconds(playheadTime));
  playheadSecRef.current = toSeconds(playheadTime);

  // 1. requestAnimationFrame 60fps clock loop
  useEffect(() => {
    if (!isPlaying) {
      lastFrameTimeRef.current = null;
      return;
    }

    let animId: number;

    const tick = (now: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = now;
      } else {
        const deltaSec = (now - lastFrameTimeRef.current) / 1000.0;
        lastFrameTimeRef.current = now;

        // Advance playhead time (clamp delta to max 0.1s to avoid jumps on tab focus)
        const safeDelta = Math.min(0.1, deltaSec);
        const nextSec = playheadSecRef.current + safeDelta;
        playheadSecRef.current = nextSec;

        setPlayheadTime(fromSeconds(nextSec, fps));
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      lastFrameTimeRef.current = null;
    };
  }, [isPlaying, fps, setPlayheadTime]);

  // 2. Global Spacebar Play/Pause Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input, textarea, or contentEditable element
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);
}

