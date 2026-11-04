/**
 * @file EffectsPanel.tsx
 * @description CapCut Desktop Pro Effects Library Panel.
 * Features:
 *   1. Sub-sidebar categories: Mine, Video Effects, Body Effects, Audio Effects, Boris FX.
 *   2. Search bar with instant filtering.
 *   3. Thumbnail cards with cyan border, category badge, and hover `+` button to apply directly.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { toSeconds } from '../../../../../packages/core-schema/src/rational-time';
import { Search, Sparkles, Plus, Check, Wand2, Flame, Layers, Radio, Tv } from 'lucide-react';

export interface EffectItem {
  id: string;
  name: string;
  category: 'video' | 'body' | 'audio' | 'boris' | 'mine';
  shaderId: string;
  thumbnail: string;
  badge?: string;
  accentColor: string;
  description: string;
}

export const CAPCUT_EFFECTS_CATALOG: EffectItem[] = [
  {
    id: 'eff_rgb_stroke',
    name: 'RGB Stroke',
    category: 'video',
    shaderId: 'capcut.rgb-stroke',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=240&q=80',
    badge: 'Trending',
    accentColor: '#00e5cc',
    description: 'Neon glowing outline with dynamic chromatic edges',
  },
  {
    id: 'eff_glow',
    name: 'Glow Bloom',
    category: 'video',
    shaderId: 'capcut.glow',
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=240&q=80',
    badge: 'Pro',
    accentColor: '#f59e0b',
    description: 'Warm cinematic halation and optical bloom',
  },
  {
    id: 'eff_blur',
    name: 'Gaussian Blur',
    category: 'video',
    shaderId: 'capcut.blur',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=240&q=80',
    accentColor: '#3b82f6',
    description: 'Silky smooth optical depth-of-field blur',
  },
  {
    id: 'eff_tv_wall',
    name: 'TV Wall',
    category: 'video',
    shaderId: 'capcut.tv-wall',
    thumbnail: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=240&q=80',
    badge: 'Hot',
    accentColor: '#a855f7',
    description: 'Retro CRT monitor grid multi-screen matrix',
  },
  {
    id: 'eff_crt_glitch',
    name: 'CRT Glitch',
    category: 'video',
    shaderId: 'shadertoy.crt-retro',
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=240&q=80',
    badge: 'Retro',
    accentColor: '#10b981',
    description: 'Analogue VHS scanlines with horizontal drift',
  },
  {
    id: 'eff_edge_glow',
    name: 'Edge Glow',
    category: 'video',
    shaderId: 'capcut.edge-glow',
    thumbnail: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=240&q=80',
    accentColor: '#06b6d4',
    description: 'Cyberpunk contour detection with colored edges',
  },
  {
    id: 'eff_3d_zoom',
    name: '3D Zoom Pro',
    category: 'video',
    shaderId: 'capcut.3d-zoom-pro',
    thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=240&q=80',
    badge: 'CapCut Top',
    accentColor: '#ec4899',
    description: 'Viral rhythmic camera punch-in and 2.5D parallax',
  },
  {
    id: 'eff_chromatic',
    name: 'Chromatic Glitch',
    category: 'video',
    shaderId: 'glitch.chromatic-aberration',
    thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=240&q=80',
    accentColor: '#ef4444',
    description: 'Red/Cyan prism channel separation displacement',
  },
  {
    id: 'eff_film_grain',
    name: '35mm Film Grain',
    category: 'boris',
    shaderId: 'davinci.film-grain-35mm',
    thumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=240&q=80',
    accentColor: '#eab308',
    description: 'Analogue Kodak film emulsion grain texture',
  },
  {
    id: 'eff_vocal_reverb',
    name: 'Cinematic Voice Reverb',
    category: 'audio',
    shaderId: 'audio.space-reverb',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=240&q=80',
    accentColor: '#8b5cf6',
    description: 'Broadcast room spatial depth acoustics',
  },
];

export const EffectsPanel: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'video' | 'body' | 'audio' | 'boris' | 'mine'>('video');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const selectedClipIds = useStudioStore((s) => s.selectedClipIds);
  const project = useStudioStore((s) => s.project);
  const dispatchCommand = useStudioStore((s) => s.dispatchCommand);

  const playheadTime = useStudioStore((s) => s.playheadTime);
  const currentSec = toSeconds(playheadTime);

  // Target clip preference (Never target caption track unless explicitly selected):
  // 1. Manually selected video or stage clip
  // 2. Video or stage clip actively under playhead
  // 3. Any video or stage clip
  // 4. Any selected clip
  const videoAndStageClips = project.tracks
    .filter((t) => t.kind === 'video' || t.kind === 'stage-puppet')
    .flatMap((t) => t.clips);

  const selectedTargetClip = videoAndStageClips.find((c) => selectedClipIds.includes(c.id));

  const clipUnderPlayhead = videoAndStageClips.find((c) => {
    const start = toSeconds(c.timelineRange.startTime);
    const end = start + toSeconds(c.timelineRange.duration);
    return currentSec >= start && currentSec <= end;
  });

  const anyVideoClip = videoAndStageClips[0];
  const fallbackSelected = project.tracks.flatMap((t) => t.clips).find((c) => selectedClipIds.includes(c.id));

  const targetClip = selectedTargetClip || clipUnderPlayhead || anyVideoClip || fallbackSelected;

  const filteredEffects = CAPCUT_EFFECTS_CATALOG.filter((item) => {
    const matchesCat = activeCategory === 'video' ? true : item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleApplyEffect = (effect: EffectItem) => {
    if (!targetClip) return;

    dispatchCommand({
      commandId: `cmd_apply_effect_${Date.now()}`,
      actor: { kind: 'user', id: 'user_local', displayName: 'User' },
      timestampMs: Date.now(),
      command: {
        type: 'CLIP_APPLY_SHADER',
        clipId: targetClip.id,
        shader: {
          id: `sh_${effect.id}_${Date.now()}`,
          shaderId: effect.shaderId,
          name: effect.name,
          category: effect.shaderId.includes('zoom')
            ? 'camera-motion'
            : effect.shaderId.includes('glitch') || effect.shaderId.includes('tv')
            ? 'glitch-retro'
            : effect.shaderId.includes('blur')
            ? 'blur-sharpen'
            : effect.shaderId.includes('glow')
            ? 'light-glow'
            : 'stylize',
          enabled: true,
          uniforms: {
            intensity: { staticValue: 1.0, keyframes: [] },
          },
        },
      },
    });

    setAppliedId(effect.id);
    setTimeout(() => setAppliedId(null), 1500);
  };

  return (
    <div className="flex h-full bg-[#12151e] text-zinc-200 text-xs overflow-hidden select-none">
      {/* 1. Sub-Sidebar Navigation (CapCut style) */}
      <div className="w-28 border-r border-[#222738] bg-[#0f121a] flex flex-col py-2 shrink-0">
        <button
          onClick={() => setActiveCategory('video')}
          className={`flex items-center gap-2 px-3 py-2 text-left transition-colors font-medium ${
            activeCategory === 'video'
              ? 'bg-[#1b2130] text-cyan-300 border-l-2 border-cyan-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161a26]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Video Effects</span>
        </button>

        <button
          onClick={() => setActiveCategory('body')}
          className={`flex items-center gap-2 px-3 py-2 text-left transition-colors font-medium ${
            activeCategory === 'body'
              ? 'bg-[#1b2130] text-cyan-300 border-l-2 border-cyan-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161a26]'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Body Effects</span>
        </button>

        <button
          onClick={() => setActiveCategory('audio')}
          className={`flex items-center gap-2 px-3 py-2 text-left transition-colors font-medium ${
            activeCategory === 'audio'
              ? 'bg-[#1b2130] text-cyan-300 border-l-2 border-cyan-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161a26]'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-purple-400" />
          <span>Audio Effects</span>
        </button>

        <button
          onClick={() => setActiveCategory('boris')}
          className={`flex items-center gap-2 px-3 py-2 text-left transition-colors font-medium ${
            activeCategory === 'boris'
              ? 'bg-[#1b2130] text-cyan-300 border-l-2 border-cyan-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161a26]'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5 text-pink-400" />
          <span>Boris FX</span>
        </button>

        <div className="my-1 border-t border-[#222738]" />

        <button
          onClick={() => setActiveCategory('mine')}
          className={`flex items-center gap-2 px-3 py-2 text-left transition-colors font-medium ${
            activeCategory === 'mine'
              ? 'bg-[#1b2130] text-cyan-300 border-l-2 border-cyan-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161a26]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          <span>Mine</span>
        </button>
      </div>

      {/* 2. Main Content Area: Search Bar + Effects Grid */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden min-w-0">
        {/* Search Bar */}
        <div className="relative mb-3 shrink-0">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search effects (RGB Stroke, Glow, 3D Zoom)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#181c28] border border-[#272c3d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        {/* Selected Clip Notice */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2 px-1 shrink-0">
          <span>Target Clip:</span>
          <span className="font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 truncate max-w-[180px]">
            {targetClip ? targetClip.name : 'No clip selected'}
          </span>
        </div>

        {/* Dense List View (CapCut Pro Workstation Style) */}
        <div className="flex-1 overflow-y-auto capcut-scroll flex flex-col gap-1 pr-1">
          {filteredEffects.map((effect) => {
            const isApplied = appliedId === effect.id;

            return (
              <div
                key={effect.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({
                      type: 'EFFECT',
                      effectId: effect.id,
                      shaderId: effect.shaderId,
                      name: effect.name,
                    })
                  );
                }}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-md border bg-[#141724] hover:bg-[#1a2032] transition-all cursor-grab active:cursor-grabbing ${
                  effect.id === 'eff_rgb_stroke'
                    ? 'border-cyan-500/50 shadow-[0_0_8px_rgba(0,229,204,0.15)] ring-1 ring-cyan-500/30'
                    : 'border-[#222738] hover:border-zinc-500'
                }`}
                onClick={() => handleApplyEffect(effect)}
                title="Click to apply or Drag onto any Timeline Clip"
              >
                {/* Left: Thumbnail & Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative w-7 h-7 rounded overflow-hidden shrink-0 border border-[#2a3147] bg-black">
                    <img
                      src={effect.thumbnail}
                      alt={effect.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    <span
                      className="absolute bottom-0 right-0 w-2 h-2 rounded-tl"
                      style={{ backgroundColor: effect.accentColor }}
                    />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-zinc-100 text-[11px] truncate">
                        {effect.name}
                      </span>
                      {effect.badge && (
                        <span
                          className="text-[8px] font-bold px-1 py-0.2 rounded text-black shrink-0"
                          style={{ backgroundColor: effect.accentColor }}
                        >
                          {effect.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-zinc-400 truncate max-w-[170px]">
                      {effect.description}
                    </span>
                  </div>
                </div>

                {/* Right: Quick Apply '+' Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyEffect(effect);
                  }}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all shrink-0 ml-1.5 ${
                    isApplied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#1b2132] hover:bg-cyan-400 text-zinc-400 hover:text-black opacity-80 group-hover:opacity-100'
                  }`}
                  title="Apply to active clip"
                >
                  {isApplied ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
