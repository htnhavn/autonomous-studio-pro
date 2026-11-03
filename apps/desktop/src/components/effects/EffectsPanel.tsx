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

  // Target clip is either selected clip or first video clip on timeline
  const targetClip = project.tracks
    .flatMap((t) => t.clips)
    .find((c) => selectedClipIds.includes(c.id)) ||
    project.tracks.find((t) => t.kind === 'video')?.clips[0] ||
    project.tracks[0]?.clips[0];

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

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2.5 pr-1">
          {filteredEffects.map((effect) => {
            const isApplied = appliedId === effect.id;

            return (
              <div
                key={effect.id}
                className={`group relative rounded-xl overflow-hidden border bg-[#161a26] hover:bg-[#1a2030] transition-all cursor-pointer flex flex-col ${
                  effect.id === 'eff_rgb_stroke'
                    ? 'border-cyan-400/80 shadow-[0_0_12px_rgba(0,229,204,0.25)] ring-1 ring-cyan-400/50'
                    : 'border-[#272c3d] hover:border-zinc-500'
                }`}
                onClick={() => handleApplyEffect(effect)}
              >
                {/* Thumbnail Image */}
                <div className="relative h-22 w-full overflow-hidden bg-black/60">
                  <img
                    src={effect.thumbnail}
                    alt={effect.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Badge */}
                  {effect.badge && (
                    <span
                      className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded shadow text-black"
                      style={{ backgroundColor: effect.accentColor }}
                    >
                      {effect.badge}
                    </span>
                  )}

                  {/* Apply '+' Action Badge in Top-Right */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyEffect(effect);
                    }}
                    className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-md ${
                      isApplied
                        ? 'bg-emerald-500 text-white scale-110'
                        : 'bg-black/70 hover:bg-cyan-400 text-zinc-300 hover:text-black opacity-80 group-hover:opacity-100'
                    }`}
                    title="Click to apply to timeline clip"
                  >
                    {isApplied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                </div>

                {/* Card Title & Info */}
                <div className="p-2 flex flex-col justify-between flex-1">
                  <div className="font-semibold text-zinc-100 text-xs truncate flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: effect.accentColor }} />
                    <span className="truncate">{effect.name}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                    {effect.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
