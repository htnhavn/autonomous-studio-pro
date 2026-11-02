/**
 * @file useSidecarSocket.ts
 * @description Real-time Bi-directional WebSocket Client for Python AI Sidecar.
 * Ingests live Agent Ghost Cursors, Timeline Commands, Asset Flights, and VLM Critic reports.
 * Includes a Local Live Simulation Fallback so users can experience the autonomous film crew
 * even when the Python server is offline!
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { AgentCursorState, LiveAssetFlightEvent } from '../../../../packages/core-schema/src/agent-protocol';

const SIDECAR_WS_URL = 'ws://127.0.0.1:8765/ws/studio';

export interface ActiveExternalAgentInfo {
  readonly agentId: string;
  readonly displayName: string;
  readonly provider: string;
  readonly lastSeenMs: number;
}

export interface UseSidecarSocketResult {
  readonly isConnected: boolean;
  readonly activeExternalAgent: ActiveExternalAgentInfo | null;
  readonly triggerAutonomousJob: (jobPayload: Record<string, any>) => void;
}

export function useSidecarSocket(): UseSidecarSocketResult {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeExternalAgent, setActiveExternalAgent] = useState<ActiveExternalAgentInfo | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const lastProcessedSeqIdRef = useRef<number>(0);
  const isFirstPollRef = useRef<boolean>(true);

  const updateAgentCursor = useStudioStore((s) => s.updateAgentCursor);
  const removeAgentCursor = useStudioStore((s) => s.removeAgentCursor);
  const dispatchCommand = useStudioStore((s) => s.dispatchCommand);
  const addAssetFlight = useStudioStore((s) => s.addAssetFlight);
  const removeAssetFlight = useStudioStore((s) => s.removeAssetFlight);
  const setLatestCriticReport = useStudioStore((s) => s.setLatestCriticReport);
  const setAutonomousMode = useStudioStore((s) => s.setAutonomousMode);

  // 1. Establish WebSocket Connection with Auto-Reconnect
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: number;

    const connect = () => {
      try {
        ws = new WebSocket(SIDECAR_WS_URL);

        ws.onopen = () => {
          setIsConnected(true);
          console.log('[SidecarSocket] Connected to Python AI Sidecar WebSocket.');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleIncomingSidecarEvent(data);
          } catch (e) {
            console.warn('[SidecarSocket] Malformed JSON received:', e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          // Try reconnecting every 3.5 seconds
          reconnectTimeout = window.setTimeout(connect, 3500);
        };

        ws.onerror = () => {
          setIsConnected(false);
        };

        socketRef.current = ws;
      } catch (err) {
        setIsConnected(false);
        reconnectTimeout = window.setTimeout(connect, 3500);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const handleIncomingSidecarEvent = useCallback(
    (data: any) => {
      switch (data?.eventType) {
        case 'AGENT_GHOST_CURSOR':
          if (data.cursor) {
            updateAgentCursor(data.cursor);
          }
          break;

        case 'TIMELINE_COMMAND':
          if (data.envelope) {
            dispatchCommand(data.envelope);
          }
          break;

        case 'LIVE_ASSET_FLIGHT':
          if (data.flight) {
            addAssetFlight(data.flight);
            // Auto remove after flight landing animation completes (3.5s)
            setTimeout(() => {
              removeAssetFlight(data.flight.eventId);
            }, 3500);
          }
          break;

        case 'CRITIC_REPORT':
          if (data.report) {
            setLatestCriticReport(data.report);
          }
          break;

        default:
          break;
      }
    },
    [updateAgentCursor, dispatchCommand, addAssetFlight, removeAssetFlight, setLatestCriticReport]
  );

  // 2. Poll External Agent Bridge (/live-agent-bridge.json) every 350ms
  // Allows VS Code / Antigravity / Claude Code / Cursor to drive the Studio UI live!
  useEffect(() => {
    const pollInterval = window.setInterval(async () => {
      try {
        const res = await fetch(`/live-agent-bridge.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!data || typeof data.seqId !== 'number') return;

        if (isFirstPollRef.current) {
          isFirstPollRef.current = false;
          if (data.activeExternalAgent) {
            setActiveExternalAgent(data.activeExternalAgent);
          }
          if (data.seqId > 0) {
            const isFresh = Date.now() - (data.updatedAtMs || 0) < 15000;
            if (isFresh && Array.isArray(data.events)) {
              data.events.forEach((ev: any) => handleIncomingSidecarEvent(ev));
            }
            lastProcessedSeqIdRef.current = data.seqId;
          }
          return;
        }

        // Subsequent polls
        if (data.seqId > lastProcessedSeqIdRef.current) {
          if (data.activeExternalAgent) {
            setActiveExternalAgent(data.activeExternalAgent);
          }

          if (Array.isArray(data.events)) {
            const newEvents = data.events
              .filter(
                (ev: any) =>
                  ev && typeof ev.seqId === 'number' && ev.seqId > lastProcessedSeqIdRef.current
              )
              .sort((a: any, b: any) => a.seqId - b.seqId);

            newEvents.forEach((ev: any) => handleIncomingSidecarEvent(ev));
          }

          lastProcessedSeqIdRef.current = data.seqId;
        } else if (data.activeExternalAgent) {
          setActiveExternalAgent(data.activeExternalAgent);
        }
      } catch {
        // Ignore polling fetch errors
      }
    }, 350);

    return () => {
      clearInterval(pollInterval);
    };
  }, [handleIncomingSidecarEvent]);

  // 3. Trigger Autonomous Production Job
  const triggerAutonomousJob = useCallback(
    (jobPayload: Record<string, any>) => {
      setAutonomousMode('running-autonomous');

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        // Connected to Python Sidecar
        socketRef.current.send(
          JSON.stringify({
            action: 'START_AUTONOMOUS_PIPELINE',
            payload: jobPayload,
          })
        );
      } else {
        // Fallback: Local Simulation Loop (Smooth live demo without server)
        console.log('[SidecarSocket] Python Sidecar not active. Running local live simulation...');
        runLocalSimulation(
          jobPayload,
          updateAgentCursor,
          removeAgentCursor,
          dispatchCommand,
          addAssetFlight,
          removeAssetFlight,
          setLatestCriticReport,
          setAutonomousMode
        );
      }
    },
    [
      setAutonomousMode,
      updateAgentCursor,
      removeAgentCursor,
      dispatchCommand,
      addAssetFlight,
      removeAssetFlight,
      setLatestCriticReport,
    ]
  );

  return {
    isConnected,
    activeExternalAgent,
    triggerAutonomousJob,
  };
}

/**
 * Local Live Simulation Runner:
 * Emulates the 6-agent autonomous film crew with realistic timings,
 * ghost cursors, asset flights, and timeline operations.
 */
function runLocalSimulation(
  jobPayload: Record<string, any>,
  updateCursor: (c: AgentCursorState) => void,
  removeCursor: (id: string) => void,
  dispatchCmd: (e: any) => void,
  addFlight: (f: LiveAssetFlightEvent) => void,
  removeFlight: (id: string) => void,
  setReport: (r: any) => void,
  setMode: (m: any) => void
) {
  const scriptText =
    jobPayload.input?.scriptText ||
    jobPayload.input?.topicOrPrompt ||
    'AI Autonomous Video Editor 2026';
  const genreKit = jobPayload.genreKit || 'economics-stickman';

  // Step 1: Rough-Cut Agent
  setTimeout(() => {
    updateCursor({
      agentId: 'agent_roughcut_01',
      role: 'rough-cut',
      displayName: '✂️ Rough-Cut & WhisperX',
      colorHex: '#10B981',
      provider: 'local-gpu-sidecar',
      status: 'cutting',
      currentTimelineTime: { value: 0, rate: 60 },
      targetTrackId: 'track-audio-voice',
      liveActionBubble: '🎙️ WhisperX tự động chia câu & cắt khoảng lặng...',
      updatedAtMs: Date.now(),
    });
  }, 300);

  // Step 2: Director Stage Draft Compilation
  setTimeout(() => {
    updateCursor({
      agentId: 'agent_director_01',
      role: 'director',
      displayName: '🎬 Director (Showrunner)',
      colorHex: '#F59E0B',
      provider: 'google-gemini',
      status: 'thinking',
      currentTimelineTime: { value: 60, rate: 60 },
      targetTrackId: 'track-stage-1',
      liveActionBubble: `⚡ Dựng toàn bộ phân cảnh bằng Move-Set ${genreKit} (0 Token)...`,
      updatedAtMs: Date.now(),
    });

    dispatchCmd({
      commandId: `sim_compile_${Date.now()}`,
      actor: { kind: 'agent', id: 'agent_director_01', role: 'director', displayName: '🎬 Director' },
      timestampMs: Date.now(),
      reasoning: 'Auto-compiled stage scenes based on script prompt.',
      command: {
        type: 'PROJECT_COMPILE_DETERMINISTIC_STAGE',
        scriptText,
        genreKit,
        replaceExistingStageTrack: true,
      },
    });
  }, 1200);

  // Step 3: Asset Hunter & Live Asset Flight
  setTimeout(() => {
    updateCursor({
      agentId: 'agent_hunter_01',
      role: 'asset-hunter',
      displayName: '🔍 Web & B-Roll Hunter',
      colorHex: '#3B82F6',
      provider: 'google-gemini',
      status: 'searching-web',
      currentTimelineTime: { value: 180, rate: 60 },
      targetTrackId: 'track-video-broll',
      liveActionBubble: '🔍 Săn ảnh thiên văn & bài báo tin tức chất lượng cao...',
      updatedAtMs: Date.now(),
    });

    const flightId = `flight_${Date.now()}`;
    addFlight({
      eventId: flightId,
      agentId: 'agent_hunter_01',
      asset: {
        id: 'asset_web_1',
        name: 'Macro Economic Chart 2026',
        kind: 'image',
        localFilePath: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3',
        semanticTags: ['macro', 'finance', 'chart', 'data'],
        aestheticScore: 9.6,
        origin: {
          provider: 'unsplash',
          sourceUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3',
          searchQuery: 'financial growth data',
        },
      },
      targetTrackId: 'track-video-broll',
      targetStartTime: { value: 180, rate: 60 },
      searchQueryUsed: 'financial growth data',
      vlmMatchScore: 9.6,
      timestampMs: Date.now(),
    });

    setTimeout(() => removeFlight(flightId), 3500);
  }, 2400);

  // Step 4: VFX Motion Artist
  setTimeout(() => {
    updateCursor({
      agentId: 'agent_vfx_01',
      role: 'vfx-motion',
      displayName: '✨ VFX, 3D Depth & Motion Code',
      colorHex: '#EC4899',
      provider: 'anthropic-claude',
      status: 'rendering-vfx',
      currentTimelineTime: { value: 240, rate: 60 },
      targetTrackId: 'track-video-broll',
      liveActionBubble: '🎨 Áp Depth 3D Parallax & Chuyển cảnh CapCut Pro...',
      updatedAtMs: Date.now(),
    });
  }, 3600);

  // Step 5: Sound Designer & Beat-Sync
  setTimeout(() => {
    updateCursor({
      agentId: 'agent_sound_01',
      role: 'sound-designer',
      displayName: '🎧 Sound, Beat-Sync & Foley',
      colorHex: '#8B5CF6',
      provider: 'local-gpu-sidecar',
      status: 'cutting',
      currentTimelineTime: { value: 300, rate: 60 },
      targetTrackId: 'track-audio-music',
      liveActionBubble: '🎧 Librosa bắt nhịp trống & Chuẩn hóa -14 LUFS...',
      updatedAtMs: Date.now(),
    });
  }, 4800);

  // Step 6: VLM Critic & Quality Gate Pass
  setTimeout(() => {
    updateCursor({
      agentId: 'agent_critic_01',
      role: 'vlm-critic',
      displayName: '🧐 Multimodal QA Critic',
      colorHex: '#EF4444',
      provider: 'google-gemini',
      status: 'reviewing',
      currentTimelineTime: { value: 0, rate: 60 },
      liveActionBubble: '🧐 Chấm điểm 5 chiều (Pacing: 9.6, Visual: 9.4) -> ĐẠT!',
      updatedAtMs: Date.now(),
    });

    setReport({
      iteration: 1,
      overallScore: 9.4,
      subScores: {
        adherence: 0.96,
        pacing: 0.95,
        visualQuality: 0.94,
        watchability: 0.96,
        hookRetention: 9.7,
        audioMixAndSfx: 9.4,
      },
      passedQualityGate: true,
      issues: [],
      aveReviewFeedback: 'Bản dựng hoàn hảo! Nhịp cắt nhanh, người que hoạt hình sinh động, hook 3.5s giữ chân tốt.',
    });

    setMode('idle');
  }, 6000);
}
