/**
 * @file MotionCodeRenderer.tsx
 * @description Code-as-Motion live runner for WeftCut Motifs / Remotion components.
 * Renders animated graphics (data charts, 3D maps, kinetic typography, news highlights)
 * dynamically onto the Program Monitor canvas at frame rate.
 */

import React from 'react';
import { MotionCodePayload } from '../../../../../packages/core-schema/src/timeline';

interface MotionCodeRendererProps {
  motionCode: MotionCodePayload;
  currentFrame: number;
  fps: number;
  width: number;
  height: number;
}

export const MotionCodeRenderer: React.FC<MotionCodeRendererProps> = ({
  motionCode,
  currentFrame,
  fps,
  width,
  height,
}) => {
  const progress = Math.min(1.0, Math.max(0.0, currentFrame / (fps * 3))); // Default 3s animation cycle

  switch (motionCode.templateId) {
    case 'news-article-highlighter':
      return (
        <div className="relative w-full h-full flex items-center justify-center p-8 bg-zinc-950/70 backdrop-blur-sm">
          <div
            className="w-4/5 bg-white text-zinc-900 p-6 rounded-lg shadow-2xl border border-zinc-200 transition-transform duration-300"
            style={{
              transform: `scale(${1.0 + progress * 0.08})`,
            }}
          >
            <div className="text-xs uppercase tracking-wider text-red-600 font-bold mb-1">
              Breaking News • Associated Press
            </div>
            <h2 className="text-xl font-bold font-serif mb-3 leading-snug">
              Global Artificial Intelligence Breakthrough Accelerates Media Automation
            </h2>
            <p className="text-sm text-zinc-700 leading-relaxed font-serif relative inline">
              Recent technological advancements in multi-agent orchestration and local GPU compositors have unlocked{' '}
              <span
                className="relative inline-block px-1 rounded transition-all duration-700 font-semibold"
                style={{
                  backgroundColor: progress > 0.3 ? '#fef08a' : 'transparent',
                  color: progress > 0.3 ? '#854d0e' : 'inherit',
                }}
              >
                100% autonomous video editing from raw script to YouTube publishing.
              </span>
            </p>
          </div>
        </div>
      );

    case 'animated-bar-chart':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8">
          <div className="bg-zinc-950/80 p-6 rounded-xl border border-blue-500/30 backdrop-blur-md w-3/4">
            <h3 className="text-sm font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              Efficiency Comparison (Editing Time in Minutes)
            </h3>
            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between mb-1 text-zinc-400">
                  <span>Traditional NLE Manual</span>
                  <span>180 mins</span>
                </div>
                <div className="h-4 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-zinc-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, progress * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1 text-emerald-400 font-bold">
                  <span>Autonomous Studio Pro (AI)</span>
                  <span>1.5 mins</span>
                </div>
                <div className="h-4 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_12px_#10b981]"
                    style={{ width: `${Math.min(15, progress * 15)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'kinetic-typography-burst':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div
            className="text-center font-black tracking-tighter text-4xl uppercase text-white drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
            style={{
              transform: `scale(${0.8 + Math.sin(progress * Math.PI) * 0.4}) rotate(${Math.sin(progress * 4) * 2}deg)`,
            }}
          >
            <span className="bg-gradient-to-r from-amber-400 via-pink-500 to-blue-500 bg-clip-text text-transparent">
              NEXT-GEN EDITING
            </span>
          </div>
        </div>
      );

    default:
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="bg-zinc-900/90 border border-pink-500/40 p-4 rounded text-center text-xs font-mono text-pink-300">
            [Procedural Motion Code: {motionCode.templateId || 'custom-agent-code'}]
          </div>
        </div>
      );
  }
};

