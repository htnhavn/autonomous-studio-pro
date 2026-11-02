/**
 * @file templates/index.tsx
 * @description 8 Industrial-Grade Built-in Code-as-Motion Templates (WeftCut Motifs / Remotion style).
 * Renderable in real-time within the Program Monitor and exportable to headless frame-renderers.
 */

import React from 'react';

export interface MotionTemplateProps {
  currentFrame: number;
  fps: number;
  width?: number;
  height?: number;
  params?: Record<string, any>;
}

// 1. News Article Highlighter (Vox / Johnny Harris style)
export const NewsArticleHighlighterTemplate: React.FC<MotionTemplateProps> = ({
  currentFrame,
  fps,
  params = {},
}) => {
  const headline = params.headline || 'Breakthrough Artificial Intelligence Media Production';
  const quote = params.quote || 'Autonomous agents now direct, assemble, and publish 4K video end-to-end.';
  const source = params.source || 'The Wall Street Journal';
  const progress = Math.min(1.0, currentFrame / (fps * 3));

  return (
    <div className="w-full h-full flex items-center justify-center p-8 bg-zinc-950/70 backdrop-blur-sm">
      <div
        className="w-4/5 bg-[#faf9f6] text-zinc-900 p-8 rounded shadow-2xl border border-zinc-300 font-serif"
        style={{ transform: `scale(${1.0 + progress * 0.06})` }}
      >
        <div className="text-xs uppercase tracking-widest text-zinc-500 font-sans font-bold border-b pb-2 mb-4">
          {source} • Special Investigative Report
        </div>
        <h2 className="text-2xl font-bold mb-4 leading-tight">{headline}</h2>
        <p className="text-base text-zinc-700 leading-relaxed">
          In a comprehensive study on modern automation, researchers highlighted that{' '}
          <span
            className="inline px-1 rounded transition-colors duration-700"
            style={{
              backgroundColor: progress > 0.25 ? '#fef08a' : 'transparent',
              color: progress > 0.25 ? '#854d0e' : 'inherit',
            }}
          >
            "{quote}"
          </span>
        </p>
      </div>
    </div>
  );
};

// 2. Kinetic Typography Burst
export const KineticTypographyBurstTemplate: React.FC<MotionTemplateProps> = ({
  currentFrame,
  fps,
  params = {},
}) => {
  const text = params.text || 'AUTONOMOUS CREATIVE POWER';
  const progress = Math.min(1.0, currentFrame / (fps * 2));
  const scale = 0.8 + Math.sin(progress * Math.PI) * 0.35;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <h1
        className="text-5xl font-black uppercase text-center tracking-tighter drop-shadow-2xl"
        style={{ transform: `scale(${scale}) rotate(${Math.sin(progress * 6) * 1.5}deg)` }}
      >
        <span className="bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 bg-clip-text text-transparent">
          {text}
        </span>
      </h1>
    </div>
  );
};

// 3. Animated Bar Chart
export const AnimatedBarChartTemplate: React.FC<MotionTemplateProps> = ({
  currentFrame,
  fps,
  params = {},
}) => {
  const title = params.title || 'Production Speed (Hours vs Minutes)';
  const progress = Math.min(1.0, currentFrame / (fps * 2.5));

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="w-3/4 bg-zinc-950/90 border border-blue-500/30 p-6 rounded-xl shadow-2xl backdrop-blur-md">
        <h3 className="text-sm font-semibold text-blue-400 mb-4">{title}</h3>
        <div className="space-y-4 text-xs font-mono">
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Manual Editing</span>
              <span>12 Hours</span>
            </div>
            <div className="h-4 bg-zinc-800 rounded">
              <div
                className="h-full bg-zinc-500 rounded"
                style={{ width: `${Math.min(100, progress * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-emerald-400 font-bold mb-1">
              <span>Autonomous Studio Pro</span>
              <span>45 Seconds</span>
            </div>
            <div className="h-4 bg-zinc-800 rounded">
              <div
                className="h-full bg-emerald-500 rounded shadow-[0_0_12px_#10b981]"
                style={{ width: `${Math.min(8, progress * 8)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. Animated Line Chart
export const AnimatedLineChartTemplate: React.FC<MotionTemplateProps> = ({
  currentFrame,
  fps,
  params = {},
}) => {
  const progress = Math.min(1.0, currentFrame / (fps * 3));
  const points = [
    [0, 80],
    [20, 65],
    [40, 75],
    [60, 40],
    [80, 25],
    [100, 10],
  ];

  const pathD = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`)
    .join(' ');

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="w-3/4 bg-zinc-950/90 border border-indigo-500/30 p-6 rounded-xl shadow-2xl">
        <h3 className="text-sm font-semibold text-indigo-400 mb-3">Audience Retention Graph (%)</h3>
        <svg viewBox="0 0 100 100" className="w-full h-40 overflow-visible">
          <path
            d={pathD}
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeDasharray="200"
            strokeDashoffset={200 * (1 - progress)}
          />
        </svg>
      </div>
    </div>
  );
};

// 5. 3D Map Flyover
export const MapFlyover3DTemplate: React.FC<MotionTemplateProps> = ({
  currentFrame,
  fps,
  params = {},
}) => {
  const origin = params.origin || 'San Francisco';
  const destination = params.destination || 'Tokyo';
  const progress = Math.min(1.0, currentFrame / (fps * 3.5));

  return (
    <div className="w-full h-full flex items-center justify-center p-8 bg-zinc-950/80">
      <div className="relative w-4/5 h-64 bg-slate-900 border border-cyan-500/40 rounded-xl overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(#0891b2_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
        <div className="flex items-center gap-12 text-sm font-mono z-10">
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-cyan-400 animate-ping mb-1" />
            <span className="text-cyan-300 font-bold">{origin}</span>
          </div>
          <div className="w-48 h-0.5 bg-dashed border-b-2 border-dashed border-cyan-400 relative">
            <div
              className="w-3 h-3 bg-white rounded-full absolute -top-1"
              style={{ left: `${progress * 100}%` }}
            />
          </div>
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-amber-400 mb-1" />
            <span className="text-amber-300 font-bold">{destination}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 6. Callout Pointer Box
export const CalloutPointerBoxTemplate: React.FC<MotionTemplateProps> = ({
  params = {},
}) => {
  const label = params.label || 'KEY FACTOR';
  const description = params.description || 'Neural frame interpolation running via CUDA/NVDEC';

  return (
    <div className="w-full h-full p-8 flex items-end justify-start">
      <div className="bg-zinc-950/90 border-l-4 border-blue-500 p-4 rounded shadow-2xl max-w-sm backdrop-blur-md">
        <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider block mb-1">{label}</span>
        <p className="text-xs text-zinc-200 leading-snug">{description}</p>
      </div>
    </div>
  );
};

// 7. Social Proof Tweet Card
export const SocialProofTweetCardTemplate: React.FC<MotionTemplateProps> = ({
  params = {},
}) => {
  const author = params.author || 'AI Visionary (@techexpert)';
  const text = params.text || 'Just tried the new autonomous editor: cut, graded, and uploaded in 90 seconds. Unbelievable.';

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="bg-black/90 border border-zinc-800 p-5 rounded-2xl max-w-md shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">AI</div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1">
              {author} <span className="text-blue-400">✓</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-zinc-200 leading-normal">{text}</p>
      </div>
    </div>
  );
};

// 8. Cinematic Chapter Title
export const ChapterTitleCinematicTemplate: React.FC<MotionTemplateProps> = ({
  currentFrame,
  fps,
  params = {},
}) => {
  const chapterNumber = params.chapterNumber || '01';
  const title = params.title || 'THE NEW PARADIGM';
  const progress = Math.min(1.0, currentFrame / (fps * 3));

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black/90">
      <span className="text-xs font-mono text-amber-500 tracking-widest uppercase mb-2">
        Chapter {chapterNumber}
      </span>
      <h1
        className="text-4xl font-serif text-white tracking-widest uppercase transition-opacity duration-1000"
        style={{ opacity: Math.sin(progress * Math.PI) }}
      >
        {title}
      </h1>
      <div className="w-16 h-0.5 bg-amber-500 mt-4" />
    </div>
  );
};

