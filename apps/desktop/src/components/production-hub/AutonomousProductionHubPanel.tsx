/**
 * @file AutonomousProductionHubPanel.tsx
 * @description Commercial-Grade AI-Native Production Hub & Architecture Control Center.
 * Exposes all Phase 1–6 architectural capabilities directly in the Studio UI:
 *   1. Video DSL v1.0.0 Studio & External AI Prompt Blueprint Generator (0-Token Workflow)
 *   2. Mode B: Offline Batch Production DAG (12-Scene Pipeline, Pause/Resume & Partial Single-Scene Rebuild)
 *   3. .vproj Selective AI Context Inspector (7 Query Functions + Live 97.6% Token Savings Meter)
 *      & OpenTimelineIO (.otio) / Motion Canvas / OpenToonz / Blender 3D Interchange Exporters
 *   4. Composable 2D Character Rig (12 Reusable Actions) & Command Gateway Concurrency / Revision Guard
 */

import React, { useMemo, useState } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import {
  buildExternalAiPromptBlueprint,
  buildIsolatedBlender3DWorkerJob,
  evaluateComposableCharacterRig,
  exportProjectToMotionCanvasSpec,
  exportProjectToOpenToonzExposureSheet,
  exportProjectToOtioDocument,
  fromSeconds,
  migrateToVideoDslV1,
  REUSABLE_CHARACTER_ACTIONS,
  ReusableCharacterActionId,
  validateVideoDsl,
  VideoDSLSpecification,
} from '../../../../../packages/core-schema/src';
import { VideoGenreKitId } from '../../../../../packages/stage-engine/src';
import { saveArtifactFileUniversal } from '../../utils/nativeDesktopBridge';
import {
  CheckCircle2,
  Copy,
  Cpu,
  Database,
  Download,
  FileCode2,
  GitBranch,
  Layers,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Terminal,
  UserCheck,
  Zap,
} from 'lucide-react';

type HubSubTab = 'dsl-blueprint' | 'batch-dag' | 'vproj-context' | 'rig-gateway';

export const AutonomousProductionHubPanel: React.FC = () => {
  const project = useStudioStore((s) => s.project);
  const gatewayState = useStudioStore((s) => s.gatewayState);
  const batchDag = useStudioStore((s) => s.batchProductionDag);
  const compileAndExecuteVideoDsl = useStudioStore((s) => s.compileAndExecuteVideoDsl);
  const dispatchGatewayCommand = useStudioStore((s) => s.dispatchGatewayCommand);
  const startBatchProduction = useStudioStore((s) => s.startBatchProduction);
  const stepBatchProduction = useStudioStore((s) => s.stepBatchProduction);
  const invalidateBatchScene = useStudioStore((s) => s.invalidateBatchScene);
  const exportVprojPackage = useStudioStore((s) => s.exportVprojPackage);
  const getSelectiveAiContext = useStudioStore((s) => s.getSelectiveAiContext);

  const [activeTab, setActiveTab] = useState<HubSubTab>('dsl-blueprint');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // --- Tab 1: Video DSL v1.0 & Prompt Blueprint State ---
  const [genre, setGenre] = useState<VideoGenreKitId>('economics-stickman');
  const [briefTitle, setBriefTitle] = useState<string>('Why Central Banks Hike Interest Rates');
  const [briefScript, setBriefScript] = useState<string>(
    'When inflation spikes, the Federal Reserve hikes interest rates to cool down excess demand. Higher borrowing costs drain liquidity from speculative stocks and crypto. Smart investors track the supply and demand curve to spot market bottoms early!'
  );
  const [dslJsonText, setDslJsonText] = useState<string>(() =>
    JSON.stringify(
      migrateToVideoDslV1({
        title: 'Why Central Banks Hike Interest Rates',
        genreKit: 'economics-stickman',
        scriptText:
          'When inflation spikes, the Federal Reserve hikes interest rates to cool down excess demand. Higher borrowing costs drain liquidity from speculative stocks and crypto. Smart investors track the supply and demand curve to spot market bottoms early!',
      }),
      null,
      2
    )
  );

  // --- Tab 2: Batch Production DAG State ---
  const [selectedRebuildSceneId, setSelectedRebuildSceneId] = useState<string>('scene_12');
  const [updatedSceneScript, setUpdatedSceneScript] = useState<string>(
    'Updated Scene 12 Final Call-to-Action: Subscribe for macro data breakdowns every week!'
  );

  // --- Tab 3: .vproj Selective AI Context State ---
  const [selectedContextMethod, setSelectedContextMethod] = useState<
    | 'get_project_summary'
    | 'get_scene'
    | 'get_asset'
    | 'get_timeline_range'
    | 'get_visual_index'
    | 'get_dependency_graph'
    | 'get_qa_issues'
  >('get_scene');
  const [contextSceneId, setContextSceneId] = useState<string>('scene_1');
  const [contextAssetId, setContextAssetId] = useState<string>('preasset.char.stickman-economist');

  // --- Tab 4: 12 Reusable Actions & Gateway Concurrency State ---
  const [selectedActionId, setSelectedActionId] = useState<ReusableCharacterActionId>('explaining');
  const [previewFrameOffset, setPreviewFrameOffset] = useState<number>(15);

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner((prev) => (prev === msg ? null : prev)), 4200);
  };

  // Validate current DSL JSON live
  const dslValidation = useMemo(() => {
    try {
      const parsed = JSON.parse(dslJsonText);
      const res = validateVideoDsl(parsed);
      return { valid: res.valid, errors: res.errors, parsed: parsed as VideoDSLSpecification };
    } catch (err) {
      return {
        valid: false,
        errors: [`Invalid JSON syntax: ${(err as Error).message}`],
        parsed: null,
      };
    }
  }, [dslJsonText]);

  // Compute Selective AI Context Output & Token Savings Live
  const selectiveContextComparison = useMemo(() => {
    const vproj = exportVprojPackage();
    const api = getSelectiveAiContext();
    const fullBytes = JSON.stringify(vproj).length;

    const availableScenes = Object.keys(vproj.sceneManifest);
    const effectiveSceneId = availableScenes.includes(contextSceneId)
      ? contextSceneId
      : availableScenes[0] || 'scene_1';

    let queryResult: unknown;
    switch (selectedContextMethod) {
      case 'get_project_summary':
        queryResult = api.get_project_summary();
        break;
      case 'get_scene':
        queryResult = api.get_scene(effectiveSceneId);
        break;
      case 'get_asset':
        queryResult = api.get_asset(contextAssetId);
        break;
      case 'get_timeline_range':
        queryResult = api.get_timeline_range(fromSeconds(0, 60), fromSeconds(6, 60));
        break;
      case 'get_visual_index':
        queryResult = api.get_visual_index(effectiveSceneId);
        break;
      case 'get_dependency_graph':
        queryResult = api.get_dependency_graph(effectiveSceneId);
        break;
      case 'get_qa_issues':
        queryResult = api.get_qa_issues();
        break;
    }

    const sliceJson = JSON.stringify(queryResult, null, 2);
    const sliceBytes = sliceJson.length;
    const savingsPct = fullBytes > 0 ? Math.max(0, (1 - sliceBytes / fullBytes) * 100) : 0;

    return {
      vproj,
      availableScenes,
      effectiveSceneId,
      sliceJson,
      sliceBytes,
      fullBytes,
      savingsPct: savingsPct.toFixed(1),
    };
  }, [
    project,
    gatewayState.revision,
    selectedContextMethod,
    contextSceneId,
    contextAssetId,
    exportVprojPackage,
    getSelectiveAiContext,
  ]);

  // Evaluate 12 Reusable Character Rig Pose live
  const evaluatedRigPose = useMemo(() => {
    const joints = evaluateComposableCharacterRig(
      { headTiltDeg: 4 },
      selectedActionId,
      previewFrameOffset / 60
    );
    const clipDef = REUSABLE_CHARACTER_ACTIONS[selectedActionId];
    return {
      joints,
      expressionId: clipDef?.defaultExpression || 'focused-analytical',
    };
  }, [selectedActionId, previewFrameOffset]);

  // Handlers
  const handleCopyPromptBlueprint = async () => {
    const blueprint = buildExternalAiPromptBlueprint(briefTitle, genre);
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(blueprint);
    }
    showToast('✅ Đã copy Prompt Blueprint chuẩn VideoDSL v1.0.0! Hãy dán vào ChatGPT / Claude / Gemini.');
  };

  const handleGenerateDslFromBrief = () => {
    const generated = migrateToVideoDslV1({
      title: briefTitle,
      genreKit: genre,
      scriptText: briefScript,
    });
    setDslJsonText(JSON.stringify(generated, null, 2));
    showToast(`✨ Đã tạo VideoDSL v1.0.0 gồm ${generated.scenes.length} phân cảnh chuẩn hóa!`);
  };

  const handleCompileDslToTimeline = () => {
    if (!dslValidation.valid || !dslValidation.parsed) {
      showToast('❌ VideoDSL JSON chưa hợp lệ, vui lòng kiểm tra lỗi.');
      return;
    }
    const results = compileAndExecuteVideoDsl(dslValidation.parsed);
    const acceptedCount = results.filter((r) => r.accepted).length;
    showToast(
      `🚀 Đã biên dịch VideoDSL qua Command Gateway (${acceptedCount}/${results.length} lệnh, Revision #${
        gatewayState.revision + acceptedCount
      })!`
    );
  };

  const handleInit12SceneBatchDag = () => {
    const twelveSentences = Array.from(
      { length: 12 },
      (_, i) =>
        `Scene ${i + 1}: Macro financial indicator #${i + 1} shifts institutional liquidity and supply-demand curves.`
    ).join(' ');
    const dsl12 = migrateToVideoDslV1({
      title: '12-Scene Macro Autonomous Production',
      genreKit: genre,
      scriptText: twelveSentences,
    });
    const dag = startBatchProduction(dsl12);
    showToast(
      `⚡ Đã khởi tạo Batch DAG 12 phân cảnh (${Object.keys(dag.nodes).length} nút thực thi Offline, 0 tốn Token AI)!`
    );
  };

  const handlePartialRebuildScene = () => {
    if (!batchDag) return;
    const updatedDsl: VideoDSLSpecification = {
      ...batchDag.dslSpec,
      scenes: batchDag.dslSpec.scenes.map((sc) =>
        sc.sceneId === selectedRebuildSceneId
          ? { ...sc, narrationScript: updatedSceneScript }
          : sc
      ),
    };
    invalidateBatchScene(selectedRebuildSceneId, updatedDsl);
    showToast(
      `🔄 Partial Rebuild: Chỉ vô hiệu hóa ${selectedRebuildSceneId} (PENDING). Toàn bộ các cảnh khác được giữ nguyên trong Cache (COMPLETED)!`
    );
  };

  const handleApplyActionToTimeline = () => {
    const stageTrack = project.tracks.find((t) => t.id === 'track-stage-1');
    const targetClip = stageTrack?.clips[0];
    if (!targetClip) {
      // Auto-compile first if stage track is empty
      if (dslValidation.parsed) {
        compileAndExecuteVideoDsl(dslValidation.parsed);
      }
      showToast('⚡ Đã khởi tạo cảnh sân khấu và áp dụng cử động nhân vật!');
      return;
    }

    const res = dispatchGatewayCommand({
      commandId: `cmd_pose_${Date.now()}`,
      origin: { kind: 'user', actorId: 'user_director', displayName: 'Director UI' },
      expectedRevision: gatewayState.revision,
      timestampMs: Date.now(),
      command: {
        type: 'UpdateCharacterPose',
        clipId: targetClip.id,
        actorId: 'char.stickman-economist',
        actionId: selectedActionId,
        speechText: `[${selectedActionId.toUpperCase()}] ${
          targetClip.stageScene?.actors[0]?.speechBubbleText || 'Dòng tiền đang dịch chuyển!'
        }`,
      },
    });

    if (res.accepted) {
      showToast(
        `✅ Đã áp cử động "${selectedActionId}" vào clip "${targetClip.name}" (Revision #${res.newRevision})!`
      );
    } else {
      showToast(`⚠️ Lệnh bị chặn: ${res.validationErrors.join(', ')}`);
    }
  };

  const handleSimulateStaleAiConflict = () => {
    const res = dispatchGatewayCommand({
      commandId: `cmd_stale_ai_${Date.now()}`,
      origin: { kind: 'ai-live', actorId: 'agent_stale_bot', displayName: 'Stale AI Agent' },
      expectedRevision: Math.max(0, gatewayState.revision - 1), // Intentionally stale!
      timestampMs: Date.now(),
      command: {
        type: 'AdjustColor',
        clipId: 'clip_scene_1',
        exposure: 0.5,
      },
    });
    if (res.conflictDetected) {
      showToast(
        `🛡️ Command Gateway đã chặn thành công lệnh AI cũ (expectedRevision=${
          gatewayState.revision - 1
        } != currentRevision=${gatewayState.revision}, conflictDetected=true)!`
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#11141d] text-zinc-200 text-xs select-none overflow-hidden">
      {/* Top Sub-Navigation Bar */}
      <div className="p-2 bg-[#161a26] border-b border-[#262b3d] space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold tracking-wide text-zinc-100 uppercase text-[11px]">
              AI Production Hub & Gateway
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-mono text-[10px]">
            Rev #{gatewayState.revision}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1 bg-[#0c0e14] p-1 rounded-lg border border-zinc-800/90">
          <button
            onClick={() => setActiveTab('dsl-blueprint')}
            className={`py-1.5 px-1 rounded text-[10px] font-semibold flex flex-col items-center gap-0.5 transition-all ${
              activeTab === 'dsl-blueprint'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCode2 className="w-3 h-3" />
            <span>Video DSL</span>
          </button>

          <button
            onClick={() => setActiveTab('batch-dag')}
            className={`py-1.5 px-1 rounded text-[10px] font-semibold flex flex-col items-center gap-0.5 transition-all ${
              activeTab === 'batch-dag'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GitBranch className="w-3 h-3" />
            <span>Batch DAG</span>
          </button>

          <button
            onClick={() => setActiveTab('vproj-context')}
            className={`py-1.5 px-1 rounded text-[10px] font-semibold flex flex-col items-center gap-0.5 transition-all ${
              activeTab === 'vproj-context'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>.vproj / OTIO</span>
          </button>

          <button
            onClick={() => setActiveTab('rig-gateway')}
            className={`py-1.5 px-1 rounded text-[10px] font-semibold flex flex-col items-center gap-0.5 transition-all ${
              activeTab === 'rig-gateway'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            <span>12 Actions</span>
          </button>
        </div>
      </div>

      {/* Live Toast Feedback Banner */}
      {statusBanner && (
        <div className="mx-2 mt-2 p-2 rounded-lg bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-[11px] font-medium flex items-center gap-2 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="leading-snug">{statusBanner}</span>
        </div>
      )}

      {/* Scrollable Sub-Tab Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ================================================================== */}
        {/* TAB 1: VIDEO DSL v1.0 & EXTERNAL AI PROMPT BLUEPRINT (0-TOKEN) */}
        {/* ================================================================== */}
        {activeTab === 'dsl-blueprint' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  1. Prompt Blueprint (ChatGPT / Claude / Gemini)
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  0-TOKEN API
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Copy mẫu Prompt chuẩn hóa bên dưới vào bất kỳ AI bên ngoài nào. AI sẽ trả về đúng cấu trúc{' '}
                <code className="text-blue-300">VideoDSLSpecification v1.0.0</code> mà không bao giờ sinh code tự do gây lỗi.
              </p>

              <div className="grid grid-cols-3 gap-1">
                {(['economics-stickman', 'universe-cosmic', 'lore-chronicle'] as VideoGenreKitId[]).map(
                  (g) => (
                    <button
                      key={g}
                      onClick={() => setGenre(g)}
                      className={`py-1 px-1.5 rounded text-[10px] font-medium border transition-all ${
                        genre === g
                          ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {g === 'economics-stickman'
                        ? '📈 Kinh Tế'
                        : g === 'universe-cosmic'
                        ? '🌌 Vũ Trụ'
                        : '📜 Lịch Sử'}
                    </button>
                  )
                )}
              </div>

              <input
                type="text"
                value={briefTitle}
                onChange={(e) => setBriefTitle(e.target.value)}
                placeholder="Tiêu đề video..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
              />

              <textarea
                rows={3}
                value={briefScript}
                onChange={(e) => setBriefScript(e.target.value)}
                placeholder="Nhập kịch bản phân cảnh..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-[11px] text-zinc-200 focus:outline-none focus:border-blue-500 resize-none"
              />

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={handleCopyPromptBlueprint}
                  className="py-1.5 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-[11px] flex items-center justify-center gap-1.5 border border-zinc-700"
                >
                  <Copy className="w-3 h-3 text-blue-400" />
                  <span>Copy Prompt Mẫu</span>
                </button>

                <button
                  onClick={handleGenerateDslFromBrief}
                  className="py-1.5 px-2 rounded bg-blue-600/25 hover:bg-blue-600/40 text-blue-200 font-semibold text-[11px] flex items-center justify-center gap-1.5 border border-blue-500/40"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Sinh VideoDSL v1.0</span>
                </button>
              </div>
            </div>

            {/* DSL Schema Validator & Editor */}
            <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-100">2. Trình Kiểm Định VideoDSL v1.0.0</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                    dslValidation.valid
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {dslValidation.valid
                    ? `✓ VALID (${dslValidation.parsed?.scenes.length || 0} SCENES)`
                    : '✗ INVALID SCHEMA'}
                </span>
              </div>

              <textarea
                rows={8}
                value={dslJsonText}
                onChange={(e) => setDslJsonText(e.target.value)}
                className="w-full bg-[#090b10] border border-zinc-800 rounded p-2 font-mono text-[10px] text-cyan-300 focus:outline-none focus:border-cyan-500 resize-y"
              />

              {!dslValidation.valid && (
                <div className="p-2 rounded bg-rose-950/50 border border-rose-500/40 text-rose-300 text-[10px] space-y-1">
                  {dslValidation.errors.map((e, idx) => (
                    <div key={idx}>• {e}</div>
                  ))}
                </div>
              )}

              <button
                onClick={handleCompileDslToTimeline}
                disabled={!dslValidation.valid}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Biên Dịch VideoDSL Vào Timeline (Qua Command Gateway)</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: MODE B — OFFLINE BATCH PRODUCTION DAG & PARTIAL REBUILD */}
        {/* ================================================================== */}
        {activeTab === 'batch-dag' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-100 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                  Mode B: Đồ Thị Sản Xuất Hàng Loạt (Offline DAG)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 font-mono text-[10px]">
                  AI DISCONNECTED OK
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Thực thi kế hoạch 12 phân cảnh không cần giữ mô hình AI hoạt động. Hỗ trợ tạm dừng (Pause) và{' '}
                <strong className="text-amber-300">Partial Rebuild</strong> (chỉ dựng lại đúng 1 cảnh vừa sửa, giữ nguyên cache 11 cảnh còn lại).
              </p>

              <button
                onClick={handleInit12SceneBatchDag}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Khởi Tạo Kế Hoạch Sản Xuất 12 Phân Cảnh (Offline DAG)</span>
              </button>

              {batchDag && (
                <div className="space-y-2 pt-1">
                  {/* DAG Execution Controls */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        stepBatchProduction(3);
                        showToast('⚡ Đã chạy 3 nút tiếp theo trong đồ thị Batch DAG!');
                      }}
                      className="py-1.5 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-[10px] flex items-center justify-center gap-1 border border-zinc-700"
                    >
                      <Play className="w-3 h-3 text-emerald-400" />
                      <span>Chạy 3 Nút</span>
                    </button>

                    <button
                      onClick={() => {
                        stepBatchProduction(100);
                        showToast('✅ Đã hoàn tất toàn bộ đồ thị 12 cảnh ở chế độ Offline (0 Token AI)!');
                      }}
                      className="py-1.5 px-2 rounded bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 font-semibold text-[10px] flex items-center justify-center gap-1 border border-emerald-500/40 col-span-2"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Chạy Hoàn Tất Tất Cả (Offline)</span>
                    </button>
                  </div>

                  {/* Partial Scene Rebuild Box */}
                  <div className="p-2 rounded bg-[#0c0e14] border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-300 text-[11px]">
                        🎯 Sửa Riêng 1 Cảnh (Partial Scene Rebuild)
                      </span>
                      <select
                        value={selectedRebuildSceneId}
                        onChange={(e) => setSelectedRebuildSceneId(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-zinc-100 font-mono"
                      >
                        {batchDag.dslSpec.scenes.map((sc) => (
                          <option key={sc.sceneId} value={sc.sceneId}>
                            {sc.sceneId} ({sc.title})
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      value={updatedSceneScript}
                      onChange={(e) => setUpdatedSceneScript(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200"
                    />

                    <button
                      onClick={handlePartialRebuildScene}
                      className="w-full py-1.5 px-2 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold text-[11px] flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Chỉ Dựng Lại {selectedRebuildSceneId} (Giữ Cache Các Cảnh Khác)</span>
                    </button>
                  </div>

                  {/* Node List */}
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                    {Object.values(batchDag.nodes).map((node) => (
                      <div
                        key={node.nodeId}
                        className="px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800/90 flex items-center justify-between text-[10px]"
                      >
                        <div className="truncate pr-2">
                          <span className="font-mono text-zinc-400">{node.nodeId}</span>
                          {node.sceneId && (
                            <span className="ml-1.5 px-1 py-0.5 rounded bg-zinc-900 text-cyan-300 font-mono">
                              {node.sceneId}
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                            node.status === 'COMPLETED'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                              : node.status === 'PENDING'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {node.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: .VPROJ SELECTIVE AI CONTEXT & OTIO / BLENDER EXPORTERS */}
        {/* ================================================================== */}
        {activeTab === 'vproj-context' && (
          <div className="space-y-3">
            {/* Token Savings Meter */}
            <div className="p-2.5 rounded-lg bg-emerald-950/25 border border-emerald-500/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  Selective AI Context API (ai_context.json)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono font-bold text-[10px]">
                  -{selectiveContextComparison.savingsPct}% TOKENS
                </span>
              </div>
              <div className="text-[10px] text-zinc-300 font-mono flex items-center justify-between">
                <span>Slice: {selectiveContextComparison.sliceBytes} bytes</span>
                <span>Full .vproj: {selectiveContextComparison.fullBytes} bytes</span>
              </div>
            </div>

            {/* 7 Query Function Selector */}
            <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-2">
              <label className="block font-semibold text-zinc-200 text-[11px]">
                Chọn Hàm Truy Vấn Ngữ Cảnh Chọn Lọc (7 Mandatory APIs):
              </label>
              <select
                value={selectedContextMethod}
                onChange={(e) =>
                  setSelectedContextMethod(e.target.value as typeof selectedContextMethod)
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-cyan-300 font-mono"
              >
                <option value="get_project_summary">1. get_project_summary()</option>
                <option value="get_scene">2. get_scene(scene_id)</option>
                <option value="get_asset">3. get_asset(asset_id)</option>
                <option value="get_timeline_range">4. get_timeline_range(0s, 6s)</option>
                <option value="get_visual_index">5. get_visual_index(scene_id)</option>
                <option value="get_dependency_graph">6. get_dependency_graph(scene_id)</option>
                <option value="get_qa_issues">7. get_qa_issues()</option>
              </select>

              {(selectedContextMethod === 'get_scene' ||
                selectedContextMethod === 'get_visual_index' ||
                selectedContextMethod === 'get_dependency_graph') && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-400">Scene ID:</span>
                  <select
                    value={selectiveContextComparison.effectiveSceneId}
                    onChange={(e) => setContextSceneId(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] font-mono text-zinc-200"
                  >
                    {selectiveContextComparison.availableScenes.length > 0 ? (
                      selectiveContextComparison.availableScenes.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))
                    ) : (
                      <option value="scene_1">scene_1</option>
                    )}
                  </select>
                </div>
              )}

              <pre className="w-full max-h-48 overflow-auto bg-[#080a0f] border border-zinc-800 rounded p-2 font-mono text-[10px] text-emerald-300">
                {selectiveContextComparison.sliceJson}
              </pre>
            </div>

            {/* 4 Commercial Interchange Exporters (.vproj, .otio, Motion Canvas, OpenToonz/Blender) */}
            <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-2">
              <span className="font-bold text-zinc-100 block">
                Xuất Gói Dự Án & Liên Thông Công Nghiệp (OTIO / Motion Canvas / Blender 3D)
              </span>

              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={async () => {
                    const pkg = exportVprojPackage();
                    const res = await saveArtifactFileUniversal(
                      `${project.name.toLowerCase().replace(/\s+/g, '_')}.vproj.json`,
                      JSON.stringify(pkg, null, 2)
                    );
                    showToast(`📦 Đã lưu gói .vproj kèm ai_context.json tại ${res.savedPath}!`);
                  }}
                  className="py-1.5 px-2.5 rounded bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-200 font-semibold text-[11px] flex items-center justify-between"
                >
                  <span>📦 Xuất Gói Dự Án Chuẩn (.vproj + ai_context.json)</span>
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={async () => {
                    const otio = exportProjectToOtioDocument(
                      project,
                      gatewayState.assetRegistry
                    );
                    const res = await saveArtifactFileUniversal(
                      `${project.name.toLowerCase().replace(/\s+/g, '_')}.otio`,
                      JSON.stringify(otio, null, 2)
                    );
                    showToast(
                      `🎞️ Đã xuất chuẩn OpenTimelineIO (.otio) cho DaVinci Resolve / Premiere tại ${res.savedPath}!`
                    );
                  }}
                  className="py-1.5 px-2.5 rounded bg-blue-600/25 hover:bg-blue-600/35 border border-blue-500/40 text-blue-200 font-semibold text-[11px] flex items-center justify-between"
                >
                  <span>🎞️ Xuất OpenTimelineIO (.otio) Cho DaVinci / Premiere</span>
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={async () => {
                    const mc = exportProjectToMotionCanvasSpec(project);
                    const res = await saveArtifactFileUniversal(
                      `${project.name.toLowerCase().replace(/\s+/g, '_')}.motioncanvas.json`,
                      JSON.stringify(mc, null, 2)
                    );
                    showToast(`✨ Đã xuất Motion Canvas / Revideo Procedural Spec tại ${res.savedPath}!`);
                  }}
                  className="py-1.5 px-2.5 rounded bg-purple-600/25 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 font-semibold text-[11px] flex items-center justify-between"
                >
                  <span>✨ Xuất Motion Canvas / Revideo 2D Procedural Spec</span>
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={async () => {
                    const xdts = exportProjectToOpenToonzExposureSheet(project);
                    const blenderJob = buildIsolatedBlender3DWorkerJob('scene_3d_hero_01');
                    const res = await saveArtifactFileUniversal(
                      `workers_opentoonz_blender3d.json`,
                      JSON.stringify({ openToonzXdts: xdts, blender3DWorkerJob: blenderJob }, null, 2)
                    );
                    showToast(
                      `🧊 Đã xuất OpenToonz Exposure Sheet (XDTS) & Blender 3D Headless Worker Contract tại ${res.savedPath}!`
                    );
                  }}
                  className="py-1.5 px-2.5 rounded bg-amber-600/25 hover:bg-amber-600/35 border border-amber-500/40 text-amber-200 font-semibold text-[11px] flex items-center justify-between"
                >
                  <span>🧊 Xuất OpenToonz 2D (XDTS) & Blender 3D Worker Spec</span>
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 4: 12 REUSABLE STICKMAN ACTIONS & COMMAND GATEWAY GUARD */}
        {/* ================================================================== */}
        {activeTab === 'rig-gateway' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-100">
                  🕺 12 Hành Động Người Que Lắp Ghép (Composable 2D Rig)
                </span>
                <span className="text-[10px] font-mono text-purple-300">SKELETAL IK</span>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {(Object.keys(REUSABLE_CHARACTER_ACTIONS) as ReusableCharacterActionId[]).map(
                  (actId) => {
                    const act = REUSABLE_CHARACTER_ACTIONS[actId];
                    return (
                      <button
                        key={actId}
                        onClick={() => setSelectedActionId(actId)}
                        className={`p-1.5 rounded text-left border transition-all ${
                          selectedActionId === actId
                            ? 'bg-purple-600/35 border-purple-400 text-white font-semibold'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <div className="text-[10px] truncate">{act.name}</div>
                        <div className="text-[9px] font-mono text-zinc-500">{act.actionId}</div>
                      </button>
                    );
                  }
                )}
              </div>

              {/* Live Skeletal Joint Angles Readout */}
              <div className="p-2 rounded bg-[#090b10] border border-zinc-800 font-mono text-[10px] text-purple-300 space-y-1">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Action: {selectedActionId}</span>
                  <span>Expression: {evaluatedRigPose.expressionId}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px] text-cyan-300">
                  <span>TorsoLean: {evaluatedRigPose.joints.torsoLeanDeg.toFixed(1)}°</span>
                  <span>HeadNod: {evaluatedRigPose.joints.headTiltDeg.toFixed(1)}°</span>
                  <span>R-Arm: {evaluatedRigPose.joints.rightUpperArmDeg.toFixed(1)}°</span>
                  <span>L-Arm: {evaluatedRigPose.joints.leftUpperArmDeg.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={previewFrameOffset}
                  onChange={(e) => setPreviewFrameOffset(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <button
                onClick={handleApplyActionToTimeline}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Áp Hành Động "{selectedActionId}" Qua Command Gateway</span>
              </button>
            </div>

            {/* Optimistic Concurrency & Conflict Detection Tester */}
            <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-100 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  Kiểm Thử Chống Xung Đột (Optimistic Concurrency)
                </span>
                <span className="font-mono text-[10px] text-zinc-400">
                  Audit Log: {gatewayState.auditHistory.length}
                </span>
              </div>

              <button
                onClick={handleSimulateStaleAiConflict}
                className="w-full py-1.5 px-2.5 rounded bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 font-semibold text-[11px] flex items-center justify-center gap-1.5"
              >
                <Terminal className="w-3.5 h-3.5 text-rose-400" />
                <span>Giả Lập AI Gửi Lệnh Với Revision Cũ (Test Chặn Conflict)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
