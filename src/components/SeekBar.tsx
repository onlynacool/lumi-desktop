import React, { memo, useEffect, useRef, useState } from 'react';
import { formatTime } from '../theme';

interface SeekBarProps {
  duration: number;
  progress: number;
  onSeek: (sec: number) => void;
}

/**
 * SeekBar must live OUTSIDE App so React never sees it as a new component type
 * on re-render (timeupdate fires ~2×/sec). Defined inside App → unmounts every
 * tick → loses drag state → thumb snaps back to 0 on every drag.
 *
 * Local `display` state tracks the thumb position while dragging.
 * `dragging` ref prevents timeupdate from overwriting the thumb mid-drag.
 * `onSeek` is only called on mouseUp / touchEnd so audio only seeks once.
 */
const SeekBar = memo(({ duration, progress, onSeek }: SeekBarProps) => {
  const dragging = useRef(false);
  const [display, setDisplay] = useState(progress);

  useEffect(() => {
    if (!dragging.current) setDisplay(progress);
  }, [progress]);

  return (
    <div className="w-full flex flex-col gap-1">
      <input
        type="range"
        min={0}
        max={duration || 100}
        step={0.1}
        value={display}
        onMouseDown={() => { dragging.current = true; }}
        onTouchStart={() => { dragging.current = true; }}
        onChange={e => setDisplay(Number(e.target.value))}
        onMouseUp={e => {
          dragging.current = false;
          onSeek(Number((e.target as HTMLInputElement).value));
        }}
        onTouchEnd={e => {
          dragging.current = false;
          onSeek(Number((e.target as HTMLInputElement).value));
        }}
        className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
      />
      <div className="flex justify-between text-xs text-zinc-400 font-medium">
        <span>{formatTime(display)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
});
SeekBar.displayName = 'SeekBar';

export default SeekBar;
