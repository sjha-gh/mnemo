"use client";

import { Mic, Square, Trash2, Play, Pause } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DisplayClip {
  id: string;
  name: string;
  durationSec: number;
  /** present only for clips recorded this session */
  url?: string;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ClipRow({
  clip,
  onRemove,
}: {
  clip: DisplayClip;
  onRemove: (id: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play();
  }

  const total = clip.durationSec;
  const timeLabel =
    playing || currentTime > 0
      ? `${formatDuration(currentTime)} / ${formatDuration(total)}`
      : formatDuration(total);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <button
        type="button"
        onClick={toggle}
        disabled={!clip.url}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20",
          !clip.url && "cursor-not-allowed opacity-40 hover:bg-primary/10",
        )}
        aria-label={playing ? "Pause clip" : "Play clip"}
      >
        {playing ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4 translate-x-px" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {clip.name}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Voice memo · {timeLabel}
        </p>
      </div>
      {clip.url && (
        <audio
          ref={audioRef}
          src={clip.url}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={() => {
            setPlaying(false);
            setCurrentTime(0);
          }}
          className="hidden"
        />
      )}
      <button
        type="button"
        onClick={() => onRemove(clip.id)}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label="Remove clip"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function AudioAttachments({
  clips,
  isRecording,
  elapsed,
  onToggleRecord,
  onRemove,
}: {
  clips: DisplayClip[];
  isRecording: boolean;
  elapsed: number;
  onToggleRecord: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Voice memos</h3>
        <button
          type="button"
          onClick={onToggleRecord}
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            isRecording
              ? "bg-destructive/10 text-destructive"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
          )}
        >
          {isRecording ? (
            <>
              <Square className="size-3.5 fill-current" />
              Stop · {formatDuration(elapsed)}
            </>
          ) : (
            <>
              <Mic className="size-3.5" />
              Record
            </>
          )}
        </button>
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
          </span>
          <span className="text-sm text-foreground">
            Recording… {formatDuration(elapsed)}
          </span>
        </div>
      )}

      {clips.length > 0 && (
        <div className="flex flex-col gap-2">
          {clips.map((clip) => (
            <ClipRow key={clip.id} clip={clip} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  );
}
