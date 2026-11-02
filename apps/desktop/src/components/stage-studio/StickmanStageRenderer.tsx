/**
 * @file StickmanStageRenderer.tsx
 * @description Zero-Token Deterministic 2D Puppet, Skeletal Stickman, 2.5D Camera Rig & Genre Stage Renderer.
 * Evaluates pure mathematical kinematics and camera choreography at 60-120fps with 0ms latency and 0 AI tokens.
 */

import React, { useMemo } from 'react';
import {
  ChoreographedStageScene,
  StageActorPlacement,
  StageWidgetPlacement,
  StageBackdropId,
  StageAtmosphereId,
} from '../../../../../packages/stage-engine/src/genre-kits';
import {
  evaluateCameraRigAtProgress,
  EvaluatedCameraFrame,
} from '../../../../../packages/stage-engine/src/camera-choreography';
import {
  evaluateMoveSetAtTime,
  StickmanBonePose,
} from '../../../../../packages/stage-engine/src/puppet-rig';

export interface StickmanStageRendererProps {
  readonly stageScene: ChoreographedStageScene;
  readonly currentTimeSec: number;
  readonly clipProgress0to1: number;
  readonly className?: string;
}

export const StickmanStageRenderer: React.FC<StickmanStageRendererProps> = ({
  stageScene,
  currentTimeSec,
  clipProgress0to1,
  className = '',
}) => {
  // 1. Evaluate Virtual 2.5D Camera Rig
  const camera: EvaluatedCameraFrame = useMemo(() => {
    return evaluateCameraRigAtProgress(stageScene.cameraRig, clipProgress0to1, currentTimeSec);
  }, [stageScene.cameraRig, clipProgress0to1, currentTimeSec]);

  // Camera 3D transform style
  const cameraTransformStyle: React.CSSProperties = {
    transform: `scale(${camera.zoom}) translate(${camera.panX * 30}%, ${camera.panY * 30}%) rotateX(${camera.tilt3DXDeg}deg) rotateY(${camera.tilt3DYDeg}deg) rotateZ(${camera.rotationDeg}deg)`,
    transformOrigin: '50% 65%',
    transition: 'transform 0.05s linear',
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-black ${className}`}
      style={{ perspective: '1100px' }}
    >
      {/* 2.5D Camera Viewport Container */}
      <div
        className="absolute inset-0 w-full h-full will-change-transform"
        style={cameraTransformStyle}
      >
        {/* Layer 1: Parallax Backdrop */}
        <BackdropRenderer
          backdropId={stageScene.backdrop}
          timeSec={currentTimeSec}
          parallaxMultiplier={camera.parallaxMultiplier}
        />

        {/* Layer 2: Particle Atmosphere */}
        {stageScene.atmosphere !== 'none' && (
          <AtmosphereRenderer atmosphereId={stageScene.atmosphere} timeSec={currentTimeSec} />
        )}

        {/* Layer 3: Interactive Stage Widgets (Charts, Curves, Scales) */}
        {stageScene.widgets.map((widget) => (
          <StageWidgetRenderer
            key={widget.widgetId}
            widget={widget}
            timeSec={currentTimeSec}
            progress0to1={clipProgress0to1}
          />
        ))}

        {/* Layer 4: Stage Actors & Stickman Puppets */}
        {stageScene.actors.map((actor) => (
          <StageActorRenderer
            key={actor.actorId}
            actor={actor}
            timeSec={currentTimeSec}
            progress0to1={clipProgress0to1}
          />
        ))}

        {/* Layer 5: Headline Banner */}
        {stageScene.headlineBanner && (
          <div className="absolute top-6 inset-x-8 flex justify-center z-30 pointer-events-none">
            <div className="bg-gradient-to-r from-amber-500/20 via-black/85 to-amber-500/20 border-y-2 border-amber-400/80 px-8 py-2.5 backdrop-blur-md shadow-2xl">
              <h2 className="text-amber-300 font-black text-xl sm:text-2xl uppercase tracking-widest text-center drop-shadow-[0_2px_10px_rgba(245,158,11,0.6)]">
                {stageScene.headlineBanner}
              </h2>
            </div>
          </div>
        )}
      </div>

      {/* Layer 6: Dramatic Spotlight & Vignette Overlay (Screen-space) */}
      <VignetteAndSpotlightOverlay
        vignetteStrength={camera.vignetteStrength}
        spotlightCenter={camera.spotlightCenter}
      />
    </div>
  );
};

// ============================================================================
// BACKDROP RENDERER
// ============================================================================

interface BackdropRendererProps {
  backdropId: StageBackdropId;
  timeSec: number;
  parallaxMultiplier: number;
}

const BackdropRenderer: React.FC<BackdropRendererProps> = ({ backdropId, timeSec, parallaxMultiplier }) => {
  const drift = (timeSec * 4 * parallaxMultiplier) % 80;

  switch (backdropId) {
    case 'econ.chalkboard-grid-dark':
      return (
        <div className="absolute inset-0 bg-[#0c2014] text-emerald-100/30 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="chalk-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#chalk-grid)" />
            {/* Faint chalk math formulas */}
            <text x="5%" y="15%" fill="rgba(255,255,255,0.18)" fontSize="18" fontFamily="monospace">
              ΔGDP = c·ΔI + (M/P)·v
            </text>
            <text x="75%" y="22%" fill="rgba(255,255,255,0.14)" fontSize="16" fontFamily="monospace">
              r* = π + g + 0.5(π - 2%)
            </text>
            <text x="12%" y="85%" fill="rgba(255,255,255,0.12)" fontSize="15" fontFamily="monospace">
              MV = PY  ⇒  P = MV / Y
            </text>
            <circle cx="85%" cy="75%" r="70" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" />
          </svg>
          <div className="absolute inset-0 bg-radial-vignette opacity-40 pointer-events-none" />
        </div>
      );

    case 'econ.bloomberg-terminal-matrix':
      return (
        <div className="absolute inset-0 bg-[#0a0701] text-amber-500 overflow-hidden font-mono text-[11px]">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px]" />
          {/* Ticker bar header */}
          <div className="absolute top-0 inset-x-0 h-7 bg-amber-950/60 border-b border-amber-600/40 flex items-center px-4 justify-between text-amber-400 font-semibold">
            <span>TERMINAL // MACRO_FEED_V4</span>
            <div className="flex gap-4 text-[10px]">
              <span className="text-emerald-400">SPX: 5,984 ▲ +1.4%</span>
              <span className="text-emerald-400">BTC: $98,420 ▲ +4.2%</span>
              <span className="text-rose-400">US10Y: 4.42% ▼ -0.05</span>
              <span className="text-amber-300">FED_FUNDS: 5.25%</span>
            </div>
          </div>
          {/* Faint matrix chart backdrop */}
          <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 1000 600">
            <path
              d="M0,450 Q200,420 400,320 T700,200 T1000,120 L1000,600 L0,600 Z"
              fill="url(#bloomberg-grad)"
            />
            <path d="M0,450 Q200,420 400,320 T700,200 T1000,120" fill="none" stroke="#f59e0b" strokeWidth="2" />
            <defs>
              <linearGradient id="bloomberg-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      );

    case 'econ.whiteboard-paper-clean':
      return (
        <div className="absolute inset-0 bg-[#f1f5f9] overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="whiteboard-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#0284c7" strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#whiteboard-grid)" />
          </svg>
          <div className="absolute bottom-4 left-6 text-slate-400 font-sans text-xs tracking-wider font-semibold">
            FIG 1.1 — SYSTEMIC ECONOMIC CYCLE
          </div>
        </div>
      );

    case 'econ.central-bank-vault':
      return (
        <div className="absolute inset-0 bg-[#18181b] overflow-hidden flex items-center justify-center">
          <div className="w-[800px] h-[800px] rounded-full border-8 border-zinc-700/60 bg-gradient-to-tr from-zinc-900 via-zinc-800 to-zinc-950 shadow-2xl flex items-center justify-center relative opacity-40">
            {/* Vault door wheel gears */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <div
                key={deg}
                className="absolute w-6 h-28 bg-amber-600/50 rounded-full"
                style={{
                  transform: `rotate(${deg + timeSec * 4}deg) translateY(-260px)`,
                }}
              />
            ))}
            <div className="w-64 h-64 rounded-full border-4 border-amber-500/40 bg-zinc-950 flex items-center justify-center">
              <span className="text-amber-400 font-mono text-xl font-bold tracking-widest">FEDERAL RESERVE</span>
            </div>
          </div>
        </div>
      );

    case 'cosmic.deep-space-nebula':
      return (
        <div className="absolute inset-0 bg-[#030712] overflow-hidden">
          {/* Glowing colorful nebula clouds */}
          <div
            className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full bg-purple-600/25 blur-[120px] will-change-transform"
            style={{ transform: `translate(${Math.sin(timeSec * 0.3) * 30}px, ${Math.cos(timeSec * 0.2) * 20}px)` }}
          />
          <div
            className="absolute -bottom-32 -right-32 w-[700px] h-[700px] rounded-full bg-cyan-600/20 blur-[130px] will-change-transform"
            style={{ transform: `translate(${Math.cos(timeSec * 0.25) * 35}px, ${Math.sin(timeSec * 0.3) * 25}px)` }}
          />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[450px] h-[450px] rounded-full bg-indigo-500/15 blur-[100px]" />
          {/* Static distant stars */}
          <svg className="absolute inset-0 w-full h-full opacity-60">
            {[...Array(60)].map((_, i) => {
              const cx = (i * 17.3 + drift * 0.2) % 100;
              const cy = (i * 23.7) % 100;
              const r = (i % 5 === 0 ? 1.8 : 1.0);
              return <circle key={i} cx={`${cx}%`} cy={`${cy}%`} r={r} fill="#ffffff" opacity={0.3 + (i % 7) * 0.1} />;
            })}
          </svg>
        </div>
      );

    case 'cosmic.event-horizon-blackhole':
      return (
        <div className="absolute inset-0 bg-[#020204] overflow-hidden flex items-center justify-center">
          {/* Glowing relativistic accretion disk */}
          <div
            className="relative w-[500px] h-[200px] rounded-full border-4 border-amber-500/70 bg-gradient-to-r from-amber-600/30 via-orange-500/40 to-yellow-400/30 blur-sm will-change-transform"
            style={{ transform: `rotate(-18deg) scale(${1 + Math.sin(timeSec * 1.5) * 0.03})` }}
          />
          <div className="absolute w-56 h-56 rounded-full bg-black border-2 border-amber-300/60 shadow-[0_0_80px_rgba(245,158,11,0.6)] flex items-center justify-center">
            <div className="w-52 h-52 rounded-full bg-black shadow-inner" />
          </div>
        </div>
      );

    case 'cosmic.solar-system-orrery':
      return (
        <div className="absolute inset-0 bg-[#050814] overflow-hidden flex items-center justify-center">
          {/* Concentric orbital rings */}
          {[120, 200, 300, 420, 560].map((radius, idx) => {
            const planetAngle = (timeSec * (0.8 / (idx + 1))) % (Math.PI * 2);
            const px = Math.cos(planetAngle) * (radius / 2);
            const py = Math.sin(planetAngle) * (radius / 2);
            return (
              <div
                key={radius}
                className="absolute rounded-full border border-cyan-500/20"
                style={{ width: `${radius}px`, height: `${radius}px` }}
              >
                <div
                  className="absolute w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                  style={{
                    left: `calc(50% + ${px}px - 6px)`,
                    top: `calc(50% + ${py}px - 6px)`,
                  }}
                />
              </div>
            );
          })}
          {/* Central Sun */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-[0_0_40px_rgba(245,158,11,0.8)]" />
        </div>
      );

    case 'cosmic.scifi-observatory-hud':
      return (
        <div className="absolute inset-0 bg-[#020617] text-cyan-400 overflow-hidden font-mono text-xs">
          <svg className="absolute inset-0 w-full h-full opacity-35" preserveAspectRatio="none" viewBox="0 0 1000 600">
            <circle cx="500" cy="300" r="220" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="6 6" />
            <circle cx="500" cy="300" r="140" fill="none" stroke="#06b6d4" strokeWidth="1.5" />
            <line x1="500" y1="40" x2="500" y2="560" stroke="#06b6d4" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="100" y1="300" x2="900" y2="300" stroke="#06b6d4" strokeWidth="0.8" strokeDasharray="4 4" />
          </svg>
          <div className="absolute top-4 left-6 text-cyan-300/80">OBSERVATORY_TELESCOPE // AZ: 218.4° EL: 42.1°</div>
          <div className="absolute bottom-4 right-6 text-cyan-300/80">SPECTRUM: LYMAN-ALPHA EMISSION</div>
        </div>
      );

    case 'lore.ancient-parchment-map':
      return (
        <div className="absolute inset-0 bg-[#2b1f14] text-[#d6b788] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#d6b788_0.7px,transparent_0.7px)] [background-size:28px_28px] opacity-15" />
          {/* Vintage compass rose */}
          <svg className="absolute top-1/4 right-1/4 w-64 h-64 opacity-25" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#d6b788" strokeWidth="2" />
            <polygon points="100,20 108,92 180,100 108,108 100,180 92,108 20,100 92,92" fill="#d6b788" />
          </svg>
          {/* Contour elevation lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 1000 600">
            <path d="M50,150 Q250,50 450,180 T850,120" fill="none" stroke="#d6b788" strokeWidth="1.5" />
            <path d="M80,220 Q280,120 480,250 T880,190" fill="none" stroke="#d6b788" strokeWidth="1.5" />
            <path d="M120,310 Q320,210 520,340 T920,280" fill="none" stroke="#d6b788" strokeWidth="1.5" />
          </svg>
        </div>
      );

    case 'lore.gothic-cathedral-ruins':
      return (
        <div className="absolute inset-0 bg-[#0a0f1d] overflow-hidden flex items-end justify-center">
          {/* Gothic arch silhouettes */}
          <svg className="w-full h-4/5 opacity-30" viewBox="0 0 800 400" preserveAspectRatio="none">
            <path d="M100,400 L100,200 Q200,80 300,200 L300,400 Z" fill="#1e293b" />
            <path d="M320,400 L320,160 Q400,40 480,160 L480,400 Z" fill="#334155" />
            <path d="M500,400 L500,200 Q600,80 700,200 L700,400 Z" fill="#1e293b" />
          </svg>
          <div className="absolute top-0 right-1/4 w-48 h-full bg-gradient-to-b from-blue-400/20 via-blue-500/5 to-transparent -rotate-12 blur-lg pointer-events-none" />
        </div>
      );

    case 'lore.tactical-war-room-table':
      return (
        <div className="absolute inset-0 bg-[#17120e] overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="war-table-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f59e0b" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#war-table-grid)" />
          </svg>
          <div className="absolute top-6 left-8 text-amber-500/60 font-mono text-xs uppercase tracking-widest">
            BẢN ĐỒ CHIẾN LƯỢC TOÀN CẢNH — THỜI KỲ CHIẾN TRANH LORE
          </div>
        </div>
      );

    case 'lore.faction-bloodline-board':
    default:
      return (
        <div className="absolute inset-0 bg-[#1c1917] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#78716c_1px,transparent_1px)] [background-size:20px_20px] opacity-25" />
          {/* Red pinned string connecting factions */}
          <svg className="absolute inset-0 w-full h-full opacity-60">
            <line x1="20%" y1="30%" x2="55%" y2="60%" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 3" />
            <line x1="55%" y1="60%" x2="80%" y2="25%" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 3" />
            <circle cx="20%" cy="30%" r="5" fill="#f87171" />
            <circle cx="55%" cy="60%" r="5" fill="#f87171" />
            <circle cx="80%" cy="25%" r="5" fill="#f87171" />
          </svg>
        </div>
      );
  }
};

// ============================================================================
// ATMOSPHERE PARTICLES RENDERER
// ============================================================================

interface AtmosphereRendererProps {
  atmosphereId: StageAtmosphereId;
  timeSec: number;
}

const AtmosphereRenderer: React.FC<AtmosphereRendererProps> = ({ atmosphereId, timeSec }) => {
  const particles = useMemo(() => {
    return [...Array(24)].map((_, i) => ({
      id: i,
      x: ((i * 37) % 94) + 3,
      speedY: 20 + ((i * 13) % 35),
      swayFreq: 1.5 + (i % 4) * 0.5,
      size: 14 + (i % 6) * 4,
    }));
  }, []);

  switch (atmosphereId) {
    case 'particles.falling-dollar-bills':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {particles.map((p) => {
            const posY = ((p.x * 10 + timeSec * p.speedY) % 115) - 10;
            const swayX = Math.sin(timeSec * p.swayFreq + p.id) * 20;
            const rot = Math.sin(timeSec * 2 + p.id) * 35;
            return (
              <div
                key={p.id}
                className="absolute bg-emerald-600 border border-emerald-300 text-emerald-100 font-bold text-[9px] px-1.5 py-0.5 rounded shadow-lg flex items-center justify-center font-mono opacity-85"
                style={{
                  left: `calc(${p.x}% + ${swayX}px)`,
                  top: `${posY}%`,
                  transform: `rotate(${rot}deg)`,
                }}
              >
                ${p.id % 2 === 0 ? '100' : 'FED'}
              </div>
            );
          })}
        </div>
      );

    case 'particles.red-crash-sparks':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {particles.map((p) => {
            const posY = ((timeSec * p.speedY * 1.8 + p.id * 15) % 110) - 5;
            const swayX = Math.sin(timeSec * 4 + p.id) * 15;
            return (
              <div
                key={p.id}
                className="absolute w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e] opacity-80"
                style={{
                  left: `calc(${p.x}% + ${swayX}px)`,
                  top: `${posY}%`,
                }}
              />
            );
          })}
        </div>
      );

    case 'particles.torch-fire-embers':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {particles.map((p) => {
            // Embers float UPWARD
            const posY = 105 - (((timeSec * p.speedY * 0.8 + p.id * 20) % 110) - 5);
            const swayX = Math.sin(timeSec * 3 + p.id) * 25;
            return (
              <div
                key={p.id}
                className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] opacity-75"
                style={{
                  left: `calc(${p.x}% + ${swayX}px)`,
                  top: `${posY}%`,
                }}
              />
            );
          })}
        </div>
      );

    case 'particles.cosmic-starfield-warp':
    case 'particles.nebula-stardust':
    case 'particles.ancient-dust-motes':
    default:
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {particles.map((p) => {
            const posY = ((p.id * 25 + timeSec * 8) % 100);
            const swayX = Math.sin(timeSec * 1.2 + p.id) * 18;
            return (
              <div
                key={p.id}
                className="absolute rounded-full bg-white shadow-[0_0_6px_#ffffff] opacity-60"
                style={{
                  width: `${(p.id % 3) + 2}px`,
                  height: `${(p.id % 3) + 2}px`,
                  left: `calc(${p.x}% + ${swayX}px)`,
                  top: `${posY}%`,
                }}
              />
            );
          })}
        </div>
      );
  }
};

// ============================================================================
// STAGE WIDGET RENDERER (Built-in Curves, Candlesticks, Spheres)
// ============================================================================

interface StageWidgetRendererProps {
  widget: StageWidgetPlacement;
  timeSec: number;
  progress0to1: number;
}

const StageWidgetRenderer: React.FC<StageWidgetRendererProps> = ({
  widget,
  timeSec,
  progress0to1,
}) => {
  const containerStyle: React.CSSProperties = {
    left: `${widget.stageX * 100}%`,
    top: `${widget.stageY * 100}%`,
    transform: `translate(-50%, -50%) scale(${widget.scale})`,
  };

  return (
    <div
      className="absolute z-15 pointer-events-none transition-transform will-change-transform"
      style={containerStyle}
    >
      <div className="bg-[#12151e]/90 border border-zinc-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md min-w-[240px]">
        {/* Widget Title Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 mb-2">
          <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wide truncate">
            {widget.title}
          </span>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold"
            style={{ backgroundColor: `${widget.accentColorHex}22`, color: widget.accentColorHex }}
          >
            {widget.primaryValueLabel}
          </span>
        </div>

        {/* Specialized Widget Visual Bodies */}
        {renderWidgetBody(widget, timeSec, progress0to1)}
      </div>
    </div>
  );
};

function renderWidgetBody(widget: StageWidgetPlacement, timeSec: number, progress0to1: number) {
  switch (widget.kind) {
    case 'econ.supply-demand-curve':
      return (
        <div className="w-52 h-36 relative bg-zinc-950/80 rounded border border-zinc-800 p-2">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {/* Axes */}
            <line x1="10" y1="90" x2="95" y2="90" stroke="#71717a" strokeWidth="1.5" />
            <line x1="10" y1="90" x2="10" y2="5" stroke="#71717a" strokeWidth="1.5" />
            <text x="90" y="85" fill="#a1a1aa" fontSize="7" fontFamily="sans-serif">Q</text>
            <text x="14" y="12" fill="#a1a1aa" fontSize="7" fontFamily="sans-serif">P</text>
            {/* Supply Curve (S) - Sloping Up */}
            <path d="M 15 80 Q 50 50 85 20" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
            <text x="82" y="16" fill="#60a5fa" fontSize="8" fontWeight="bold">S</text>
            {/* Demand Curve (D) - Sloping Down */}
            <path d="M 15 20 Q 50 50 85 80" fill="none" stroke="#ef4444" strokeWidth="2.5" />
            <text x="82" y="90" fill="#f87171" fontSize="8" fontWeight="bold">D</text>
            {/* Equilibrium Point (P*, Q*) */}
            <circle cx="50" cy="50" r="3.5" fill="#f59e0b" className="animate-pulse" />
            <line x1="10" y1="50" x2="50" y2="50" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="50" y1="50" x2="50" y2="90" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" />
            <text x="52" y="47" fill="#fbbf24" fontSize="7" fontWeight="bold">Equilibrium</text>
          </svg>
        </div>
      );

    case 'econ.stock-candlestick-crash':
      return (
        <div className="w-52 h-28 relative bg-zinc-950/80 rounded border border-zinc-800 p-2 flex items-end justify-between gap-1.5">
          {[
            { green: true, height: 45, wickT: 10, wickB: 12 },
            { green: true, height: 60, wickT: 8, wickB: 10 },
            { green: false, height: 35, wickT: 14, wickB: 10 },
            { green: false, height: 75, wickT: 16, wickB: 20 },
            { green: false, height: 85, wickT: 10, wickB: 24 },
          ].map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div
                className="w-0.5 bg-zinc-500"
                style={{ height: `${bar.wickT}px` }}
              />
              <div
                className={`w-full rounded-sm ${bar.green ? 'bg-emerald-500' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`}
                style={{ height: `${bar.height}px` }}
              />
              <div
                className="w-0.5 bg-zinc-500"
                style={{ height: `${bar.wickB}px` }}
              />
            </div>
          ))}
        </div>
      );

    case 'econ.inflation-money-stack':
      const stackHeight = 20 + Math.abs(Math.sin(timeSec * 3)) * 40;
      return (
        <div className="w-52 h-28 flex flex-col items-center justify-center bg-zinc-950/80 rounded border border-zinc-800 p-3">
          <div className="text-[10px] text-zinc-400 mb-2 font-mono">SUPPLY EXPANSION: +{Math.round(stackHeight * 12)}%</div>
          <div className="w-32 bg-emerald-600/80 border-2 border-emerald-400 rounded-lg flex items-center justify-center font-bold text-white shadow-xl transition-all" style={{ height: `${stackHeight}px` }}>
            💵 MONEY GO BRRR
          </div>
        </div>
      );

    case 'cosmic.scale-comparison-spheres':
      return (
        <div className="w-56 h-32 flex items-center justify-around bg-zinc-950/80 rounded border border-zinc-800 p-2">
          <div className="flex flex-col items-center">
            <div className="w-5 h-5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
            <span className="text-[9px] text-zinc-400 mt-1">Earth</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-amber-500 shadow-[0_0_14px_#f59e0b]" />
            <span className="text-[9px] text-zinc-400 mt-1">Sun</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-black border-2 border-purple-500 shadow-[0_0_20px_#a855f7]" />
            <span className="text-[9px] text-zinc-400 mt-1">TON 618</span>
          </div>
        </div>
      );

    case 'lore.animated-map-march-line':
      return (
        <div className="w-52 h-28 bg-[#23180f] rounded border border-amber-900/60 p-2 relative overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 100 60">
            <path
              d="M 10 50 C 30 10, 60 40, 90 20"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="4 3"
            />
            {/* Marching flag indicator */}
            <circle cx="60" cy="35" r="4" fill="#fbbf24" />
            <text x="66" y="38" fill="#fbbf24" fontSize="8" fontWeight="bold">🚩 Legion</text>
          </svg>
        </div>
      );

    case 'lore.boss-item-stat-card':
    default:
      return (
        <div className="w-52 p-2 bg-gradient-to-b from-amber-950/40 to-zinc-950 rounded border border-amber-500/40 font-serif">
          <div className="text-[10px] text-amber-300 font-bold mb-1">LEGENDARY ARTIFACT</div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-1">
            <div className="bg-amber-500 h-full w-4/5" />
          </div>
          <div className="text-[9px] text-zinc-400">Power: S-Tier | Lore: Ancient Age</div>
        </div>
      );
  }
}

// ============================================================================
// STAGE ACTOR & STICKMAN PUPPET RENDERER
// ============================================================================

interface StageActorRendererProps {
  actor: StageActorPlacement;
  timeSec: number;
  progress0to1: number;
}

const StageActorRenderer: React.FC<StageActorRendererProps> = ({
  actor,
  timeSec,
  progress0to1,
}) => {
  // Evaluate deterministic bone kinematics
  const pose: StickmanBonePose = useMemo(() => {
    return evaluateMoveSetAtTime(actor.moveSet, timeSec, 0.45);
  }, [actor.moveSet, timeSec]);

  const actorPlacementStyle: React.CSSProperties = {
    left: `${actor.stageX * 100}%`,
    top: `${actor.stageY * 100}%`,
    transform: `translate(-50%, -100%) scale(${actor.scale * (actor.flipHorizontal ? -1 : 1)}, ${actor.scale})`,
  };

  return (
    <div
      className="absolute z-20 will-change-transform flex flex-col items-center"
      style={actorPlacementStyle}
    >
      {/* Speech Bubble (if any) */}
      {actor.speechBubbleText && (
        <div
          className="mb-2 max-w-[220px] bg-white text-zinc-900 px-3 py-1.5 rounded-2xl shadow-2xl text-[11px] font-semibold relative text-center border-2 border-zinc-950 animate-bounce"
          style={{ animationDuration: '3s' }}
        >
          {actor.speechBubbleText}
          {/* Bubble tail pointing down */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white" />
        </div>
      )}

      {/* Overhead Emote Badge */}
      {pose.overheadEmote && (
        <div className="absolute -top-12 text-2xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] animate-pulse">
          {pose.overheadEmote}
        </div>
      )}

      {/* 2D Skeletal Puppet Vector Canvas */}
      <StickmanVectorSkeleton actor={actor} pose={pose} timeSec={timeSec} />

      {/* Actor Floor Shadow */}
      <div className="w-24 h-4 rounded-full bg-black/50 blur-sm -mt-2" />
    </div>
  );
};

// ============================================================================
// STICKMAN VECTOR SKELETON (SVG Bone Tree)
// ============================================================================

interface StickmanVectorSkeletonProps {
  actor: StageActorPlacement;
  pose: StickmanBonePose;
  timeSec: number;
}

const StickmanVectorSkeleton: React.FC<StickmanVectorSkeletonProps> = ({ actor, pose, timeSec }) => {
  // Skeleton dimensions
  const strokeWidth = 5.5;
  const strokeColor = actor.archetype === 'lore-chronicler-hooded' ? '#e2e8f0' : '#ffffff';

  // Kinematic calculations
  const rootX = 100 + pose.rootOffsetX;
  const rootY = 140 + pose.rootOffsetY; // Pelvis joint

  // Torso & Neck
  const torsoRad = (pose.torsoLeanDeg * Math.PI) / 180;
  const torsoLength = 55;
  const neckX = rootX + Math.sin(torsoRad) * torsoLength;
  const neckY = rootY - Math.cos(torsoRad) * torsoLength;

  // Head
  const headRadius = 20;
  const headCenterY = neckY - headRadius - 4;

  // Arms (Left & Right)
  const armLen = 30;
  const shoulderY = neckY + 6;

  // Right arm (Primary gesture / prop hand)
  const shoulderRightRad = (pose.shoulderRightDeg * Math.PI) / 180;
  const elbowRightX = neckX + Math.sin(shoulderRightRad) * armLen;
  const elbowRightY = shoulderY + Math.cos(shoulderRightRad) * armLen;
  const elbowRightTotalRad = shoulderRightRad + (pose.elbowRightDeg * Math.PI) / 180;
  const handRightX = elbowRightX + Math.sin(elbowRightTotalRad) * armLen;
  const handRightY = elbowRightY + Math.cos(elbowRightTotalRad) * armLen;

  // Left arm
  const shoulderLeftRad = (pose.shoulderLeftDeg * Math.PI) / 180;
  const elbowLeftX = neckX + Math.sin(shoulderLeftRad) * armLen;
  const elbowLeftY = shoulderY + Math.cos(shoulderLeftRad) * armLen;
  const elbowLeftTotalRad = shoulderLeftRad + (pose.elbowLeftDeg * Math.PI) / 180;
  const handLeftX = elbowLeftX + Math.sin(elbowLeftTotalRad) * armLen;
  const handLeftY = elbowLeftY + Math.cos(elbowLeftTotalRad) * armLen;

  // Legs (Hip to Knee to Foot)
  const legLen = 38;
  const hipLeftRad = (pose.hipLeftDeg * Math.PI) / 180;
  const kneeLeftX = rootX - 10 + Math.sin(hipLeftRad) * legLen;
  const kneeLeftY = rootY + Math.cos(hipLeftRad) * legLen;
  const footLeftRad = hipLeftRad + (pose.kneeLeftDeg * Math.PI) / 180;
  const footLeftX = kneeLeftX + Math.sin(footLeftRad) * legLen;
  const footLeftY = kneeLeftY + Math.cos(footLeftRad) * legLen;

  const hipRightRad = (pose.hipRightDeg * Math.PI) / 180;
  const kneeRightX = rootX + 10 + Math.sin(hipRightRad) * legLen;
  const kneeRightY = rootY + Math.cos(hipRightRad) * legLen;
  const footRightRad = hipRightRad + (pose.kneeRightDeg * Math.PI) / 180;
  const footRightX = kneeRightX + Math.sin(footRightRad) * legLen;
  const footRightY = kneeRightY + Math.cos(footRightRad) * legLen;

  return (
    <svg
      width="200"
      height="260"
      viewBox="0 0 200 260"
      className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] overflow-visible"
    >
      <defs>
        <filter id="stick-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.8" />
        </filter>
      </defs>

      <g filter="url(#stick-glow)">
        {/* Left Leg */}
        <line x1={rootX - 6} y1={rootY} x2={kneeLeftX} y2={kneeLeftY} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        <line x1={kneeLeftX} y1={kneeLeftY} x2={footLeftX} y2={footLeftY} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />

        {/* Right Leg */}
        <line x1={rootX + 6} y1={rootY} x2={kneeRightX} y2={kneeRightY} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        <line x1={kneeRightX} y1={kneeRightY} x2={footRightX} y2={footRightY} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />

        {/* Torso Spine */}
        <line x1={rootX} y1={rootY} x2={neckX} y2={neckY} stroke={strokeColor} strokeWidth={strokeWidth + 1} strokeLinecap="round" />

        {/* Left Arm */}
        <line x1={neckX} y1={shoulderY} x2={elbowLeftX} y2={elbowLeftY} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        <line x1={elbowLeftX} y1={elbowLeftY} x2={handLeftX} y2={handLeftY} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />

        {/* Right Arm */}
        <line x1={neckX} y1={shoulderY} x2={elbowRightX} y2={elbowRightY} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        <line x1={elbowRightX} y1={elbowRightY} x2={handRightX} y2={handRightY} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />

        {/* Archetype Custom Costume Layers (Tie, Hood, Suit) */}
        {renderArchetypeAccessories(actor.archetype, neckX, neckY, headCenterY, rootX, rootY)}

        {/* Head Circle */}
        <circle
          cx={neckX}
          cy={headCenterY}
          r={headRadius}
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth="3.5"
        />

        {/* Face Expressions & Lip-Sync Mouth */}
        {renderFace(actor.expression, neckX, headCenterY, pose.mouthOpenness)}

        {/* Held Props (Pointer, Money Printer, Sword, Telescope) */}
        {renderHeldProp(actor.prop, handRightX, handRightY, timeSec)}
      </g>
    </svg>
  );
};

function renderFace(expression: string, cx: number, cy: number, mouthOpenness: number) {
  const mouthHeight = Math.max(1.5, mouthOpenness * 9);

  return (
    <g>
      {/* Eyes */}
      {expression === 'panic-sweat' ? (
        <>
          <circle cx={cx - 6} cy={cy - 3} r="3" fill="#000" />
          <circle cx={cx + 6} cy={cy - 3} r="3" fill="#000" />
          {/* Sweat droplet */}
          <path d={`M ${cx + 14} ${cy - 8} Q ${cx + 17} ${cy - 2} ${cx + 14} ${cy} Q ${cx + 11} ${cy - 2} ${cx + 14} ${cy - 8}`} fill="#38bdf8" />
        </>
      ) : expression === 'smug-smirk' ? (
        <>
          <line x1={cx - 9} y1={cy - 3} x2={cx - 3} y2={cy - 2} stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <circle cx={cx + 6} cy={cy - 3} r="2.5" fill="#000" />
        </>
      ) : (
        <>
          <circle cx={cx - 6} cy={cy - 3} r="2.5" fill="#000" />
          <circle cx={cx + 6} cy={cy - 3} r="2.5" fill="#000" />
        </>
      )}

      {/* Mouth with Audio Lip-Sync */}
      {mouthHeight > 3 ? (
        <ellipse cx={cx} cy={cy + 7} rx="5" ry={mouthHeight} fill="#0f172a" />
      ) : (
        <path d={`M ${cx - 5} ${cy + 7} Q ${cx} ${cy + 9} ${cx + 5} ${cy + 7}`} fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      )}
    </g>
  );
}

function renderArchetypeAccessories(
  archetype: string,
  neckX: number,
  neckY: number,
  headCenterY: number,
  rootX: number,
  rootY: number
) {
  switch (archetype) {
    case 'stickman-economist':
      return (
        <g>
          {/* Red Tie */}
          <polygon
            points={`${neckX - 4},${neckY + 4} ${neckX + 4},${neckY + 4} ${neckX + 5},${neckY + 28} ${neckX},${neckY + 36} ${neckX - 5},${neckY + 28}`}
            fill="#ef4444"
          />
          {/* Glasses */}
          <rect x={neckX - 14} y={headCenterY - 7} width="11" height="7" rx="1.5" fill="none" stroke="#000" strokeWidth="1.8" />
          <rect x={neckX + 3} y={headCenterY - 7} width="11" height="7" rx="1.5" fill="none" stroke="#000" strokeWidth="1.8" />
          <line x1={neckX - 3} y1={headCenterY - 4} x2={neckX + 3} y2={headCenterY - 4} stroke="#000" strokeWidth="1.8" />
        </g>
      );

    case 'stickman-wallstreet':
      return (
        <g>
          {/* Sunglasses */}
          <polygon points={`${neckX - 14},${headCenterY - 6} ${neckX + 14},${headCenterY - 6} ${neckX + 11},${headCenterY + 1} ${neckX - 11},${headCenterY + 1}`} fill="#09090b" />
        </g>
      );

    case 'astronaut-explorer':
      return (
        <g>
          {/* Gold Visor Helmet */}
          <circle cx={neckX} cy={headCenterY} r="23" fill="none" stroke="#38bdf8" strokeWidth="3" />
          <ellipse cx={neckX} cy={headCenterY} rx="15" ry="10" fill="#f59e0b" opacity="0.85" />
          {/* Backpack */}
          <rect x={neckX - 22} y={neckY} width="10" height="34" rx="3" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
        </g>
      );

    case 'lore-chronicler-hooded':
      return (
        <g>
          {/* Hood */}
          <path
            d={`M ${neckX - 22} ${neckY + 8} Q ${neckX - 24} ${headCenterY - 14} ${neckX} ${headCenterY - 26} Q ${neckX + 24} ${headCenterY - 14} ${neckX + 22} ${neckY + 8} Z`}
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth="2.5"
          />
          {/* Cloak */}
          <polygon points={`${neckX - 14},${neckY + 4} ${neckX + 14},${neckY + 4} ${rootX + 25},${rootY + 10} ${rootX - 25},${rootY + 10}`} fill="#334155" opacity="0.9" />
        </g>
      );

    case 'king-emperor-crown':
      return (
        <polygon
          points={`${neckX - 14},${headCenterY - 16} ${neckX - 16},${headCenterY - 28} ${neckX - 5},${headCenterY - 22} ${neckX},${headCenterY - 32} ${neckX + 5},${headCenterY - 22} ${neckX + 16},${headCenterY - 28} ${neckX + 14},${headCenterY - 16}`}
          fill="#f59e0b"
          stroke="#b45309"
          strokeWidth="1.5"
        />
      );

    default:
      return null;
  }
}

function renderHeldProp(prop: string, hx: number, hy: number, timeSec: number) {
  switch (prop) {
    case 'pointer-stick':
      return (
        <line
          x1={hx}
          y1={hy}
          x2={hx + 55}
          y2={hy - 35}
          stroke="#e2e8f0"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      );

    case 'money-printer-crank':
      const crankAngle = timeSec * 15;
      return (
        <g transform={`translate(${hx}, ${hy - 15})`}>
          {/* Printer box */}
          <rect x="-5" y="-10" width="36" height="24" rx="2" fill="#15803d" stroke="#14532d" strokeWidth="2" />
          {/* Output slot */}
          <line x1="2" y1="2" x2="28" y2="2" stroke="#052e16" strokeWidth="2.5" />
          {/* Animated crank handle */}
          <g transform={`translate(34, 2) rotate(${crankAngle})`}>
            <line x1="0" y1="0" x2="12" y2="0" stroke="#f59e0b" strokeWidth="3" />
            <circle cx="12" cy="0" r="3" fill="#ef4444" />
          </g>
        </g>
      );

    case 'glowing-sword':
      return (
        <g transform={`translate(${hx}, ${hy}) rotate(-40)`}>
          <line x1="0" y1="0" x2="0" y2="-65" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" className="shadow-[0_0_12px_#38bdf8]" />
          <line x1="-8" y1="-8" x2="8" y2="-8" stroke="#f59e0b" strokeWidth="3" />
        </g>
      );

    case 'telescope':
      return (
        <g transform={`translate(${hx}, ${hy}) rotate(-35)`}>
          <rect x="-4" y="-45" width="8" height="45" rx="1.5" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
        </g>
      );

    case 'coffee-mug':
      return (
        <g transform={`translate(${hx}, ${hy - 8})`}>
          <rect x="-6" y="-6" width="12" height="14" rx="2" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
          <path d="M 6 -2 Q 11 0 6 4" fill="none" stroke="#475569" strokeWidth="1.5" />
        </g>
      );

    default:
      return null;
  }
}

// ============================================================================
// DRAMATIC SPOTLIGHT & VIGNETTE OVERLAY
// ============================================================================

interface VignetteAndSpotlightOverlayProps {
  vignetteStrength: number;
  spotlightCenter?: { x: number; y: number; radius: number };
}

const VignetteAndSpotlightOverlay: React.FC<VignetteAndSpotlightOverlayProps> = ({
  vignetteStrength,
  spotlightCenter,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
      {/* 1. Cinematic Radial Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${Math.min(
            0.95,
            vignetteStrength * 1.2
          )}) 100%)`,
        }}
      />

      {/* 2. Spotlight Dark Cutout (if dramatic focus active) */}
      {spotlightCenter && (
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <circle
                cx={`${spotlightCenter.x * 100}%`}
                cy={`${spotlightCenter.y * 100}%`}
                r={`${spotlightCenter.radius * 100}%`}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.85)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      )}
    </div>
  );
};

