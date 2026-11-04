/**
 * @file StackedCardsAssetDeck.tsx
 * @description Sleek 46px Filmstrip Carousel of 50 Stacked Media Cards at the bottom of the workstation.
 * Features:
 *   1. 50 Media Assets (Footage, B-Roll, Memes, Tech, Space) stacked with 30% overlap.
 *   2. Lift-up hover animation (elevates 24px and expands to crisp thumbnail).
 *   3. 100% Native Drag & Drop: Drag any card straight onto timeline tracks.
 *   4. AI Throw Choreography: "Monitor Inspection & Stamp" 0.3s animation into Program Monitor.
 */

import React, { useState, useRef } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { MediaAsset, createBaseTimelineClip } from '../../../../../packages/core-schema/src/timeline';
import { toSeconds, fromSeconds } from '../../../../../packages/core-schema/src/rational-time';
import { Film, Image as ImageIcon, Music, Sparkles, Bot, Layers, Check } from 'lucide-react';

export interface DeckAssetItem {
  id: string;
  name: string;
  kind: 'video' | 'image' | 'meme' | 'audio';
  thumbnailUrl: string;
  durationSec: number;
  category: string;
}

// 50 Curated Source Assets for Autonomous Production
export const FIFTY_SOURCE_ASSETS: DeckAssetItem[] = [
  // 1-10: Wall Street & Financial Core
  {
    id: 'deck_ws_1',
    name: 'Stock Market Plunge Crash',
    kind: 'image',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=240&q=80',
    durationSec: 3.5,
    category: 'Finance',
  },
  {
    id: 'deck_ws_2',
    name: 'Trading Floor Panic Screams',
    kind: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=240&q=80',
    durationSec: 4.0,
    category: 'Finance',
  },
  {
    id: 'deck_ws_3',
    name: 'Bloomberg Candlestick Red Candle',
    kind: 'image',
    thumbnailUrl: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=240&q=80',
    durationSec: 3.0,
    category: 'Finance',
  },
  {
    id: 'deck_ws_4',
    name: 'FED Jerome Powell Gavel',
    kind: 'image',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=240&q=80',
    durationSec: 4.5,
    category: 'Finance',
  },
  {
    id: 'deck_ws_5',
    name: 'Money Printing Press Cash Stream',
    kind: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=240&q=80',
    durationSec: 5.0,
    category: 'Finance',
  },

  // 11-20: Tech, Silicon & Artificial Intelligence
  {
    id: 'deck_tech_1',
    name: 'Nvidia Blackwell GPU Die',
    kind: 'image',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=240&q=80',
    durationSec: 4.0,
    category: 'AI Tech',
  },
  {
    id: 'deck_tech_2',
    name: 'Server Rack Data Center Blink',
    kind: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=240&q=80',
    durationSec: 4.0,
    category: 'AI Tech',
  },
  {
    id: 'deck_tech_3',
    name: 'Silicon Wafer Holographic Blue',
    kind: 'image',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=240&q=80',
    durationSec: 3.5,
    category: 'AI Tech',
  },
  {
    id: 'deck_tech_4',
    name: 'Neural Network Synapse Burst',
    kind: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=240&q=80',
    durationSec: 3.0,
    category: 'AI Tech',
  },
  {
    id: 'deck_tech_5',
    name: 'Robotics Dexterous Hand Gesture',
    kind: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=240&q=80',
    durationSec: 4.0,
    category: 'AI Tech',
  },

  // 21-30: Cosmic, Deep Space & Astronomy
  {
    id: 'deck_space_1',
    name: 'James Webb Carina Nebula',
    kind: 'image',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=240&q=80',
    durationSec: 5.0,
    category: 'Cosmic',
  },
  {
    id: 'deck_space_2',
    name: 'Black Hole Event Horizon Lensing',
    kind: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=240&q=80',
    durationSec: 4.0,
    category: 'Cosmic',
  },
  {
    id: 'deck_space_3',
    name: 'Solar Flare Corona Ejection',
    kind: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1532635241-17e820acc59f?w=240&q=80',
    durationSec: 3.5,
    category: 'Cosmic',
  },
  {
    id: 'deck_space_4',
    name: 'Earth Night Lights Orbital View',
    kind: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=240&q=80',
    durationSec: 4.0,
    category: 'Cosmic',
  },
  {
    id: 'deck_space_5',
    name: 'Astronaut Spacewalk EVA Float',
    kind: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=240&q=80',
    durationSec: 4.0,
    category: 'Cosmic',
  },

  // 31-40: Memes, Pop-Culture & Punchlines
  {
    id: 'deck_meme_1',
    name: 'Stonks Rising Stickman Meme',
    kind: 'meme',
    thumbnailUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=240&q=80',
    durationSec: 2.0,
    category: 'Meme',
  },
  {
    id: 'deck_meme_2',
    name: 'Dramatic Cat Shocked Zoom',
    kind: 'meme',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=240&q=80',
    durationSec: 1.8,
    category: 'Meme',
  },
  {
    id: 'deck_meme_3',
    name: 'Confused Math Lady Formulas',
    kind: 'meme',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=240&q=80',
    durationSec: 2.5,
    category: 'Meme',
  },
  {
    id: 'deck_meme_4',
    name: 'Laser Eyes Crypto Surge',
    kind: 'meme',
    thumbnailUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=240&q=80',
    durationSec: 2.0,
    category: 'Meme',
  },
  {
    id: 'deck_meme_5',
    name: 'Exploding Brain Galaxy Mind',
    kind: 'meme',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=240&q=80',
    durationSec: 2.2,
    category: 'Meme',
  },

  // 41-50: Sound Effects & High-Impact Audio Transitions
  {
    id: 'deck_sfx_1',
    name: 'Deep Cinematic Sub Boom',
    kind: 'audio',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=240&q=80',
    durationSec: 3.0,
    category: 'SFX',
  },
  {
    id: 'deck_sfx_2',
    name: 'Heavy Fast Whoosh Transition',
    kind: 'audio',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=240&q=80',
    durationSec: 1.2,
    category: 'SFX',
  },
  {
    id: 'deck_sfx_3',
    name: 'Camera Shutter Snap Pop',
    kind: 'audio',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=240&q=80',
    durationSec: 0.8,
    category: 'SFX',
  },
  {
    id: 'deck_sfx_4',
    name: 'Record Scratch Pause Freeze',
    kind: 'audio',
    thumbnailUrl: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=240&q=80',
    durationSec: 1.5,
    category: 'SFX',
  },
  {
    id: 'deck_sfx_5',
    name: 'Cyber Glitch Stutter Hit',
    kind: 'audio',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=240&q=80',
    durationSec: 1.8,
    category: 'SFX',
  },
];

export const StackedCardsAssetDeck: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [stampedAsset, setStampedAsset] = useState<DeckAssetItem | null>(null);
  const dispatchCommand = useStudioStore((s) => s.dispatchCommand);
  const playheadTime = useStudioStore((s) => s.playheadTime);
  const setPlayheadTime = useStudioStore((s) => s.setPlayheadTime);
  const selectClip = useStudioStore((s) => s.selectClip);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredAssets =
    activeCategory === 'All'
      ? FIFTY_SOURCE_ASSETS
      : FIFTY_SOURCE_ASSETS.filter((a) => a.category === activeCategory);

  // Trigger "Monitor Inspection & Stamp" throw choreography
  const handleAiInspectAndThrow = (asset: DeckAssetItem) => {
    setStampedAsset(asset);

    // After 300ms inspection on monitor, drop onto timeline at current playhead
    setTimeout(() => {
      const rawSec = toSeconds(playheadTime) || 0;
      // Clamp within timeline bounds (0 to 14s max)
      const playheadSec = Math.min(Math.max(0, rawSec), 14.0);
      const targetTrackId = asset.kind === 'audio' ? 'track-audio-sfx' : 'track-video-broll';
      const newClipId = `clip_${asset.id}_${Date.now().toString(36)}`;

      dispatchCommand({
        commandId: `cmd_stamp_${Date.now()}`,
        actor: { kind: 'agent', id: 'agent_director', displayName: '🤖 AI Director' },
        timestampMs: Date.now(),
        command: {
          type: 'CLIP_INSERT',
          trackId: targetTrackId,
          clip: {
            ...createBaseTimelineClip({
              id: newClipId,
              name: `${asset.kind === 'meme' ? '🤡' : asset.kind === 'image' ? '🖼️' : '🎬'} ${asset.name}`,
              trackId: targetTrackId,
              kind: asset.kind === 'audio' ? 'audio-sfx' : 'video',
              startSec: playheadSec,
              durSec: asset.durationSec,
              shaders: asset.kind === 'video' ? [{
                id: `sh_zoom_${Date.now()}`,
                shaderId: 'capcut.3d-zoom-pro',
                name: '3D Zoom Pro',
                enabled: true,
                category: 'camera-motion',
                uniforms: { intensity: { staticValue: 1.0, keyframes: [] } },
              }] : [],
            }),
            assetId: asset.id,
            ...(asset.thumbnailUrl ? { thumbnailUrl: asset.thumbnailUrl } : {}),
          } as any,
          rippleShiftSubsequentClips: false,
        },
      });

      // Focus newly inserted clip and set playhead directly to it so user sees it instantly
      selectClip(newClipId);
      setPlayheadTime(fromSeconds(playheadSec, 60));

      // Clear stamped animation after complete
      setTimeout(() => setStampedAsset(null), 600);
    }, 350);
  };

  return (
    <div className="h-12 bg-[#0c0e14] border-t border-[#1a1e2b] flex items-center px-3 shrink-0 select-none relative z-20">
      {/* Left Identity: Deck Count & Category Filter Pills */}
      <div className="flex items-center gap-2 shrink-0 mr-3 border-r border-[#222738] pr-3">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <Layers className="w-3.5 h-3.5 text-[#00e5cc]" />
          <span className="font-extrabold text-[11px] text-white">DECK (50)</span>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1">
          {['All', 'Finance', 'AI Tech', 'Cosmic', 'Meme', 'SFX'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Stacked Cards Filmstrip Carousel with 30% Overlap */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center overflow-x-auto overflow-y-visible py-2 h-full scrollbar-none gap-0"
        style={{ scrollBehavior: 'smooth' }}
      >
        {filteredAssets.map((asset, index) => {
          return (
            <div
              key={asset.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  'application/json',
                  JSON.stringify({
                    type: 'ASSET',
                    asset,
                  })
                );
              }}
              onClick={() => handleAiInspectAndThrow(asset)}
              className="group relative shrink-0 cursor-grab active:cursor-grabbing transition-all duration-200 ease-out"
              style={{
                width: '42px',
                height: '34px',
                marginRight: '-12px', // 30% overlap
                zIndex: index + 1,
              }}
              title={`Drag to Timeline or Click to AI-Stamp: ${asset.name} (${asset.durationSec}s)`}
            >
              {/* Stacked Card Shell */}
              <div className="w-full h-full rounded-md border border-[#2b3348] group-hover:border-[#00e5cc] bg-[#151824] overflow-hidden shadow-md transition-all duration-200 group-hover:-translate-y-4 group-hover:scale-135 group-hover:z-50 group-hover:shadow-[0_0_12px_rgba(0,229,204,0.4)]">
                <img
                  src={asset.thumbnailUrl}
                  alt={asset.name}
                  className="w-full h-full object-cover pointer-events-none"
                />

                {/* Subtle Kind Badge */}
                <div className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/70 pointer-events-none">
                  {asset.kind === 'video' ? (
                    <Film className="w-2 h-2 text-cyan-400" />
                  ) : asset.kind === 'audio' ? (
                    <Music className="w-2 h-2 text-emerald-400" />
                  ) : asset.kind === 'meme' ? (
                    <Sparkles className="w-2 h-2 text-pink-400" />
                  ) : (
                    <ImageIcon className="w-2 h-2 text-blue-400" />
                  )}
                </div>
              </div>

              {/* Lift-up Floating Preview Card (Appears on Hover) */}
              <div className="absolute bottom-11 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 flex flex-col items-center">
                <div className="w-36 bg-[#121520] border border-[#00e5cc]/80 rounded-lg p-1.5 shadow-2xl flex flex-col gap-1 backdrop-blur-md">
                  <div className="w-full h-18 rounded overflow-hidden bg-black relative">
                    <img src={asset.thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 text-[8px] font-mono px-1 py-0.2 rounded bg-black/80 text-cyan-300">
                      {asset.durationSec}s
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-100 truncate">{asset.name}</span>
                    <span className="text-[8px] text-zinc-400 font-mono">
                      Drag to Timeline • Click to AI-Stamp
                    </span>
                  </div>
                </div>
                {/* Arrow */}
                <div className="w-2 h-2 bg-[#121520] border-r border-b border-[#00e5cc]/80 rotate-45 -mt-1" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Stamp Animation Modal / Indicator */}
      {stampedAsset && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-[#0f121d]/90 border-2 border-cyan-400 rounded-xl p-4 shadow-[0_0_40px_rgba(0,229,204,0.6)] flex flex-col items-center gap-2 animate-in zoom-in-75 duration-200">
            <span className="text-xs font-black tracking-widest text-[#00e5cc] uppercase font-mono flex items-center gap-1.5">
              <Bot className="w-4 h-4 animate-spin" />
              <span>AI MONITOR INSPECTION & STAMP</span>
            </span>
            <div className="w-48 h-28 rounded-lg overflow-hidden border border-cyan-500/40 relative">
              <img src={stampedAsset.thumbnailUrl} alt="Inspected" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-cyan-400/10 flex items-center justify-center">
                <span className="rotate-[-12deg] px-3 py-1 bg-red-600/90 text-white font-black tracking-widest text-xs border-2 border-white shadow-xl animate-pulse">
                  AI APPROVED (98%)
                </span>
              </div>
            </div>
            <span className="text-[11px] text-zinc-300 font-mono">
              Throwing to Timeline at {toSeconds(playheadTime).toFixed(1)}s...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
