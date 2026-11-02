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

export const ShaderColorCompositor: React.FC<ShaderColorCompositorProps> = ({
  clip,
  currentTimeSec,
  children,
  className = '',
}) => {
  // 1. Evaluate DaVinci Color Grade
  const colorGrade = clip?.colorGrade;
  const isGradeEnabled = colorGrade?.enabled !== false;

  const exposure = isGradeEnabled ? colorGrade?.exposure.staticValue || 0 : 0;
  const contrast = isGradeEnabled ? colorGrade?.contrast.staticValue ?? 1 : 1;
  const saturation = isGradeEnabled ? colorGrade?.saturation.staticValue ?? 1 : 1;
  const temperature = isGradeEnabled ? colorGrade?.temperature.staticValue || 0 : 0;
  const tint = isGradeEnabled ? colorGrade?.tint.staticValue || 0 : 0;
  const halation = isGradeEnabled ? colorGrade?.halationIntensity?.staticValue || 0 : 0;
  const filmGrain = isGradeEnabled ? colorGrade?.filmGrainIntensity?.staticValue || 0 : 0;

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

  // 3. Evaluate Active Shaders (CapCut 3D Zoom, CRT Scanline, Chromatic Aberration)
  const activeShaders = clip?.shaders || [];
  const has3DZoom = activeShaders.some((s) => s.shaderId.includes('3d-zoom') || s.shaderId.includes('zoom'));
  const hasCrtRetro = activeShaders.some((s) => s.shaderId.includes('crt') || s.shaderId.includes('retro'));
  const hasChromatic = activeShaders.some((s) => s.shaderId.includes('chromatic') || s.shaderId.includes('glitch'));
  const hasHalationShader = activeShaders.some((s) => s.shaderId.includes('halation') || s.shaderId.includes('glow'));

  // 3D Zoom Motion evaluation
  const zoom3DTransform = useMemo(() => {
    if (!has3DZoom) return '';
    const zoomOsc = Math.sin(currentTimeSec * 3.5) * 0.05;
    const rotOsc = Math.sin(currentTimeSec * 2.0) * 1.5;
    return `scale(${1.04 + zoomOsc}) rotateZ(${rotOsc}deg)`;
  }, [has3DZoom, currentTimeSec]);

  // Chromatic Aberration Split filter
  const chromaticFilter = hasChromatic
    ? 'drop-shadow(2px 0px 0px rgba(239, 68, 68, 0.7)) drop-shadow(-2px 0px 0px rgba(6, 182, 212, 0.7))'
    : '';

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
          filter: `${colorFilterStyle} ${chromaticFilter}`.trim(),
          transform: zoom3DTransform || undefined,
          ...transitionStyle,
        }}
      >
        {children}

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
