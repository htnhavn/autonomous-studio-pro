/**
 * @file App.tsx
 * @description Main Application Entry Point for Autonomous Studio Pro Desktop.
 */

import React, { useEffect } from 'react';
import { StudioWorkspace } from './components/layout/StudioWorkspace';
import { useStudioStore } from './store/useStudioStore';
import { fromSeconds } from '../../../packages/core-schema/src/rational-time';

export const App: React.FC = () => {
  const dispatchCommand = useStudioStore((s) => s.dispatchCommand);
  const updateAgentCursor = useStudioStore((s) => s.updateAgentCursor);

  // Initialize demo project data with sample clips so the workspace looks full and alive immediately
  useEffect(() => {
    // 1. Initial Sample A-Roll Clip
    dispatchCommand({
      commandId: 'cmd_init_aroll',
      actor: { kind: 'user', id: 'system', displayName: 'System' },
      timestampMs: Date.now(),
      command: {
        type: 'CLIP_INSERT',
        trackId: 'track-video-aroll',
        rippleShiftSubsequentClips: false,
        clip: {
          id: 'clip_aroll_01',
          name: 'Hero_A-Roll_Interview_4K.mp4',
          trackId: 'track-video-aroll',
          kind: 'video',
          timelineRange: {
            startTime: fromSeconds(0, 60),
            duration: fromSeconds(14, 60),
          },
          sourceRange: {
            startTime: fromSeconds(0, 60),
            duration: fromSeconds(14, 60),
          },
          speedMultiplier: 1.0,
          blendMode: 'normal',
          enabled: true,
          lockedByUser: false,
          transform: {
            positionX: { staticValue: 0, keyframes: [] },
            positionY: { staticValue: 0, keyframes: [] },
            positionZ: { staticValue: 0, keyframes: [] },
            scaleX: { staticValue: 1.0, keyframes: [] },
            scaleY: { staticValue: 1.0, keyframes: [] },
            rotationX: { staticValue: 0, keyframes: [] },
            rotationY: { staticValue: 0, keyframes: [] },
            rotationZ: { staticValue: 0, keyframes: [] },
            anchorX: { staticValue: 0, keyframes: [] },
            anchorY: { staticValue: 0, keyframes: [] },
            opacity: { staticValue: 1.0, keyframes: [] },
          },
          shaders: [],
          colorGrade: {
            enabled: true,
            exposure: { staticValue: 0, keyframes: [] },
            contrast: { staticValue: 1.0, keyframes: [] },
            saturation: { staticValue: 1.0, keyframes: [] },
            temperature: { staticValue: 0, keyframes: [] },
            tint: { staticValue: 0, keyframes: [] },
            lift: [0, 0, 0, 0],
            gamma: [0, 0, 0, 0],
            gain: [0, 0, 0, 0],
            lutIntensity: { staticValue: 1.0, keyframes: [] },
            filmGrainIntensity: { staticValue: 0, keyframes: [] },
            halationIntensity: { staticValue: 0, keyframes: [] },
          },
          aiVfx: {
            rotoscopeMask: {
              enabled: true,
              model: 'sam2.1-hiera-large',
              featherPx: 2.0,
              invertMask: false,
            },
          },
          audio: {
            volumeDb: { staticValue: 0, keyframes: [] },
            pan: { staticValue: 0, keyframes: [] },
            mute: false,
            fadeInDuration: fromSeconds(0, 60),
            fadeOutDuration: fromSeconds(0, 60),
            aiDenoiseEnabled: true,
            aiVocalIsolationEnabled: false,
            duckingRole: 'voice-trigger',
            duckingAmountDb: -14,
          },
        },
      },
    });

    // 2. Initial Sample Dynamic Captions (Hormozi Style)
    dispatchCommand({
      commandId: 'cmd_init_caption',
      actor: { kind: 'agent', id: 'agent_roughcut_01', displayName: 'WhisperX AI' },
      timestampMs: Date.now(),
      command: {
        type: 'CLIP_INSERT',
        trackId: 'track-caption-1',
        rippleShiftSubsequentClips: false,
        clip: {
          id: 'clip_caption_01',
          name: 'WhisperX_Dynamic_Word_Subtitles',
          trackId: 'track-caption-1',
          kind: 'caption',
          timelineRange: {
            startTime: fromSeconds(0, 60),
            duration: fromSeconds(10, 60),
          },
          sourceRange: {
            startTime: fromSeconds(0, 60),
            duration: fromSeconds(10, 60),
          },
          speedMultiplier: 1.0,
          blendMode: 'normal',
          enabled: true,
          lockedByUser: false,
          transform: {
            positionX: { staticValue: 0, keyframes: [] },
            positionY: { staticValue: 0, keyframes: [] },
            positionZ: { staticValue: 0, keyframes: [] },
            scaleX: { staticValue: 1.0, keyframes: [] },
            scaleY: { staticValue: 1.0, keyframes: [] },
            rotationX: { staticValue: 0, keyframes: [] },
            rotationY: { staticValue: 0, keyframes: [] },
            rotationZ: { staticValue: 0, keyframes: [] },
            anchorX: { staticValue: 0, keyframes: [] },
            anchorY: { staticValue: 0, keyframes: [] },
            opacity: { staticValue: 1.0, keyframes: [] },
          },
          shaders: [],
          colorGrade: {
            enabled: false,
            exposure: { staticValue: 0, keyframes: [] },
            contrast: { staticValue: 1.0, keyframes: [] },
            saturation: { staticValue: 1.0, keyframes: [] },
            temperature: { staticValue: 0, keyframes: [] },
            tint: { staticValue: 0, keyframes: [] },
            lift: [0, 0, 0, 0],
            gamma: [0, 0, 0, 0],
            gain: [0, 0, 0, 0],
            lutIntensity: { staticValue: 1.0, keyframes: [] },
            filmGrainIntensity: { staticValue: 0, keyframes: [] },
            halationIntensity: { staticValue: 0, keyframes: [] },
          },
          aiVfx: {},
          audio: {
            volumeDb: { staticValue: 0, keyframes: [] },
            pan: { staticValue: 0, keyframes: [] },
            mute: true,
            fadeInDuration: fromSeconds(0, 60),
            fadeOutDuration: fromSeconds(0, 60),
            aiDenoiseEnabled: false,
            aiVocalIsolationEnabled: false,
            duckingRole: 'none',
            duckingAmountDb: 0,
          },
          captionData: {
            stylePresetId: 'hormozi-punch',
            fontFamily: 'Impact',
            fontSizePx: 48,
            primaryColorHex: '#ffffff',
            activeWordColorHex: '#f59e0b',
            strokeColorHex: '#000000',
            strokeWidthPx: 6,
            maxWordsPerLine: 3,
            placeBehindSubjectIfMasked: true,
            words: [
              { id: 'w1', word: 'THIS', startOffset: fromSeconds(0.2, 60), endOffset: fromSeconds(0.6, 60), confidence: 0.99 },
              { id: 'w2', word: 'AI', startOffset: fromSeconds(0.6, 60), endOffset: fromSeconds(0.9, 60), confidence: 0.99 },
              { id: 'w3', word: 'EDITS', startOffset: fromSeconds(0.9, 60), endOffset: fromSeconds(1.3, 60), confidence: 0.98 },
              { id: 'w4', word: 'EVERYTHING', startOffset: fromSeconds(1.3, 60), endOffset: fromSeconds(1.9, 60), confidence: 0.99 },
              { id: 'w5', word: 'AUTOMATICALLY', startOffset: fromSeconds(1.9, 60), endOffset: fromSeconds(2.8, 60), confidence: 0.97 },
            ],
          },
        },
      },
    });

    // 3. Initial Sample Ghost Cursor for Director
    updateAgentCursor({
      agentId: 'agent_director_01',
      role: 'director',
      displayName: '🎬 Director AI',
      colorHex: '#F59E0B',
      provider: 'google-gemini',
      status: 'thinking',
      currentTimelineTime: fromSeconds(3.5, 60),
      targetTrackId: 'track-video-broll',
      liveActionBubble: '🎬 Đạo diễn AI đang chia nhịp phân cảnh 3.5s...',
      updatedAtMs: Date.now(),
    });
  }, [dispatchCommand, updateAgentCursor]);

  return <StudioWorkspace />;
};

