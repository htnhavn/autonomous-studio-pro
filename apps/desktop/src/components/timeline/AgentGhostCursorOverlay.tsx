/**
 * @file AgentGhostCursorOverlay.tsx
 * @description Renders live Ghost Cursors for every active AI Agent directly above the timeline tracks.
 * Also renders flying thumbnail cards when the Web Asset Hunter drops new B-roll/images onto tracks.
 */

import React from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { toSeconds } from '../../../../../packages/core-schema/src/rational-time';
import { Sparkles, Bot, Globe, Scissors, Eye, Music, Youtube } from 'lucide-react';

interface AgentGhostCursorOverlayProps {
  pixelsPerSecond: number;
  timelineScrollLeft: number;
  timelineHeight: number;
}

export const AgentGhostCursorOverlay: React.FC<AgentGhostCursorOverlayProps> = ({
  pixelsPerSecond,
  timelineScrollLeft,
  timelineHeight,
}) => {
  const agentCursors = useStudioStore((state) => state.agentCursors);
  const activeAssetFlights = useStudioStore((state) => state.activeAssetFlights);
  const cursorList = Object.values(agentCursors);

  const getAgentIcon = (role: string) => {
    switch (role) {
      case 'director':
        return <Bot className="w-3.5 h-3.5" />;
      case 'rough-cut':
        return <Scissors className="w-3.5 h-3.5" />;
      case 'asset-hunter':
        return <Globe className="w-3.5 h-3.5" />;
      case 'vfx-motion':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'sound-designer':
        return <Music className="w-3.5 h-3.5" />;
      case 'vlm-critic':
        return <Eye className="w-3.5 h-3.5" />;
      case 'youtube-publisher':
        return <Youtube className="w-3.5 h-3.5" />;
      default:
        return <Bot className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
      style={{ height: timelineHeight }}
    >
      {/* 1. Ghost Cursors for AI Agents */}
      {cursorList.map((cursor) => {
        const timeSec = toSeconds(cursor.currentTimelineTime);
        const leftPx = timeSec * pixelsPerSecond - timelineScrollLeft;

        // Skip rendering if off screen
        if (leftPx < -300 || leftPx > 4000) return null;

        const isThinking = cursor.status === 'thinking' || cursor.status === 'searching-web';

        return (
          <div
            key={cursor.agentId}
            className="absolute top-0 bottom-0 transition-transform duration-100 ease-out flex flex-col items-center"
            style={{
              left: 0,
              transform: `translateX(${leftPx}px)`,
            }}
          >
            {/* Top Indicator Badge */}
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-md border animate-in fade-in zoom-in duration-200"
              style={{
                backgroundColor: `${cursor.colorHex}22`,
                borderColor: cursor.colorHex,
                color: cursor.colorHex,
              }}
            >
              <span className="flex items-center justify-center p-0.5 rounded-full bg-black/40">
                {getAgentIcon(cursor.role)}
              </span>
              <span className="whitespace-nowrap font-mono text-[11px]">{cursor.displayName}</span>
              {isThinking && (
                <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: cursor.colorHex }} />
              )}
            </div>

            {/* Vertical Laser Needle Line */}
            <div
              className="w-0.5 flex-1 opacity-80 shadow-[0_0_8px] transition-all"
              style={{
                backgroundColor: cursor.colorHex,
                boxShadow: `0 0 8px ${cursor.colorHex}`,
              }}
            />

            {/* Live Action Tooltip Bubble (Shows current sub-second action) */}
            <div
              className="absolute top-7 bg-zinc-950/95 text-zinc-200 text-[10px] px-2.5 py-1 rounded-md border shadow-2xl max-w-[220px] text-center backdrop-blur-md"
              style={{ borderColor: `${cursor.colorHex}88` }}
            >
              <p className="line-clamp-2 leading-tight font-sans">{cursor.liveActionBubble}</p>
            </div>
          </div>
        );
      })}

      {/* 2. Live Asset Flight Animation (Web Hunter Dropping B-Roll) */}
      {activeAssetFlights.map((flight) => {
        const targetSec = toSeconds(flight.targetStartTime);
        const targetLeftPx = targetSec * pixelsPerSecond - timelineScrollLeft;

        return (
          <div
            key={flight.eventId}
            className="absolute top-2 left-10 animate-bounce duration-1000 z-40 bg-zinc-900 border border-blue-500 rounded-lg p-2 shadow-2xl flex items-center gap-2 max-w-xs transition-all pointer-events-auto"
            style={{
              transform: `translate(${targetLeftPx}px, 40px)`,
            }}
          >
            <div className="w-10 h-10 rounded bg-blue-950/60 flex items-center justify-center border border-blue-400 overflow-hidden shrink-0">
              {flight.asset.thumbnailPath ? (
                <img src={flight.asset.thumbnailPath} alt="Asset" className="w-full h-full object-cover" />
              ) : (
                <Globe className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div className="text-[11px] leading-tight">
              <span className="text-blue-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto-Harvested (Score: {flight.vlmMatchScore}/10)
              </span>
              <p className="text-zinc-300 truncate max-w-[140px] font-mono">{flight.searchQueryUsed}</p>
              <span className="text-zinc-500 text-[10px] uppercase">{flight.asset.origin.provider}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

