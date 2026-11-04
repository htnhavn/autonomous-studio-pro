/**
 * @file AgentGhostCursorOverlay.tsx
 * @description Ultra-clean Laser Playhead & Live Ghost Needles for AI Agents.
 * Minimal, zero-clutter design: no bulky speech bubbles or overlapping text blocks.
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
  const cursorList = Object.values(agentCursors);

  const getAgentIcon = (role: string) => {
    switch (role) {
      case 'director':
        return <Bot className="w-2.5 h-2.5" />;
      case 'rough-cut':
        return <Scissors className="w-2.5 h-2.5" />;
      case 'asset-hunter':
        return <Globe className="w-2.5 h-2.5" />;
      case 'vfx-motion':
        return <Sparkles className="w-2.5 h-2.5" />;
      case 'sound-designer':
        return <Music className="w-2.5 h-2.5" />;
      case 'vlm-critic':
        return <Eye className="w-2.5 h-2.5" />;
      case 'youtube-publisher':
        return <Youtube className="w-2.5 h-2.5" />;
      default:
        return <Bot className="w-2.5 h-2.5" />;
    }
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
      style={{ height: timelineHeight }}
    >
      {/* Ghost Cursors: Minimal 1px Laser Needle with micro-dot icon (Zero bulky text bubbles) */}
      {cursorList.map((cursor) => {
        const timeSec = toSeconds(cursor.currentTimelineTime);
        const leftPx = timeSec * pixelsPerSecond - timelineScrollLeft;

        // Skip rendering if off screen
        if (leftPx < -50 || leftPx > 4000) return null;

        const isThinking = cursor.status === 'thinking' || cursor.status === 'searching-web';

        return (
          <div
            key={cursor.agentId}
            className="absolute top-0 bottom-0 transition-transform duration-100 ease-out flex flex-col items-center pointer-events-none"
            style={{
              left: 0,
              transform: `translateX(${leftPx}px)`,
            }}
          >
            {/* Minimal Micro Needle Pin (18px) */}
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center shadow-md border"
              style={{
                backgroundColor: '#0d0f15',
                borderColor: cursor.colorHex,
                color: cursor.colorHex,
                boxShadow: `0 0 6px ${cursor.colorHex}88`,
              }}
              title={`${cursor.displayName}: ${cursor.liveActionBubble || cursor.status}`}
            >
              {getAgentIcon(cursor.role)}
              {isThinking && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-ping"
                  style={{ backgroundColor: cursor.colorHex }}
                />
              )}
            </div>

            {/* Razor-sharp 1px Laser Needle */}
            <div
              className="w-[1px] flex-1 opacity-70"
              style={{
                backgroundColor: cursor.colorHex,
                boxShadow: `0 0 4px ${cursor.colorHex}`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
