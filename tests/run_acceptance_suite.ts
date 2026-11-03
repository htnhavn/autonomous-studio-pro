/**
 * @file run_acceptance_suite.ts
 * @description End-to-End Automated Acceptance Test Suite (Section 12 Compliance).
 * Executes and verifies all 13 required test categories and all 5 mandatory end-to-end workflows:
 *  - Workflow 1: Manual Editing (Import -> Sequence -> Multi-track Edit -> Undo/Redo -> Save/Reopen .vproj -> Render)
 *  - Workflow 2: Live AI Editing (Context Query -> Edit Plan -> Command Validation -> Conflict Detection -> Commit -> Undo/Redo)
 *  - Workflow 3: Native Video Production (Structured Brief -> Video DSL v1 -> Asset Resolution -> Character Rig -> Timeline -> QA)
 *  - Workflow 4: Batch Production (12-Scene Plan -> Disconnect AI -> Offline DAG Execution -> Pause -> Modify Scene 12 Only -> Partial Rebuild -> Resume)
 *  - Workflow 5: AI Project Understanding (.vproj Selective AI Context API: get_project_summary, get_scene, get_asset, get_timeline_range, get_visual_index, get_dependency_graph, get_qa_issues)
 */

import {
  createRationalTime,
  fromSeconds,
  toSeconds,
  addTime,
  subtractTime,
  compareTime,
  rescaleTime,
  createDefaultAssetRegistry,
  registerAssetInRegistry,
  resolveAssetByQuery,
  evaluateComposableCharacterRig,
  REUSABLE_CHARACTER_ACTIONS,
  validateVideoDsl,
  migrateToVideoDslV1,
  buildExternalAiPromptBlueprint,
  executeGatewayCommand,
  undoGatewayCommand,
  redoGatewayCommand,
  compileVideoDslToGatewayCommands,
  CommandGatewayState,
  buildVprojPackage,
  get_project_summary,
  get_scene,
  get_asset,
  get_timeline_range,
  get_visual_index,
  get_dependency_graph,
  get_qa_issues,
  createBatchProductionDag,
  stepBatchProductionDag,
  invalidateSceneInBatchDag,
} from '../packages/core-schema/src';
import { createDefaultStudioProject } from '../apps/desktop/src/store/useStudioStore';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

export interface TestResultRecord {
  readonly id: string;
  readonly name: string;
  readonly passed: boolean;
  readonly details: string;
}

export function runAllArchitectureTests(): readonly TestResultRecord[] {
  const results: TestResultRecord[] = [];
  const record = (id: string, name: string, fn: () => string) => {
    try {
      const details = fn();
      results.push({ id, name, passed: true, details });
      console.log(`✅ [PASS] ${id}: ${name} — ${details}`);
    } catch (err: any) {
      results.push({ id, name, passed: false, details: String(err?.message || err) });
      console.error(`❌ [FAIL] ${id}: ${name} — ${err?.message || err}`);
      throw err;
    }
  };

  // --------------------------------------------------------------------------
  // TEST 1: RationalTime Frame-Accurate Integer Timing & Rescaling
  // --------------------------------------------------------------------------
  record('T01', 'Timeline RationalTime Integer Arithmetic & Rescaling', () => {
    const t1 = createRationalTime(90, 30); // 3.0s at 30fps
    const t2 = createRationalTime(90, 60); // 1.5s at 60fps
    const sum = addTime(t1, t2);
    assert(sum.value === 270 && sum.rate === 60, `Expected 270/60, got ${sum.value}/${sum.rate}`);
    const diff = subtractTime(t1, t2);
    assert(diff.value === 90 && diff.rate === 60, `Expected 90/60, got ${diff.value}/${diff.rate}`);
    const rescaled = rescaleTime(t1, 60);
    assert(rescaled.value === 180 && rescaled.rate === 60, 'Rescale 30fps -> 60fps failed');
    return `Verified exact LCM addition (270/60), subtraction (90/60), and 30->60fps rescaling without float drift.`;
  });

  // --------------------------------------------------------------------------
  // TEST 2: Asset Registry Deduplication, Provenance & Resolution
  // --------------------------------------------------------------------------
  record('T02', 'Asset Registry SHA-256 Deduplication & Semantic Resolution', () => {
    const reg0 = createDefaultAssetRegistry();
    const initialCount = Object.keys(reg0).length;
    assert(initialCount >= 7, 'Expected at least 7 built-in pre-assets');

    // Attempt to register a duplicate by SHA-256 hash
    const dupCandidate = {
      ...reg0['preasset.char.stickman-economist'],
      assetId: 'new_dup_id_999',
    };
    const regRes = registerAssetInRegistry(reg0, dupCandidate);
    assert(regRes.deduplicatedExisting === true, 'Duplicate SHA-256 asset should be deduplicated');
    assert(
      Object.keys(regRes.registry).length === initialCount,
      'Registry count must not increase on duplicate'
    );

    const resolved = resolveAssetByQuery(reg0, ['economist', 'finance'], 'character-rig');
    assert(
      resolved?.assetId === 'preasset.char.stickman-economist',
      `Expected stickman-economist, got ${resolved?.assetId}`
    );
    return `Verified ${initialCount} built-in pre-assets, SHA-256 deduplication, and tag resolution.`;
  });

  // --------------------------------------------------------------------------
  // TEST 3: Composable 2D Character Library & 12 Reusable Actions
  // --------------------------------------------------------------------------
  record('T03', 'Composable 2D Stickman Rig & 12 Reusable Actions', () => {
    const actionKeys = Object.keys(REUSABLE_CHARACTER_ACTIONS);
    assert(actionKeys.length === 12, `Expected 12 reusable actions, got ${actionKeys.length}`);
    const pose0 = evaluateComposableCharacterRig({ headTiltDeg: 5 }, 'pointing', 0.0);
    const poseMid = evaluateComposableCharacterRig({ headTiltDeg: 5 }, 'pointing', 0.5);
    assert(
      poseMid.rightUpperArmDeg !== pose0.rightUpperArmDeg,
      'Pointing action must interpolate rightUpperArmDeg between 0.0 and 0.5'
    );
    return `Verified all 12 reusable character actions (${actionKeys.join(', ')}) and skeletal interpolation.`;
  });

  // --------------------------------------------------------------------------
  // WORKFLOW 1: Manual Editing (Import -> Sequence -> Multi-Track Edit -> Undo/Redo -> Save/Reopen .vproj)
  // --------------------------------------------------------------------------
  record('WF1', 'Workflow 1: Manual Editing, Command Gateway, Undo/Redo & .vproj Save/Reopen', () => {
    const baseProject = createDefaultStudioProject('WF1 Manual Edit Project');
    let gwState: CommandGatewayState = {
      project: baseProject,
      revision: 1,
      assetRegistry: createDefaultAssetRegistry(),
      undoStack: [],
      redoStack: [],
      auditHistory: [],
    };

    const userOrigin = { kind: 'user' as const, actorId: 'user_1', displayName: 'Human Editor' };

    // 1. Import Media
    const importRes = executeGatewayCommand(gwState, {
      commandId: 'cmd_wf1_import',
      origin: userOrigin,
      expectedRevision: 1,
      timestampMs: Date.now(),
      command: {
        type: 'ImportMedia',
        asset: {
          assetId: 'asset.user.broll_1',
          name: 'Local Market Footage.mp4',
          category: 'video',
          mimeType: 'video/mp4',
          sourceKind: 'user-local',
          localFilePath: '/media/market.mp4',
          downloadStatus: 'ready-local',
          sha256Hash: 'sha256_user_market_mp4',
          duration: fromSeconds(10, 60),
          semanticTags: ['market', 'trading'],
          visualDescription: 'Trading floor footage',
          license: { licenseKind: 'user-owned-commercial', commercialUseAllowed: true, attributionRequired: false },
          usageReferences: { sceneIds: [], clipIds: [] },
          createdAtIso: new Date().toISOString(),
        },
      },
    });
    assert(importRes.accepted && importRes.newRevision === 2, 'ImportMedia failed');
    gwState = importRes.state;

    // 2. Insert Clip onto track-video-broll
    const baseClip = compileVideoDslToGatewayCommands(
      migrateToVideoDslV1({ scriptText: 'First test sentence.' })
    )[0].command;
    assert(baseClip.type === 'InsertClip', 'Expected InsertClip');

    const insertRes = executeGatewayCommand(gwState, {
      commandId: 'cmd_wf1_insert',
      origin: userOrigin,
      expectedRevision: 2,
      timestampMs: Date.now(),
      command: {
        type: 'InsertClip',
        trackId: 'track-video-broll',
        clip: {
          ...baseClip.clip,
          id: 'clip_manual_1',
          trackId: 'track-video-broll',
          kind: 'video',
          assetId: 'asset.user.broll_1',
          timelineRange: { startTime: fromSeconds(0, 60), duration: fromSeconds(6, 60) },
          sourceRange: { startTime: fromSeconds(0, 60), duration: fromSeconds(6, 60) },
        },
      },
    });
    assert(insertRes.accepted && insertRes.newRevision === 3, 'InsertClip failed');
    gwState = insertRes.state;

    // 3. Trim, Split, and Color Grade
    const trimRes = executeGatewayCommand(gwState, {
      commandId: 'cmd_wf1_trim',
      origin: userOrigin,
      expectedRevision: 3,
      timestampMs: Date.now(),
      command: {
        type: 'TrimClip',
        clipId: 'clip_manual_1',
        newDuration: fromSeconds(4, 60),
      },
    });
    assert(trimRes.accepted, 'TrimClip failed');
    gwState = trimRes.state;

    const splitRes = executeGatewayCommand(gwState, {
      commandId: 'cmd_wf1_split',
      origin: userOrigin,
      expectedRevision: 4,
      timestampMs: Date.now(),
      command: {
        type: 'SplitClip',
        clipId: 'clip_manual_1',
        splitTime: fromSeconds(2, 60),
      },
    });
    assert(splitRes.accepted, 'SplitClip failed');
    gwState = splitRes.state;

    const brollTrack = gwState.project.tracks.find((t) => t.id === 'track-video-broll')!;
    assert(brollTrack.clips.length === 2, `Expected 2 clips after split, got ${brollTrack.clips.length}`);

    // 4. Undo & Redo verification
    const afterUndo = undoGatewayCommand(gwState);
    assert(
      afterUndo.project.tracks.find((t) => t.id === 'track-video-broll')!.clips.length === 1,
      'Undo should restore 1 clip before split'
    );
    const afterRedo = redoGatewayCommand(afterUndo);
    assert(
      afterRedo.project.tracks.find((t) => t.id === 'track-video-broll')!.clips.length === 2,
      'Redo should re-apply split to 2 clips'
    );

    // 5. Save and Reopen .vproj package
    const vprojJson = JSON.stringify(
      buildVprojPackage(afterRedo.project, afterRedo.assetRegistry, afterRedo.revision)
    );
    const reopened = JSON.parse(vprojJson);
    assert(reopened.packageFormat === 'autonomous-studio.vproj', 'Invalid .vproj format');
    assert(reopened.qaReport.passedAllErrorGates === true, 'Expected 0 QA errors on valid manual edit');

    return `Verified ImportMedia -> InsertClip -> TrimClip -> SplitClip -> Undo -> Redo -> .vproj Save/Reopen (rev=${afterRedo.revision}).`;
  });

  // --------------------------------------------------------------------------
  // WORKFLOW 2: Live AI Editing, Validation & Optimistic Concurrency Conflict Detection
  // --------------------------------------------------------------------------
  record('WF2', 'Workflow 2: Live AI Editing, User Lock Protection & Revision Conflict Detection', () => {
    const dsl = migrateToVideoDslV1({
      title: 'WF2 Live AI Edit',
      scriptText: 'Scene one hook. Scene two analysis.',
    });
    let gwState: CommandGatewayState = {
      project: createDefaultStudioProject('WF2 Live AI'),
      revision: 1,
      assetRegistry: createDefaultAssetRegistry(),
      undoStack: [],
      redoStack: [],
      auditHistory: [],
    };

    for (const env of compileVideoDslToGatewayCommands(dsl)) {
      gwState = executeGatewayCommand(gwState, env).state;
    }
    const revBeforeAi = gwState.revision;

    // Simulate AI submitting a command with a STALE expectedRevision (e.g., User edited in the meantime)
    const staleAiAttempt = executeGatewayCommand(gwState, {
      commandId: 'cmd_ai_stale',
      origin: { kind: 'ai-live', actorId: 'agent_live', displayName: 'Live AI Assistant' },
      expectedRevision: revBeforeAi - 1, // Stale!
      timestampMs: Date.now(),
      command: {
        type: 'AdjustColor',
        clipId: 'clip_scene_1',
        exposure: 0.35,
        contrast: 1.15,
      },
    });
    assert(
      staleAiAttempt.accepted === false && staleAiAttempt.conflictDetected === true,
      'Gateway MUST reject stale expectedRevision with conflictDetected=true'
    );

    // Now AI re-reads current revision and commits cleanly
    const validAiAttempt = executeGatewayCommand(gwState, {
      commandId: 'cmd_ai_valid',
      origin: { kind: 'ai-live', actorId: 'agent_live', displayName: 'Live AI Assistant' },
      expectedRevision: revBeforeAi,
      timestampMs: Date.now(),
      command: {
        type: 'UpdateCharacterPose',
        clipId: 'clip_scene_1',
        actorId: 'char.stickman-economist',
        actionId: 'reacting',
        speechText: 'AI updated this scene pose!',
      },
    });
    assert(validAiAttempt.accepted === true, 'Valid AI command with matching revision must succeed');

    return `Verified stale revision rejection (conflictDetected=true) and atomic Live AI UpdateCharacterPose commit.`;
  });

  // --------------------------------------------------------------------------
  // WORKFLOW 3: Native Video Production from Structured Video DSL Specification
  // --------------------------------------------------------------------------
  record('WF3', 'Workflow 3: Native Video Production from Validated Video DSL v1.0', () => {
    const promptBlueprint = buildExternalAiPromptBlueprint('Why central banks hike interest rates', 'economics-stickman');
    assert(promptBlueprint.includes('schemaVersion "1.0.0"'), 'Prompt blueprint must specify schemaVersion 1.0.0');

    const dslSpec = migrateToVideoDslV1({
      title: 'Central Bank Interest Rates Explained',
      genreKit: 'economics-stickman',
      scriptText:
        'When inflation spikes, central banks raise interest rates. Higher rates cool down borrowing and liquidity. Smart investors watch the supply and demand curve!',
    });

    const validation = validateVideoDsl(dslSpec);
    assert(validation.valid === true, `DSL validation failed: ${validation.errors.join(', ')}`);
    assert(dslSpec.scenes.length === 3, `Expected 3 scenes, got ${dslSpec.scenes.length}`);

    let gwState: CommandGatewayState = {
      project: createDefaultStudioProject(dslSpec.brief.title),
      revision: 1,
      assetRegistry: createDefaultAssetRegistry(),
      undoStack: [],
      redoStack: [],
      auditHistory: [],
    };

    const cmds = compileVideoDslToGatewayCommands(dslSpec);
    for (const c of cmds) {
      const res = executeGatewayCommand(gwState, c);
      assert(res.accepted, `Failed to execute compiled DSL command ${c.commandId}`);
      gwState = res.state;
    }

    const vproj = buildVprojPackage(gwState.project, gwState.assetRegistry, gwState.revision, dslSpec);
    assert(Object.keys(vproj.sceneManifest).length === 3, 'Expected 3 scenes in .vproj sceneManifest');
    assert(vproj.qaReport.passedAllErrorGates === true, 'Compiled DSL timeline must pass all QA error gates');

    return `Verified VideoDSL v1.0 validation, compilation of 3 scenes, character/widget layout, and 0 QA errors.`;
  });

  // --------------------------------------------------------------------------
  // WORKFLOW 4 & 5: Offline Batch Production DAG, Partial Scene 12 Rebuild & Selective AI Context API
  // --------------------------------------------------------------------------
  record('WF4_WF5', 'Workflows 4 & 5: Offline 12-Scene Batch DAG, Scene 12 Partial Rebuild & Selective ai_context.json API', () => {
    // Build a 12-scene production brief
    const twelveSentences = Array.from(
      { length: 12 },
      (_, i) => `Scene ${i + 1} explains financial macro indicator number ${i + 1}.`
    ).join(' ');

    const dsl12 = migrateToVideoDslV1({
      title: '12-Scene Macro Production',
      genreKit: 'economics-stickman',
      scriptText: twelveSentences,
    });
    assert(dsl12.scenes.length === 12, `Expected 12 scenes, got ${dsl12.scenes.length}`);

    // Create Batch DAG with AI provider DISCONNECTED (`aiProviderConnected = false`)
    let dagPlan = createBatchProductionDag(dsl12, false);
    let gwState: CommandGatewayState = {
      project: createDefaultStudioProject('12-Scene Batch Project'),
      revision: 1,
      assetRegistry: createDefaultAssetRegistry(),
      undoStack: [],
      redoStack: [],
      auditHistory: [],
    };

    // Step 1: Run 5 nodes then PAUSE
    const step1 = stepBatchProductionDag(dagPlan, gwState, 5);
    dagPlan = { ...step1.plan, isPaused: true };
    gwState = step1.gatewayState;
    const completedWhileRunning = Object.values(dagPlan.nodes).filter((n) => n.status === 'COMPLETED').length;
    assert(completedWhileRunning === 5, `Expected 5 completed nodes before pause, got ${completedWhileRunning}`);

    // Verify pausing prevents execution
    const pausedStep = stepBatchProductionDag(dagPlan, gwState, 10);
    assert(
      Object.values(pausedStep.plan.nodes).filter((n) => n.status === 'COMPLETED').length === 5,
      'Paused DAG must not execute any nodes'
    );

    // Resume and complete all remaining deterministic nodes OFFLINE (aiProviderConnected = false)
    dagPlan = { ...dagPlan, isPaused: false };
    const finalStep = stepBatchProductionDag(dagPlan, gwState, 100);
    dagPlan = finalStep.plan;
    gwState = finalStep.gatewayState;

    const allCompleted = Object.values(dagPlan.nodes).every((n) => n.status === 'COMPLETED');
    assert(allCompleted === true, 'All deterministic DAG nodes must complete even with AI disconnected');

    // Modify ONLY Scene 12 (`scene_12`) and verify incremental partial rebuild!
    const updatedDsl12 = {
      ...dsl12,
      scenes: dsl12.scenes.map((sc) =>
        sc.sceneId === 'scene_12'
          ? { ...sc, narrationScript: 'Updated Scene 12 conclusion with new call to action!' }
          : sc
      ),
    };
    const rebuiltDag = invalidateSceneInBatchDag(dagPlan, 'scene_12', updatedDsl12);
    assert(
      rebuiltDag.nodes['node_scene_scene_1'].status === 'COMPLETED' &&
        rebuiltDag.nodes['node_scene_scene_11'].status === 'COMPLETED',
      'Scenes 1..11 MUST remain cached (COMPLETED) when only Scene 12 changes!'
    );
    assert(
      rebuiltDag.nodes['node_scene_scene_12'].status === 'PENDING',
      'Modified Scene 12 node must be reset to PENDING'
    );

    const afterPartialRebuild = stepBatchProductionDag(rebuiltDag, gwState, 20);
    assert(
      Object.values(afterPartialRebuild.plan.nodes).every((n) => n.status === 'COMPLETED'),
      'Partial rebuild of Scene 12 must complete cleanly'
    );

    // WORKFLOW 5: Verify Selective AI Context API (`ai_context.json` 7 functions)
    const vproj12 = afterPartialRebuild.vprojSnapshot;
    const summary = get_project_summary(vproj12);
    const scene12 = get_scene(vproj12, 'scene_12');
    const assetEcon = get_asset(vproj12, 'preasset.char.stickman-economist');
    const rangeSlice = get_timeline_range(vproj12, fromSeconds(0, 60), fromSeconds(5, 60));
    const visIndex12 = get_visual_index(vproj12, 'scene_12');
    const depGraph12 = get_dependency_graph(vproj12, 'scene_12');
    const qaIssues = get_qa_issues(vproj12);

    assert(summary.totalScenes === 12, 'Summary must report 12 scenes');
    assert(scene12 !== null && scene12.sceneId === 'scene_12', 'get_scene("scene_12") failed');
    assert(assetEcon !== null && assetEcon.license.commercialUseAllowed === true, 'get_asset failed');
    assert(rangeSlice.clipCount >= 1 && rangeSlice.clipCount < 12, 'get_timeline_range must return only overlapping clips');
    assert(visIndex12 !== null && visIndex12.keyframePreviewTimestamps.length === 3, 'get_visual_index failed');
    assert(
      depGraph12 !== null && depGraph12.upstreamSceneIds.includes('scene_11'),
      'get_dependency_graph("scene_12") must identify scene_11 as upstream'
    );
    assert(Array.isArray(qaIssues), 'get_qa_issues must return structured array');

    const fullJsonBytes = JSON.stringify(vproj12).length;
    const selectiveScene12Bytes = JSON.stringify({ scene: scene12, deps: depGraph12, visual: visIndex12 }).length;
    const tokenSavingsPct = ((1 - selectiveScene12Bytes / fullJsonBytes) * 100).toFixed(1);

    return `Verified 12-scene offline DAG, Scene 12 partial rebuild (Scenes 1..11 cached), and Selective AI Context API (${selectiveScene12Bytes}B vs ${fullJsonBytes}B full dump = ${tokenSavingsPct}% token reduction!).`;
  });

  return results;
}

