/**
 * @file ClipInspector.tsx
 * @description CapCut Desktop Inspector Panel with [Effects] and [Video] tabs.
 * Features:
 *   1. [Effects] tab: Toggle switch (cyan), sliders with diamond keyframe buttons (`◇`),
 *      Opacity, Speed, Position X, Position Y, and Reset button.
 *   2. [Video] tab: 2D/3D Transform, Bezier keyframing, AI Neural VFX (SAM 2.1, 3D Depth Parallax).
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import {
  Sliders,
  Sparkles,
  Layers,
  Wand2,
  Video,
  RotateCcw,
  Diamond,
} from 'lucide-react';

export const ClipInspector: React.FC = () => {
  const [inspectorTab, setInspectorTab] = useState<'effects' | 'video'>('effects');
  const selectedClipIds = useStudioStore((s) => s.selectedClipIds);
  const project = useStudioStore((s) => s.project);
  const dispatchCommand = useStudioStore((s) => s.dispatchCommand);

  // States for Effects sliders with keyframe states
  const [effectEnabled, setEffectEnabled] = useState<boolean>(true);
  const [opacityVal, setOpacityVal] = useState<number>(100);
  const [speedVal, setSpeedVal] = useState<number>(1.0);
  const [posXVal, setPosXVal] = useState<number>(0);
  const [posYVal, setPosYVal] = useState<number>(0);
  const [glowVal, setGlowVal] = useState<number>(75);
  const [activeKeyframes, setActiveKeyframes] = useState<Record<string, boolean>>({});

  const selectedClip = project.tracks
    .flatMap((t) => t.clips)
    .find((c) => selectedClipIds.includes(c.id)) ||
    project.tracks.find((t) => t.kind === 'video')?.clips[0] ||
    project.tracks[0]?.clips[0];

  // Synchronize inspector sliders with selected clip properties.
  // This hook MUST run before any early return so the hook order stays stable.
  React.useEffect(() => {
    if (selectedClip) {
      const op = selectedClip.transform?.opacity?.staticValue ?? 1;
      setOpacityVal(Math.round(op * 100));
      setPosXVal(selectedClip.transform?.positionX?.staticValue ?? 0);
      setPosYVal(selectedClip.transform?.positionY?.staticValue ?? 0);
      setSpeedVal(selectedClip.speedMultiplier ?? 1.0);
      setEffectEnabled(selectedClip.shaders?.[0]?.enabled ?? true);
    }
  }, [selectedClip?.id]);

  if (!selectedClip) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-6 text-center text-xs">
        <Sliders className="w-8 h-8 mb-2 opacity-40 text-cyan-400" />
        <p className="font-semibold text-zinc-400">No Clip Selected</p>
        <p className="text-[11px] text-zinc-500 mt-1">Select any clip on the timeline to edit properties.</p>
      </div>
    );
  }

  const transform = selectedClip.transform;
  const aiVfx = selectedClip.aiVfx;
  const activeShader = selectedClip.shaders[0] || {
    id: 'sh_default_rgb',
    shaderId: 'capcut.rgb-stroke',
    name: 'RGB Stroke',
    category: 'vfx',
  };

  const toggleKeyframe = (param: string) => {
    setActiveKeyframes((prev) => ({ ...prev, [param]: !prev[param] }));
  };

  const handleResetEffects = () => {
    setEffectEnabled(true);
    setOpacityVal(100);
    setSpeedVal(1.0);
    setPosXVal(0);
    setPosYVal(0);
    setGlowVal(75);
    setActiveKeyframes({});
  };

  const handleUpdateStaticTransform = (prop: string, val: number) => {
    dispatchCommand({
      commandId: `cmd_tr_${Date.now()}`,
      actor: { kind: 'user', id: 'user_local', displayName: 'User' },
      timestampMs: Date.now(),
      command: {
        type: 'CLIP_SET_KEYFRAME',
        clipId: selectedClip.id,
        propertyPath: `transform.${prop}`,
        keyframe: {
          id: `kf_${prop}_${Date.now()}`,
          timeOffset: { value: 0, rate: 60 },
          value: val,
          easing: 'linear',
          authorId: 'user',
        },
      },
    });
  };

  const handleToggleSam2Rotoscope = () => {
    dispatchCommand({
      commandId: `cmd_rotoscope_${Date.now()}`,
      actor: { kind: 'user', id: 'user_local', displayName: 'User' },
      timestampMs: Date.now(),
      command: {
        type: 'CLIP_SET_AI_VFX',
        clipId: selectedClip.id,
        aiVfx: {
          rotoscopeMask: {
            enabled: !aiVfx.rotoscopeMask?.enabled,
            model: 'sam2.1-hiera-large',
            featherPx: 2.0,
            invertMask: false,
          },
        },
      },
    });
  };

  const handleToggle3DDepthParallax = () => {
    dispatchCommand({
      commandId: `cmd_depth_${Date.now()}`,
      actor: { kind: 'user', id: 'user_local', displayName: 'User' },
      timestampMs: Date.now(),
      command: {
        type: 'CLIP_SET_AI_VFX',
        clipId: selectedClip.id,
        aiVfx: {
          depthParallax3D: {
            enabled: !aiVfx.depthParallax3D?.enabled,
            cameraOrbitX: { staticValue: 0.15, keyframes: [] },
            cameraOrbitY: { staticValue: 0.05, keyframes: [] },
            cameraDollyZ: { staticValue: 0.25, keyframes: [] },
            dofFocusDistance: { staticValue: 1.2, keyframes: [] },
            dofApertureBokeh: { staticValue: 0.4, keyframes: [] },
          },
        },
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#141722] border-l border-[#272c3d] text-xs text-zinc-300 select-none overflow-hidden">
      {/* 1. Header Toolbar with Clip Name */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#272c3d] bg-[#161a26] shrink-0">
        <div className="flex items-center gap-2 truncate">
          <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-semibold text-zinc-100 truncate text-xs">{selectedClip.name}</span>
        </div>
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-cyan-300 border border-cyan-500/30 shrink-0">
          {selectedClip.kind}
        </span>
      </div>

      {/* 2. CapCut Style Tabs: [Effects] and [Video] */}
      <div className="flex border-b border-[#272c3d] bg-[#12151e] shrink-0">
        <button
          onClick={() => setInspectorTab('effects')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 font-bold transition-all text-xs ${
            inspectorTab === 'effects'
              ? 'border-b-2 border-cyan-400 text-cyan-300 bg-[#161a26]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Effects</span>
        </button>

        <button
          onClick={() => setInspectorTab('video')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 font-bold transition-all text-xs ${
            inspectorTab === 'video'
              ? 'border-b-2 border-cyan-400 text-cyan-300 bg-[#161a26]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Video className="w-3.5 h-3.5 text-blue-400" />
          <span>Video</span>
        </button>
      </div>

      {/* 3. Panel Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {inspectorTab === 'effects' ? (
          /* ========================================================= */
          /* CAPCUT [EFFECTS] TAB: RGB Stroke & Sliders with Diamonds   */
          /* ========================================================= */
          <div className="space-y-4">
            {/* Effect Main Box (RGB Stroke) */}
            <div className="rounded-xl border border-cyan-500/40 bg-[#161a26] p-3 shadow-md">
              {/* Header with Cyan Toggle Switch */}
              <div className="flex items-center justify-between pb-3 border-b border-[#272c3d] mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5cc]" />
                  <span className="font-bold text-zinc-100 text-xs">{activeShader.name}</span>
                </div>

                {/* Cyan Toggle Switch */}
                <button
                  onClick={() => {
                    const next = !effectEnabled;
                    setEffectEnabled(next);
                    if (selectedClip.shaders && selectedClip.shaders.length > 0) {
                      dispatchCommand({
                        commandId: `cmd_sh_toggle_${Date.now()}`,
                        actor: { kind: 'user', id: 'user_local', displayName: 'User' },
                        timestampMs: Date.now(),
                        command: {
                          type: 'CLIP_APPLY_SHADER',
                          clipId: selectedClip.id,
                          shader: {
                            ...activeShader,
                            enabled: next,
                          },
                        },
                      });
                    }
                  }}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                    effectEnabled ? 'bg-[#00e5cc]' : 'bg-zinc-700'
                  }`}
                  title={effectEnabled ? 'Effect Enabled' : 'Effect Disabled'}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black transition-transform ${
                      effectEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sliders with Diamond Keyframe Icons */}
              <div className={`space-y-3 transition-opacity ${effectEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                {/* 1. Opacity */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-zinc-300">Opacity</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-400">{opacityVal}%</span>
                      <button
                        onClick={() => toggleKeyframe('opacity')}
                        className={`p-0.5 rounded hover:bg-zinc-800 ${activeKeyframes['opacity'] ? 'text-cyan-400' : 'text-zinc-500'}`}
                        title="Add Keyframe"
                      >
                        <Diamond className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={opacityVal}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setOpacityVal(v);
                      handleUpdateStaticTransform('opacity', v / 100);
                    }}
                    className="w-full accent-cyan-400 h-1 bg-zinc-700 rounded cursor-pointer"
                  />
                </div>

                {/* 2. Speed / Frequency */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-zinc-300">Speed</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-400">{speedVal.toFixed(1)}x</span>
                      <button
                        onClick={() => toggleKeyframe('speed')}
                        className={`p-0.5 rounded hover:bg-zinc-800 ${activeKeyframes['speed'] ? 'text-cyan-400' : 'text-zinc-500'}`}
                        title="Add Keyframe"
                      >
                        <Diamond className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    value={speedVal}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setSpeedVal(v);
                    }}
                    className="w-full accent-cyan-400 h-1 bg-zinc-700 rounded cursor-pointer"
                  />
                </div>

                {/* 3. Position X */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-zinc-300">Position X</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-400">{posXVal}px</span>
                      <button
                        onClick={() => toggleKeyframe('posX')}
                        className={`p-0.5 rounded hover:bg-zinc-800 ${activeKeyframes['posX'] ? 'text-cyan-400' : 'text-zinc-500'}`}
                        title="Add Keyframe"
                      >
                        <Diamond className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={-500}
                    max={500}
                    value={posXVal}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setPosXVal(v);
                      handleUpdateStaticTransform('positionX', v);
                    }}
                    className="w-full accent-cyan-400 h-1 bg-zinc-700 rounded cursor-pointer"
                  />
                </div>

                {/* 4. Position Y */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-zinc-300">Position Y</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-400">{posYVal}px</span>
                      <button
                        onClick={() => toggleKeyframe('posY')}
                        className={`p-0.5 rounded hover:bg-zinc-800 ${activeKeyframes['posY'] ? 'text-cyan-400' : 'text-zinc-500'}`}
                        title="Add Keyframe"
                      >
                        <Diamond className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={-500}
                    max={500}
                    value={posYVal}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setPosYVal(v);
                      handleUpdateStaticTransform('positionY', v);
                    }}
                    className="w-full accent-cyan-400 h-1 bg-zinc-700 rounded cursor-pointer"
                  />
                </div>

                {/* 5. Glow / Intensity */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-zinc-300">Glow Intensity</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-400">{glowVal}%</span>
                      <button
                        onClick={() => toggleKeyframe('glow')}
                        className={`p-0.5 rounded hover:bg-zinc-800 ${activeKeyframes['glow'] ? 'text-cyan-400' : 'text-zinc-500'}`}
                        title="Add Keyframe"
                      >
                        <Diamond className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={glowVal}
                    onChange={(e) => setGlowVal(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1 bg-zinc-700 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Reset Button */}
              <div className="pt-3 mt-3 border-t border-[#272c3d] flex justify-end">
                <button
                  onClick={handleResetEffects}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Parameters</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* CAPCUT [VIDEO] TAB: Transform & AI Neural VFX             */
          /* ========================================================= */
          <div className="space-y-4">
            {/* 1. Transform Section */}
            <div className="rounded-xl border border-zinc-800 bg-[#161a26] p-3">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-blue-400" />
                  2D/3D Transform
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Bezier / Spring</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Position X (px)</label>
                  <input
                    type="number"
                    value={transform.positionX.staticValue || 0}
                    onChange={(e) => handleUpdateStaticTransform('positionX', Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Position Y (px)</label>
                  <input
                    type="number"
                    value={transform.positionY.staticValue || 0}
                    onChange={(e) => handleUpdateStaticTransform('positionY', Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Scale</label>
                  <input
                    type="number"
                    step={0.05}
                    value={transform.scaleX.staticValue || 1.0}
                    onChange={(e) => handleUpdateStaticTransform('scaleX', Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Opacity</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={transform.opacity.staticValue || 1.0}
                    onChange={(e) => handleUpdateStaticTransform('opacity', Number(e.target.value))}
                    className="w-full accent-blue-500 h-1 bg-zinc-700 rounded cursor-pointer mt-2"
                  />
                </div>
              </div>
            </div>

            {/* 2. AI Computer Vision VFX (SAM 2.1 & Depth-Anything 3D) */}
            <div className="rounded-xl border border-zinc-800 bg-[#161a26] p-3">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                AI Neural VFX (Local GPU)
              </div>

              {/* SAM 2.1 Text-Behind-Subject Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded bg-zinc-900 border border-zinc-800 mb-2">
                <div>
                  <div className="font-semibold text-zinc-200 text-xs">SAM 2.1 Text-Behind-Subject</div>
                  <p className="text-[10px] text-zinc-500">Isolate human subject & place title text behind</p>
                </div>
                <button
                  onClick={handleToggleSam2Rotoscope}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    aiVfx.rotoscopeMask?.enabled
                      ? 'bg-pink-600 text-white shadow-[0_0_8px_#ec4899]'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {aiVfx.rotoscopeMask?.enabled ? 'Active' : 'Enable'}
                </button>
              </div>

              {/* Video-Depth-Anything 3D Parallax Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded bg-zinc-900 border border-zinc-800">
                <div>
                  <div className="font-semibold text-zinc-200 text-xs">Video-Depth-Anything 3D</div>
                  <p className="text-[10px] text-zinc-500">Transform static web photo to 3D camera move</p>
                </div>
                <button
                  onClick={handleToggle3DDepthParallax}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    aiVfx.depthParallax3D?.enabled
                      ? 'bg-blue-600 text-white shadow-[0_0_8px_#3b82f6]'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {aiVfx.depthParallax3D?.enabled ? 'Active' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
