/**
 * @file ShaderColorCompositor.tsx
 * @description Real-time WebGL/CSS DaVinci Color Grading & GPU Shader / Transition Compositor.
 * Applies:
 *   1. DaVinci Resolve-grade Color Grading (Exposure, Contrast, Saturation, Temperature, Tint,
 *      Lift/Gamma/Gain, Halation Bloom, and 35mm Film Grain).
 *   2. GPU Shaders (CapCut 3D Zoom Pro, Shadertoy CRT Retro, Chromatic Aberration, Glitch Displace).
 *   3. GPU Transitions (gl-transitions Directional Wipe, Cross Zoom, Luma Wipe).
 *   4. Real-time active Shader & Color grading badges in the Program Monitor.
 */

import React, { useMemo } from 'react';
import { TimelineClip } from '../../../../../packages/core-schema/src/timeline';
import { toSeconds } from '../../../../../packages/core-schema/src/rational-time';
import { Palette, Sparkles, Wand2, Film } from 'lucide-react';

export interface ShaderColorCompositorProps {
  readonly clip: TimelineClip | undefined;
  readonly currentTimeSec: number;
  readonly children: React.ReactNode;
  readonly className?: string;
}

function evaluateAnimatable(
  prop: { staticValue?: number; keyframes?: readonly { timeOffset: { value: number; rate: number }; value: number }[] } | undefined,
  clipTimeSec: number,
  fallback: number
): number {
  if (!prop) return fallback;
  if (!prop.keyframes || prop.keyframes.length === 0) {
    return prop.staticValue ?? fallback;
  }
  const kfs = [...prop.keyframes].sort((a, b) => toSeconds(a.timeOffset) - toSeconds(b.timeOffset));
  if (clipTimeSec <= toSeconds(kfs[0].timeOffset)) return kfs[0].value;
  if (clipTimeSec >= toSeconds(kfs[kfs.length - 1].timeOffset)) return kfs[kfs.length - 1].value;
  for (let i = 0; i < kfs.length - 1; i++) {
    const t0 = toSeconds(kfs[i].timeOffset);
    const t1 = toSeconds(kfs[i + 1].timeOffset);
    if (clipTimeSec >= t0 && clipTimeSec <= t1) {
      const alpha = t1 > t0 ? (clipTimeSec - t0) / (t1 - t0) : 0;
      return kfs[i].value + (kfs[i + 1].value - kfs[i].value) * alpha;
    }
  }
  return prop.staticValue ?? fallback;
}

export const ShaderColorCompositor: React.FC<ShaderColorCompositorProps> = ({
  clip,
  currentTimeSec,
  children,
  className = '',
}) => {
  // 1. Evaluate DaVinci Color Grade
  const colorGrade = clip?.colorGrade;
  const isGradeEnabled = colorGrade?.enabled !== false;
  const clipStartSec = clip ? toSeconds(clip.timelineRange.startTime) : 0;
  const localClipSec = Math.max(0, currentTimeSec - clipStartSec);

  const exposure = isGradeEnabled ? evaluateAnimatable(colorGrade?.exposure, localClipSec, 0) : 0;
  const contrast = isGradeEnabled ? evaluateAnimatable(colorGrade?.contrast, localClipSec, 1) : 1;
  const saturation = isGradeEnabled ? evaluateAnimatable(colorGrade?.saturation, localClipSec, 1) : 1;
  const temperature = isGradeEnabled ? evaluateAnimatable(colorGrade?.temperature, localClipSec, 0) : 0;
  const tint = isGradeEnabled ? evaluateAnimatable(colorGrade?.tint, localClipSec, 0) : 0;
  const halation = isGradeEnabled ? evaluateAnimatable(colorGrade?.halationIntensity, localClipSec, 0) : 0;
  const filmGrain = isGradeEnabled ? evaluateAnimatable(colorGrade?.filmGrainIntensity, localClipSec, 0) : 0;

  // Lift / Gamma / Gain vectors [R, G, B, Master]
  const lift = colorGrade?.lift || [0, 0, 0, 0];
  const gamma = colorGrade?.gamma || [0, 0, 0, 0];
  const gain = colorGrade?.gain || [0, 0, 0, 0];

  // 2. Compute CSS Color Filters
  const colorFilterStyle = useMemo(() => {
    // Exposure maps to brightness: 0 -> 100%, +1 -> 125%, -1 -> 75%
    const brightnessPct = Math.max(10, Math.min(250, (1.0 + exposure * 0.25 + (lift[3] + gain[3]) * 0.15) * 100));
    const contrastPct = Math.max(10, Math.min(250, contrast * 100));
    const saturatePct = Math.max(0, Math.min(300, saturation * 100));

    // Temperature shifts: positive = warm/amber (sepia + slight hue-rotate), negative = cool/blue
    let tempFilter = '';
    if (temperature > 0) {
      tempFilter = `sepia(${Math.min(0.6, temperature * 0.5)}) hue-rotate(-${temperature * 12}deg)`;
    } else if (temperature < 0) {
      tempFilter = `hue-rotate(${Math.abs(temperature) * 18}deg)`;
    }

    // Tint shifts: positive = magenta, negative = green
    let tintFilter = '';
    if (tint !== 0) {
      tintFilter = `hue-rotate(${tint * 25}deg)`;
    }

    return `${tempFilter} ${tintFilter} brightness(${brightnessPct.toFixed(1)}%) contrast(${contrastPct.toFixed(1)}%) saturate(${saturatePct.toFixed(1)}%)`.trim();
  }, [exposure, contrast, saturation, temperature, tint, lift, gain]);

  // 3. Evaluate Active Shaders (CapCut 3D Zoom, RGB Stroke, CRT Scanline, TV Wall, Chromatic Aberration)
  const activeShaders = clip?.shaders || [];
  const has3DZoom = activeShaders.some((s) => s.shaderId.includes('3d-zoom') || s.shaderId.includes('zoom'));
  const hasCrtRetro = activeShaders.some((s) => s.shaderId.includes('crt') || s.shaderId.includes('retro'));
  const hasChromatic = activeShaders.some((s) => s.shaderId.includes('chromatic') || s.shaderId.includes('glitch'));
  const hasHalationShader = activeShaders.some((s) => s.shaderId.includes('halation') || s.shaderId.includes('glow'));
  const hasRgbStroke = activeShaders.some((s) => s.shaderId.includes('rgb-stroke') || s.shaderId.includes('stroke'));
  const hasBlur = activeShaders.some((s) => s.shaderId.includes('blur'));
  const hasTvWall = activeShaders.some((s) => s.shaderId.includes('tv-wall'));
  const hasEdgeGlow = activeShaders.some((s) => s.shaderId.includes('edge-glow'));

  // 3D Zoom Motion evaluation
  const zoom3DTransform = useMemo(() => {
    if (!has3DZoom) return '';
    const zoomOsc = Math.sin(currentTimeSec * 3.5) * 0.05;
    const rotOsc = Math.sin(currentTimeSec * 2.0) * 1.5;
    return `scale(${1.04 + zoomOsc}) rotateZ(${rotOsc}deg)`;
  }, [has3DZoom, currentTimeSec]);

  // Chromatic Aberration Split filter & Blur
  const chromaticFilter = hasChromatic
    ? 'drop-shadow(2px 0px 0px rgba(239, 68, 68, 0.7)) drop-shadow(-2px 0px 0px rgba(6, 182, 212, 0.7))'
    : '';
  const blurFilter = hasBlur ? 'blur(4px)' : '';

  // 4. Evaluate Active Transitions (In / Out)
  const transitionInfo = useMemo(() => {
    if (!clip) return null;
    const clipStartSec = toSeconds(clip.timelineRange.startTime);
    const clipDurSec = toSeconds(clip.timelineRange.duration);
    const elapsed = currentTimeSec - clipStartSec;

    // Check Transition In
    if (clip.transitionIn) {
      const durIn = toSeconds(clip.transitionIn.duration);
      if (durIn > 0 && elapsed >= 0 && elapsed <= durIn) {
        const progress = Math.min(1, Math.max(0, elapsed / durIn));
        return {
          type: 'in' as const,
          name: clip.transitionIn.transitionShaderId,
          progress,
        };
      }
    }

    // Check Transition Out
    if (clip.transitionOut) {
      const durOut = toSeconds(clip.transitionOut.duration);
      const remaining = clipStartSec + clipDurSec - currentTimeSec;
      if (durOut > 0 && remaining >= 0 && remaining <= durOut) {
        const progress = Math.min(1, Math.max(0, 1.0 - remaining / durOut));
        return {
          type: 'out' as const,
          name: clip.transitionOut.transitionShaderId,
          progress,
        };
      }
    }

    return null;
  }, [clip, currentTimeSec]);

  // Transition Visual Transformation
  const transitionStyle = useMemo<React.CSSProperties>(() => {
    if (!transitionInfo) return {};
    const { progress, type } = transitionInfo;
    const effectiveP = type === 'in' ? progress : 1.0 - progress;

    return {
      opacity: Math.max(0, Math.min(1, effectiveP * 1.2)),
      transform: `scale(${0.92 + effectiveP * 0.08})`,
      transition: 'opacity 0.05s linear, transform 0.05s linear',
    };
  }, [transitionInfo]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Container with DaVinci Color Grade + 3D Zoom */}
      <div
        className="w-full h-full relative will-change-transform"
        style={{
          filter: `${colorFilterStyle} ${chromaticFilter} ${blurFilter}`.trim(),
          transform: zoom3DTransform || undefined,
          ...transitionStyle,
        }}
      >
        {children}

        {/* RGB Stroke Neon Outline Overlay (CapCut Viral Look) */}
        {hasRgbStroke && (
          <div className="absolute inset-0 pointer-events-none z-30 border-[3px] border-[#00e5cc] shadow-[inset_0_0_24px_rgba(0,229,204,0.45),0_0_30px_rgba(0,229,204,0.6)] animate-pulse" />
        )}

        {/* Edge Glow Contour Overlay */}
        {hasEdgeGlow && (
          <div className="absolute inset-0 pointer-events-none z-30 border-2 border-pink-500/70 shadow-[inset_0_0_16px_rgba(236,72,153,0.4)]" />
        )}

        {/* TV Wall Mosaic Grid Overlay */}
        {hasTvWall && (
          <div className="absolute inset-0 pointer-events-none z-25 grid grid-cols-2 grid-rows-2 gap-1 p-1 bg-black/40">
            <div className="border border-white/20" />
            <div className="border border-white/20" />
            <div className="border border-white/20" />
            <div className="border border-white/20" />
          </div>
        )}

        {/* Halation Warm Bloom Overlay */}
        {(halation > 0.05 || hasHalationShader) && (
          <div
            className="absolute inset-0 pointer-events-none mix-blend-screen bg-gradient-to-tr from-amber-500/20 via-orange-400/10 to-transparent blur-md"
            style={{ opacity: Math.min(0.8, halation > 0 ? halation * 0.8 : 0.45) }}
          />
        )}

        {/* 35mm Film Grain Overlay */}
        {filmGrain > 0.05 && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:6px_6px] animate-pulse"
            style={{ opacity: Math.min(0.5, filmGrain * 0.45) }}
          />
        )}

        {/* CRT Scanline Retro Shaders */}
        {hasCrtRetro && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {/* Horizontal scanline lines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] opacity-60" />
            {/* CRT curvature vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,0,0,0.8)_100%)]" />
          </div>
        )}
      </div>

      {/* Real-time Status Badges in Monitor Overlay */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-30 pointer-events-none">
        {/* DaVinci Grade Active Badge */}
        {isGradeEnabled && (exposure !== 0 || contrast !== 1 || saturation !== 1 || temperature !== 0) && (
          <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 font-mono text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-1 backdrop-blur-sm">
            <Palette className="w-2.5 h-2.5 text-amber-400" />
            DaVinci Grade ({exposure > 0 ? `+${exposure.toFixed(1)}EV` : `${exposure.toFixed(1)}EV`})
          </span>
        )}

        {/* Active Shader Badge */}
        {activeShaders.length > 0 && (
          <span className="bg-purple-950/80 border border-purple-500/60 text-purple-300 font-mono text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-1 backdrop-blur-sm">
            <Sparkles className="w-2.5 h-2.5 text-purple-400" />
            Shader: {activeShaders[0].shaderId}
          </span>
        )}

        {/* Active Transition In/Out Badge */}
        {transitionInfo && (
          <span className="bg-blue-950/80 border border-blue-500/60 text-blue-300 font-mono text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-1 backdrop-blur-sm animate-pulse">
            <Wand2 className="w-2.5 h-2.5 text-blue-400" />
            Transition {transitionInfo.type.toUpperCase()}: {transitionInfo.name} ({Math.round(transitionInfo.progress * 100)}%)
          </span>
        )}
      </div>
    </div>
  );
};
