/**
 * @file StockMediaPanel.tsx
 * @description Curated Stock Media Library with 50 Source Assets.
 * Supports Search, Category Filtering, Drag-to-Timeline, and 1-Click Insert at Playhead.
 */

import React, { useState } from 'react';
import { FIFTY_SOURCE_ASSETS, DeckAssetItem } from '../timeline/StackedCardsAssetDeck';
import { useStudioStore } from '../../store/useStudioStore';
import { createBaseTimelineClip } from '../../../../../packages/core-schema/src/timeline';
import { toSeconds } from '../../../../../packages/core-schema/src/rational-time';
import {
  Search,
  Film,
  Image as ImageIcon,
  Music,
  Sparkles,
  Plus,
  Check,
  FolderOpen,
} from 'lucide-react';

export const StockMediaPanel: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedId, setAddedId] = useState<string | null>(null);

  const playheadTime = useStudioStore((s) => s.playheadTime);
  const dispatchCommand = useStudioStore((s) => s.dispatchCommand);

  const categories = ['All', 'Finance', 'AI Tech', 'Cosmic', 'Meme', 'SFX'];

  const filteredAssets = FIFTY_SOURCE_ASSETS.filter((item) => {
    const matchesCategory = activeCategory === 'All' ? true : item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleInsertAsset = (asset: DeckAssetItem) => {
    const playheadSec = toSeconds(playheadTime) || 0;
    const targetTrackId = asset.kind === 'audio' ? 'track-audio-sfx' : 'track-video-broll';

    dispatchCommand({
      commandId: `cmd_insert_stock_${Date.now()}`,
      actor: { kind: 'user', id: 'user_local', displayName: 'User' },
      timestampMs: Date.now(),
      command: {
        type: 'CLIP_INSERT',
        trackId: targetTrackId,
        clip: createBaseTimelineClip({
          id: `clip_${asset.id}_${Date.now().toString(36)}`,
          name: `${asset.kind === 'meme' ? '🤡' : asset.kind === 'image' ? '🖼️' : '🎬'} ${asset.name}`,
          trackId: targetTrackId,
          kind: asset.kind === 'audio' ? 'audio-sfx' : 'video',
          startSec: playheadSec,
          durSec: asset.durationSec,
        }),
        rippleShiftSubsequentClips: false,
      },
    });

    setAddedId(asset.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  return (
    <div className="flex flex-col h-full bg-[#12141c] text-xs text-zinc-300 select-none">
      {/* Header & Search */}
      <div className="p-3 border-b border-[#1f2433] flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[11px] text-zinc-200 tracking-wide uppercase flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            Stock Library (50 Assets)
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">{filteredAssets.length} items</span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stock footage, memes, SFX..."
            className="w-full bg-[#181c28] border border-[#272d40] rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 transition"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of 50 Assets */}
      <div className="flex-1 overflow-y-auto capcut-scroll p-3 grid grid-cols-2 gap-2.5">
        {filteredAssets.map((asset) => {
          const isRecentlyAdded = addedId === asset.id;
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
              className="group relative bg-[#181c28] rounded-md border border-[#272d40] hover:border-cyan-500/50 overflow-hidden flex flex-col cursor-grab active:cursor-grabbing transition-all hover:shadow-lg"
            >
              {/* Thumbnail Container */}
              <div className="w-full aspect-video bg-black relative overflow-hidden">
                <img
                  src={asset.thumbnailUrl}
                  alt={asset.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Duration Badge */}
                <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1 py-0.2 rounded bg-black/80 text-cyan-300">
                  {asset.durationSec.toFixed(1)}s
                </span>

                {/* Type Icon Badge */}
                <span className="absolute top-1 left-1 p-0.5 rounded bg-black/70 text-zinc-300">
                  {asset.kind === 'video' ? (
                    <Film className="w-2.5 h-2.5 text-cyan-400" />
                  ) : asset.kind === 'audio' ? (
                    <Music className="w-2.5 h-2.5 text-emerald-400" />
                  ) : asset.kind === 'meme' ? (
                    <Sparkles className="w-2.5 h-2.5 text-pink-400" />
                  ) : (
                    <ImageIcon className="w-2.5 h-2.5 text-blue-400" />
                  )}
                </span>

                {/* Quick Add Overlay on Hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInsertAsset(asset);
                  }}
                  className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                    isRecentlyAdded ? '!opacity-100 bg-cyan-950/80' : ''
                  }`}
                  title="Insert onto Timeline at Playhead"
                >
                  {isRecentlyAdded ? (
                    <span className="flex items-center gap-1 text-cyan-300 text-[10px] font-bold">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Added
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-[#00e5cc] text-black font-bold text-[10px] px-2 py-1 rounded shadow-md hover:bg-cyan-300 transition">
                      <Plus className="w-3 h-3 stroke-[3]" /> Add to Track
                    </span>
                  )}
                </button>
              </div>

              {/* Title & Category Info */}
              <div className="p-1.5 flex flex-col justify-between">
                <span className="text-[10px] font-medium text-zinc-200 line-clamp-1 group-hover:text-cyan-300 transition">
                  {asset.name}
                </span>
                <span className="text-[9px] text-zinc-500">{asset.category}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

