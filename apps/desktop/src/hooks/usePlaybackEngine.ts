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
  const project = useStudioStore((s) => s.project);
  const fps = project.settings.fps || 60;

  const lastFrameTimeRef = useRef<number | null>(null);
  const playheadSecRef = useRef<number>(toSeconds(playheadTime));
  playheadSecRef.current = toSeconds(playheadTime);

  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

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

  // 2. Synchronize Audio Tracks Playback & Auto-Ducking (-14dB)
  useEffect(() => {
    const currentSec = toSeconds(playheadTime);
    const audioTracks = project.tracks.filter(
      (t) => t.kind === 'audio-voice' || t.kind === 'audio-music' || t.kind === 'audio-sfx'
    );

    // Check if voice dialogue is actively speaking for auto-ducking
    let isVoiceActive = false;
    for (const track of audioTracks) {
      if (track.kind === 'audio-voice' && !track.muted) {
        for (const clip of track.clips) {
          if (!clip.enabled) continue;
          const start = toSeconds(clip.timelineRange.startTime);
          const dur = toSeconds(clip.timelineRange.duration);
          if (currentSec >= start && currentSec <= start + dur) {
            isVoiceActive = true;
            break;
          }
        }
      }
    }

    // Update audio elements
    for (const track of audioTracks) {
      if (track.muted) {
        track.clips.forEach((c) => {
          const el = audioElementsRef.current.get(c.id);
          if (el && !el.paused) el.pause();
        });
        continue;
      }

      for (const clip of track.clips) {
        if (!clip.enabled) continue;
        const start = toSeconds(clip.timelineRange.startTime);
        const dur = toSeconds(clip.timelineRange.duration);
        const sourceStart = toSeconds(clip.sourceRange.startTime);
        const isActive = currentSec >= start && currentSec <= start + dur;

        // Resolve asset media source
        const asset = Object.values(project.mediaPool).find((a) => a.id === clip.id || a.name === clip.name);
        const audioSrc =
          asset?.localFilePath?.startsWith('http') || asset?.localFilePath?.startsWith('blob:')
            ? asset.localFilePath
            : asset?.origin?.sourceUrl?.startsWith('http')
            ? asset.origin.sourceUrl
            : null;

        if (!audioSrc) continue;

        let el = audioElementsRef.current.get(clip.id);
        if (!el) {
          el = new Audio(audioSrc);
          el.preload = 'auto';
          audioElementsRef.current.set(clip.id, el);
        }

        // Apply volume & Auto-Ducking
        let targetVolume = Math.min(1.0, Math.max(0.0, Math.pow(10, (clip.audio.volumeDb.staticValue || 0) / 20)));
        if (track.kind === 'audio-music' && isVoiceActive) {
          // Auto-duck by -14dB (~0.2x linear multiplier)
          targetVolume *= 0.2;
        }
        el.volume = targetVolume;

        const targetAudioTime = Math.max(0, currentSec - start + sourceStart);

        if (isPlaying && isActive) {
          if (Math.abs(el.currentTime - targetAudioTime) > 0.25) {
            el.currentTime = targetAudioTime;
          }
          if (el.paused) {
            el.play().catch(() => {});
          }
        } else {
          if (!el.paused) {
            el.pause();
          }
        }
      }
    }

    // Cleanup clips removed from timeline
    const activeClipIds = new Set(project.tracks.flatMap((t) => t.clips.map((c) => c.id)));
    for (const [id, el] of audioElementsRef.current.entries()) {
      if (!activeClipIds.has(id)) {
        el.pause();
        audioElementsRef.current.delete(id);
      }
    }
  }, [isPlaying, playheadTime.value, project]);

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

