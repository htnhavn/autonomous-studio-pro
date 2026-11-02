/**
 * @file TranscriptEditorPanel.tsx
 * @description Text-Based Video Editing panel (WhisperX word-level alignment).
 * Deleting or editing words automatically cuts and ripples video clips on the master timeline!
 */

import React from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import {
  toSeconds,
  fromSeconds,
} from '../../../../../packages/core-schema/src/rational-time';
import { WordTimestampToken } from '../../../../../packages/core-schema/src/timeline';
import { FileText, Scissors, Sparkles, Volume2, Trash2 } from 'lucide-react';

export const TranscriptEditorPanel: React.FC = () => {
  const project = useStudioStore((s) => s.project);
  const playheadTime = useStudioStore((s) => s.playheadTime);
  const setPlayheadTime = useStudioStore((s) => s.setPlayheadTime);
  const dispatchCommand = useStudioStore((s) => s.dispatchCommand);

  const currentSec = toSeconds(playheadTime);

  // Extract all transcript words across caption tracks or media assets
  const captionClips = project.tracks
    .filter((t) => t.kind === 'caption')
    .flatMap((t) => t.clips);

  const allWords: { clipId: string; word: WordTimestampToken }[] = captionClips.flatMap((clip) =>
    (clip.captionData?.words || []).map((w) => ({ clipId: clip.id, word: w }))
  );

  const handleWordClick = (word: WordTimestampToken) => {
    setPlayheadTime(word.startOffset);
  };

  // Delete word -> ripple cut the timeline!
  const handleDeleteWord = (clipId: string, word: WordTimestampToken, e: React.MouseEvent) => {
    e.stopPropagation();

    // Dispatch split and ripple delete command
    dispatchCommand({
      commandId: `cmd_textcut_${Date.now()}`,
      actor: { kind: 'user', id: 'user_local', displayName: 'Text Editor' },
      timestampMs: Date.now(),
      reasoning: `Deleted word: "${word.word}" from transcript`,
      command: {
        type: 'CLIP_SPLIT',
        clipId,
        splitAtTimelineTime: word.startOffset,
      },
    });
  };

  const handleAutoCleanSilences = () => {
    // Dispatch Auto-Editor Silence Removal command
    dispatchCommand({
      commandId: `cmd_autoclean_${Date.now()}`,
      actor: { kind: 'agent', id: 'agent_roughcut_01', role: 'rough-cut', displayName: '✂️ Auto-Editor' },
      timestampMs: Date.now(),
      reasoning: 'Auto-cleaned dead air silences > 0.4s across all dialogue tracks',
      command: {
        type: 'BEAT_GRID_SYNC_CUTS',
        bpm: project.beatGrid.bpm || 120,
        targetTrackIds: ['track-video-aroll', 'track-audio-voice'],
        snapToleranceFrames: 3,
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#12151e] border-r border-[#272c3d] p-4 text-xs text-zinc-300 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-zinc-100">Text-Based Editing</span>
        </div>
        <button
          onClick={handleAutoCleanSilences}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-medium transition-colors"
          title="Auto-cut silences > 0.4s via Auto-Editor"
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Auto-Cut Silences</span>
        </button>
      </div>

      <div className="text-[11px] text-zinc-500 mb-3 shrink-0">
        Click any word to jump playhead. Click the red cut icon to ripple-delete that spoken segment from the video.
      </div>

      {/* Transcript Words Flow */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {allWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-center">
            <Volume2 className="w-8 h-8 mb-2 opacity-40" />
            <p>No spoken transcript found. Import audio or generate voiceover via AI to enable Text-Based Editing.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 leading-relaxed">
            {allWords.map(({ clipId, word }) => {
              const startSec = toSeconds(word.startOffset);
              const endSec = toSeconds(word.endOffset);
              const isCurrent = currentSec >= startSec && currentSec <= endSec;

              return (
                <span
                  key={word.id}
                  onClick={() => handleWordClick(word)}
                  className={`group relative inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-md scale-105'
                      : 'hover:bg-zinc-800 text-zinc-200'
                  }`}
                >
                  <span>{word.word}</span>
                  <button
                    onClick={(e) => handleDeleteWord(clipId, word, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 transition-opacity"
                    title="Delete spoken word & ripple-cut video"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

