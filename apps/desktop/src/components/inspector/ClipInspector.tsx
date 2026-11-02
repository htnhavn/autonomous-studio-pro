/**
 * @file ClipInspector.tsx
 * @description Pro Inspector Panel for fine-tuning Clip Transforms, Bezier Keyframes,
 * AI Visual Effects (SAM 2.1 Text-Behind-Subject, Depth-Anything 3D Parallax), and GPU Shaders.
 */

import React from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import {
  Sliders,
  Sparkles,
  Layers,
  Wand2,
  Video,
} from 'lucide-react';

export const ClipInspector: React.FC = () => {
  const selectedClipIds = useStudioStore((s) => s.selectedClipIds);
  const project = useStudioStore((s) => s.project);
  const dispatchCommand = useStudioStore((s) => s.dispatchCommand);

  const selectedClip = project.tracks
    .flatMap((t) => t.clips)
    .find((c) => selectedClipIds.includes(c.id));

  if (!selectedClip) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-6 text-center text-xs">
        <Sliders className="w-8 h-8 mb-2 opacity-40" />
        <p>Select any clip on the timeline to inspect and edit its properties.</p>
      </div>
    );
  }

  const transform = selectedClip.transform;
  const aiVfx = selectedClip.aiVfx;

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
    <div className="flex flex-col h-full bg-[#141722] border-l border-[#272c3d] p-4 text-xs text-zinc-300 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-zinc-100 truncate">{selectedClip.name}</span>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
          {selectedClip.kind}
        </span>
      </div>

      {/* 1. Transform Section */}
      <div className="mb-6 bg-zinc-950/60 p-3 rounded border border-zinc-800/80">
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
      <div className="mb-6 bg-zinc-950/60 p-3 rounded border border-zinc-800/80">
        <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          AI Neural VFX (Local GPU)
        </div>

        {/* SAM 2.1 Text-Behind-Subject Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded bg-zinc-900 border border-zinc-800 mb-2">
          <div>
            <div className="font-semibold text-zinc-200 text-xs flex items-center gap-1">
              <span>SAM 2.1 Text-Behind-Subject</span>
            </div>
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

      {/* 3. Shaders & Effects List */}
      <div className="bg-zinc-950/60 p-3 rounded border border-zinc-800/80">
        <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Wand2 className="w-3.5 h-3.5 text-purple-400" />
          Active Shaders ({selectedClip.shaders.length})
        </div>
        {selectedClip.shaders.length === 0 ? (
          <p className="text-[11px] text-zinc-500 italic">No shader filters applied yet.</p>
        ) : (
          <div className="space-y-1.5">
            {selectedClip.shaders.map((sh) => (
              <div
                key={sh.id}
                className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800 text-xs"
              >
                <span className="font-medium text-zinc-200">{sh.name}</span>
                <span className="text-[10px] text-purple-400 font-mono uppercase">{sh.category}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

