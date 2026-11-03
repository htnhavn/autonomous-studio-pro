/**
 * @file StagePlaybookPanel.tsx
 * @description Master Stage & Stickman Puppet Control Panel.
 * Allows users to:
 *   1. Switch between 3 Genre Kits (Economics/Stickman, Universe/Cosmic, Lore/History).
 *   2. Select AI Autonomy Tier (0% Token AI -> 100% Full AI Max).
 *   3. 1-Click Zero-Token Deterministic Compilation (PROJECT_COMPILE_DETERMINISTIC_STAGE).
 *   4. Fine-tune Move-Sets, 2.5D Camera Rigs, Backdrops, Props, and Expressions for selected clips.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import {
  GENRE_KIT_CATALOG,
  VideoGenreKitId,
  MOVE_SET_CATALOG,
  CAMERA_RIG_CATALOG,
  ChoreographedStageScene,
  BuiltInStageWidgetKind,
  StageBackdropId,
} from '../../../../../packages/stage-engine/src';
import { REUSABLE_CHARACTER_ACTIONS } from '../../../../../packages/core-schema/src';
import {
  ProductionAutonomyTier,
  STUDIO_AI_PLAYBOOKS,
} from '../../../../../packages/mcp-bridge/src/ai-playbooks';
import {
  Sparkles,
  Zap,
  Film,
  Camera,
  Layers,
  Smile,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

export const StagePlaybookPanel: React.FC = () => {
  const project = useStudioStore((s) => s.project);
  const selectedClipIds = useStudioStore((s) => s.selectedClipIds);
  const dispatchCommand = useStudioStore((s) => s.dispatchCommand);

  // 1. Panel Local State
  const [selectedGenre, setSelectedGenre] = useState<VideoGenreKitId>('economics-stickman');
  const [autonomyTier, setAutonomyTier] = useState<ProductionAutonomyTier>('tier-0-zero-ai');
  const [replaceTrack, setReplaceTrack] = useState<boolean>(true);
  const [scriptInput, setScriptInput] = useState<string>(
    `Tại sao nền kinh tế và các chu kỳ tài chính lại vận hành theo quy luật bí ẩn như vậy?\nHãy nhìn vào biểu đồ tăng trưởng kỷ lục khi lượng tiền khổng lồ được bơm vào hệ thống.\nNhưng ngay sau đó, khủng hoảng và sụp đổ ập đến khiến toàn bộ thị trường rơi vào hoảng loạn!`
  );

  // 2. Identify Selected Stage Clip (if user clicked on a stage-puppet clip)
  const allClips = project.tracks.flatMap((t) => t.clips);
  const selectedClip = allClips.find(
    (c) => selectedClipIds.includes(c.id) && (c.kind === 'stage-puppet' || c.stageScene)
  );
  const currentScene: ChoreographedStageScene | undefined = selectedClip?.stageScene;

  // 3. Compile Zero-Token Stage Handler
  const handleCompileZeroTokenStage = () => {
    if (!scriptInput.trim()) return;

    dispatchCommand({
      commandId: `cmd_compile_stage_${Date.now()}`,
      actor: { kind: 'user', id: 'user_local', displayName: 'User' },
      timestampMs: Date.now(),
      command: {
        type: 'PROJECT_COMPILE_DETERMINISTIC_STAGE',
        scriptText: scriptInput,
        genreKit: selectedGenre,
        replaceExistingStageTrack: replaceTrack,
      },
    });
  };

  // 4. Update Current Scene Properties
  const handleUpdateCurrentScene = (updatedScene: ChoreographedStageScene) => {
    if (!selectedClip) return;

    dispatchCommand({
      commandId: `cmd_update_stage_${Date.now()}`,
      actor: { kind: 'user', id: 'user_local', displayName: 'User' },
      timestampMs: Date.now(),
      command: {
        type: 'CLIP_SET_STAGE_SCENE',
        clipId: selectedClip.id,
        stageScene: updatedScene,
      },
    });
  };

  const currentKit = GENRE_KIT_CATALOG[selectedGenre];

  return (
    <div className="flex flex-col h-full bg-[#12151e] text-zinc-300 text-xs overflow-y-auto select-none p-3 space-y-4">
      {/* ==================================================================== */}
      {/* SECTION 1: GENRE KIT SELECTOR */}
      {/* ==================================================================== */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-blue-400" /> Genre Kit Sân Khấu
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">0-TOKEN TEMPLATES</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setSelectedGenre('economics-stickman')}
            className={`py-2 px-1 rounded flex flex-col items-center text-center transition-all ${
              selectedGenre === 'economics-stickman'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="text-sm">📈</span>
            <span className="text-[10px] mt-0.5 leading-tight">Kinh Tế Người Que</span>
          </button>

          <button
            onClick={() => setSelectedGenre('universe-cosmic')}
            className={`py-2 px-1 rounded flex flex-col items-center text-center transition-all ${
              selectedGenre === 'universe-cosmic'
                ? 'bg-purple-600 text-white shadow font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="text-sm">🌌</span>
            <span className="text-[10px] mt-0.5 leading-tight">Vũ Trụ Khoa Học</span>
          </button>

          <button
            onClick={() => setSelectedGenre('lore-chronicle')}
            className={`py-2 px-1 rounded flex flex-col items-center text-center transition-all ${
              selectedGenre === 'lore-chronicle'
                ? 'bg-amber-600 text-white shadow font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="text-sm">📜</span>
            <span className="text-[10px] mt-0.5 leading-tight">Deep Lore Lịch Sử</span>
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2 rounded border border-zinc-800/80">
          {currentKit.descriptionVi}
        </p>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 2: AI AUTONOMY TIER SELECTOR */}
      {/* ==================================================================== */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" /> Cấp Độ Tự Quyết AI
          </span>
          <span className="text-[10px] text-amber-400/80 font-mono uppercase">TOKEN CONTROL</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setAutonomyTier('tier-0-zero-ai')}
            className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
              autonomyTier === 'tier-0-zero-ai'
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="font-semibold text-[11px] flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" /> 0% Token AI (0ms)
            </div>
            <div className="text-[9px] text-zinc-500 mt-1">100% Thuật toán từ khóa</div>
          </button>

          <button
            onClick={() => setAutonomyTier('tier-1-eco-puppeteer')}
            className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
              autonomyTier === 'tier-1-eco-puppeteer'
                ? 'bg-blue-950/40 border-blue-500 text-blue-200 shadow'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="font-semibold text-[11px] flex items-center gap-1">
              <Smile className="w-3 h-3 text-blue-400" /> Siêu Tiết Kiệm (~90%)
            </div>
            <div className="text-[9px] text-zinc-500 mt-1">AI chỉ đạo diễn sân khấu</div>
          </button>

          <button
            onClick={() => setAutonomyTier('tier-2-hybrid-pro')}
            className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
              autonomyTier === 'tier-2-hybrid-pro'
                ? 'bg-purple-950/40 border-purple-500 text-purple-200 shadow'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="font-semibold text-[11px] flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400" /> Hybrid Chuẩn
            </div>
            <div className="text-[9px] text-zinc-500 mt-1">Sân khấu + Web Hunter 3D</div>
          </button>

          <button
            onClick={() => setAutonomyTier('tier-3-full-ai-max')}
            className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
              autonomyTier === 'tier-3-full-ai-max'
                ? 'bg-rose-950/40 border-rose-500 text-rose-200 shadow'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="font-semibold text-[11px] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-rose-400" /> Full AI Hạng Nặng
            </div>
            <div className="text-[9px] text-zinc-500 mt-1">SAM 2.1 + VLM Critic Loop</div>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 3: 1-CLICK ZERO-TOKEN SCRIPT COMPILER */}
      {/* ==================================================================== */}
      <div className="space-y-2 border-t border-zinc-800 pt-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-100 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-yellow-400" /> Kịch Bản / Lời Thoại Dựng Nhanh
          </span>
          <label className="flex items-center gap-1 text-[10px] text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={replaceTrack}
              onChange={(e) => setReplaceTrack(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-blue-600 focus:ring-0"
            />
            <span>Ghi đè track Stage</span>
          </label>
        </div>

        <textarea
          rows={4}
          value={scriptInput}
          onChange={(e) => setScriptInput(e.target.value)}
          placeholder="Dán kịch bản video hoặc phụ đề vào đây. Trình biên dịch sẽ tự tách câu, gán cử động người que và góc quay 2.5D ngay lập tức..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-yellow-500/80 font-mono leading-relaxed resize-none"
        />

        <button
          onClick={handleCompileZeroTokenStage}
          className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>⚡ Dựng Ngay Toàn Bộ Video Bằng Move-Set Có Sẵn (0 Token)</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 4: SELECTED CLIP STAGE & MOVE-SET INSPECTOR */}
      {/* ==================================================================== */}
      <div className="border-t border-zinc-800 pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Tinh Chỉnh Clip Đang Chọn
          </span>
          {selectedClip && (
            <span className="text-[10px] text-emerald-400 font-mono truncate max-w-[140px]">
              {selectedClip.name}
            </span>
          )}
        </div>

        {currentScene ? (
          <div className="space-y-3 bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800">
            {/* 1. Move-Set Cho Nhân Vật */}
            {currentScene.actors[0] && (
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>Cử động Người Que (Move-Set)</span>
                  <span className="text-zinc-500 font-mono">
                    {currentScene.actors[0].moveSet}
                  </span>
                </label>
                <select
                  value={currentScene.actors[0].moveSet}
                  onChange={(e) => {
                    const newMoveSet = e.target.value as any;
                    const updatedActors = [...currentScene.actors];
                    updatedActors[0] = { ...updatedActors[0], moveSet: newMoveSet };
                    handleUpdateCurrentScene({ ...currentScene, actors: updatedActors });
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <optgroup label="🎭 18 Sân Khấu Move-Sets (Genre Kits)">
                    {MOVE_SET_CATALOG.map((ms) => (
                      <option key={ms.id} value={ms.id}>
                        {ms.nameVi} {ms.defaultOverheadEmote ? `(${ms.defaultOverheadEmote})` : ''}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="⚡ 12 Universal Actions (Character Library)">
                    {Object.entries(REUSABLE_CHARACTER_ACTIONS).map(([id, act]) => (
                      <option key={id} value={id}>
                        {act.name} ({id})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            {/* 2. Góc Quay 2.5D Camera Rig */}
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Góc Máy 2.5D (Camera Rig)</span>
                <span className="text-zinc-500 font-mono">{currentScene.cameraRig}</span>
              </label>
              <select
                value={currentScene.cameraRig}
                onChange={(e) => {
                  handleUpdateCurrentScene({
                    ...currentScene,
                    cameraRig: e.target.value as any,
                  });
                }}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              >
                {CAMERA_RIG_CATALOG.map((cr) => (
                  <option key={cr.id} value={cr.id}>
                    {cr.nameVi}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Phông Nền Backdrop */}
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400">Phông Nền Sân Khấu (Backdrop)</label>
              <select
                value={currentScene.backdrop}
                onChange={(e) => {
                  handleUpdateCurrentScene({
                    ...currentScene,
                    backdrop: e.target.value as StageBackdropId,
                  });
                }}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono"
              >
                {currentKit.availableBackdrops.map((bd) => (
                  <option key={bd} value={bd}>
                    {bd}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Widget Dựng Sẵn */}
            {currentScene.widgets[0] && (
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Widget Dựng Sẵn Minh Họa</label>
                <select
                  value={currentScene.widgets[0].kind}
                  onChange={(e) => {
                    const newKind = e.target.value as BuiltInStageWidgetKind;
                    const updatedWidgets = [...currentScene.widgets];
                    updatedWidgets[0] = { ...updatedWidgets[0], kind: newKind };
                    handleUpdateCurrentScene({ ...currentScene, widgets: updatedWidgets });
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono"
                >
                  {currentKit.availableWidgets.map((wk) => (
                    <option key={wk} value={wk}>
                      {wk}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 5. Bong Bóng Thoại Nhân Vật */}
            {currentScene.actors[0] && (
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Bong Bóng Thoại Nhân Vật</label>
                <input
                  type="text"
                  value={currentScene.actors[0].speechBubbleText || ''}
                  onChange={(e) => {
                    const updatedActors = [...currentScene.actors];
                    updatedActors[0] = {
                      ...updatedActors[0],
                      speechBubbleText: e.target.value,
                    };
                    handleUpdateCurrentScene({ ...currentScene, actors: updatedActors });
                  }}
                  placeholder="Nhập câu thoại hiển thị trên đầu nhân vật..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-zinc-950/40 border border-dashed border-zinc-800 rounded-lg p-3 text-center text-zinc-500 space-y-1">
            <p className="font-semibold text-zinc-400">Chưa chọn clip Stage Puppet nào</p>
            <p className="text-[10px]">
              Bấm chọn một phân cảnh trên track <span className="font-mono text-zinc-300">Stage Puppet</span> ở Timeline dưới để chỉnh cử động, đạo cụ và góc quay theo thời gian thực!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

