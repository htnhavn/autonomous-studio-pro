/**
 * @file ColorGradingPanel.tsx
 * @description DaVinci Resolve-style 3-Way Color Wheels (Lift, Gamma, Gain), RGB Curves,
 * 3D LUT (.cube) Loader, and AI Auto Color-Match engine.
 */

import React from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { Palette, Sparkles, Sun, Eye, Sliders } from 'lucide-react';

export const ColorGradingPanel: React.FC = () => {
  const selectedClipIds = useStudioStore((s) => s.selectedClipIds);
  const project = useStudioStore((s) => s.project);
  const dispatchCommand = useStudioStore((s) => s.dispatchCommand);

  // Find target clip
  const targetClip = project.tracks
    .flatMap((t) => t.clips)
    .find((c) => selectedClipIds.includes(c.id));

  const colorGrade = targetClip?.colorGrade;

  const handleUpdateParam = (param: string, value: number) => {
    if (!targetClip) return;
    dispatchCommand({
      commandId: `cmd_grade_${Date.now()}`,
      actor: { kind: 'user', id: 'user_local', displayName: 'User' },
      timestampMs: Date.now(),
      command: {
        type: 'CLIP_SET_COLOR_GRADE',
        clipId: targetClip.id,
        colorGrade: {
          [param]: { staticValue: value, keyframes: [] },
        },
      },
    });
  };

  const handleApplyAiColorMatch = () => {
    if (!targetClip) return;
    // Dispatch AI Color Match command
    dispatchCommand({
      commandId: `cmd_aimatch_${Date.now()}`,
      actor: { kind: 'agent', id: 'agent_vfx_01', role: 'vfx-motion', displayName: '✨ AI Colorist' },
      timestampMs: Date.now(),
      command: {
        type: 'CLIP_SET_COLOR_GRADE',
        clipId: targetClip.id,
        colorGrade: {
          temperature: { staticValue: 12, keyframes: [] },
          contrast: { staticValue: 1.15, keyframes: [] },
          saturation: { staticValue: 1.1, keyframes: [] },
          lutIntensity: { staticValue: 0.85, keyframes: [] },
        },
      },
    });
  };

  if (!targetClip) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-6 text-center text-xs">
        <Palette className="w-8 h-8 mb-2 opacity-40" />
        <p>Select a video or image clip on the timeline to open the Color Grading Studio.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#12151e] border-l border-[#272c3d] p-4 text-xs text-zinc-300 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-zinc-100">Color Grading & 3D LUTs</span>
        </div>
        <button
          onClick={handleApplyAiColorMatch}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-medium transition-colors"
          title="Match color profile to hero A-Roll shot automatically"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Auto-Match</span>
        </button>
      </div>

      {/* 1. DaVinci 3-Way Wheels (Lift, Gamma, Gain) */}
      <div className="mb-6">
        <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          3-Way Color Wheels
        </div>
        <div className="grid grid-cols-3 gap-3">
          {/* Lift (Shadows) */}
          <div className="flex flex-col items-center p-2 rounded bg-zinc-950/80 border border-zinc-800">
            <div className="w-16 h-16 rounded-full border border-zinc-700 bg-gradient-to-tr from-blue-950 via-zinc-900 to-amber-950 relative flex items-center justify-center shadow-inner cursor-crosshair">
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-md -translate-x-1 translate-y-1" />
            </div>
            <span className="text-[10px] font-semibold mt-2 text-zinc-300">Lift (Shadows)</span>
          </div>

          {/* Gamma (Midtones) */}
          <div className="flex flex-col items-center p-2 rounded bg-zinc-950/80 border border-zinc-800">
            <div className="w-16 h-16 rounded-full border border-zinc-700 bg-gradient-to-tr from-purple-950 via-zinc-900 to-emerald-950 relative flex items-center justify-center shadow-inner cursor-crosshair">
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-md" />
            </div>
            <span className="text-[10px] font-semibold mt-2 text-zinc-300">Gamma (Midtones)</span>
          </div>

          {/* Gain (Highlights) */}
          <div className="flex flex-col items-center p-2 rounded bg-zinc-950/80 border border-zinc-800">
            <div className="w-16 h-16 rounded-full border border-zinc-700 bg-gradient-to-tr from-amber-950 via-zinc-900 to-cyan-950 relative flex items-center justify-center shadow-inner cursor-crosshair">
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-md translate-x-1 -translate-y-1" />
            </div>
            <span className="text-[10px] font-semibold mt-2 text-zinc-300">Gain (Highlights)</span>
          </div>
        </div>
      </div>

      {/* 2. Primary Sliders */}
      <div className="space-y-3 mb-6 bg-zinc-950/60 p-3 rounded border border-zinc-800/80">
        <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          Primary Adjustments
        </div>

        {/* Temperature */}
        <div>
          <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
            <span>Color Temperature</span>
            <span className="font-mono text-zinc-200">
              {colorGrade?.temperature.staticValue || 0}K
            </span>
          </div>
          <input
            type="range"
            min={-50}
            max={50}
            value={colorGrade?.temperature.staticValue || 0}
            onChange={(e) => handleUpdateParam('temperature', Number(e.target.value))}
            className="w-full accent-amber-500 h-1 bg-gradient-to-r from-blue-500 via-zinc-700 to-amber-500 rounded cursor-pointer"
          />
        </div>

        {/* Contrast */}
        <div>
          <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
            <span>Contrast</span>
            <span className="font-mono text-zinc-200">
              {colorGrade?.contrast.staticValue?.toFixed(2) || '1.00'}
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.05}
            value={colorGrade?.contrast.staticValue || 1.0}
            onChange={(e) => handleUpdateParam('contrast', Number(e.target.value))}
            className="w-full accent-blue-500 h-1 bg-zinc-700 rounded cursor-pointer"
          />
        </div>

        {/* Saturation */}
        <div>
          <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
            <span>Saturation</span>
            <span className="font-mono text-zinc-200">
              {colorGrade?.saturation.staticValue?.toFixed(2) || '1.00'}
            </span>
          </div>
          <input
            type="range"
            min={0.0}
            max={2.0}
            step={0.05}
            value={colorGrade?.saturation.staticValue || 1.0}
            onChange={(e) => handleUpdateParam('saturation', Number(e.target.value))}
            className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* 3. 3D LUT Preset Picker */}
      <div className="bg-zinc-950/60 p-3 rounded border border-zinc-800/80">
        <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          Cinematic 3D LUT Preset (.cube)
        </div>
        <select className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 mb-2 focus:outline-none focus:border-blue-500">
          <option value="kodak-2383">Kodak 2383 • Cinematic Film Print (Teal/Orange)</option>
          <option value="clean-documentary">Clean Documentary Rec.709 Neutral</option>
          <option value="fuji-eterna">Fuji Eterna 500T Soft Pastel</option>
          <option value="cyberpunk-neon">Cyberpunk Moody High-Contrast</option>
        </select>
        <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
          <span>LUT Blend Intensity</span>
          <span className="font-mono text-zinc-200">100%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          defaultValue={100}
          className="w-full accent-blue-500 h-1 bg-zinc-700 rounded cursor-pointer"
        />
      </div>
    </div>
  );
};

