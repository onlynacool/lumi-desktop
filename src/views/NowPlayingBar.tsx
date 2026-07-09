import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, ListMusic } from 'lucide-react';
import { NacsaSong } from '../types';
import { ArtThumb } from '../components/ArtThumb';
import { A } from '../theme';

interface NowPlayingBarProps {
  song: NacsaSong;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  showQueue: boolean;
  onExpandPlayer: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeekClick: (ratio: number) => void;
  onVolumeChange: (v: number) => void;
  onToggleQueue: () => void;
}

export default function NowPlayingBar({
  song, isPlaying, progress, duration, volume, showQueue,
  onExpandPlayer, onTogglePlay, onPrev, onNext,
  onSeekClick, onVolumeChange, onToggleQueue,
}: NowPlayingBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#181818] border-t border-zinc-800 z-40">
      {/* Thin click-to-seek progress line */}
      <div
        className="h-0.5 bg-zinc-800 cursor-pointer"
        onClick={e => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          onSeekClick((e.clientX - rect.left) / rect.width);
        }}
      >
        <div
          className={`h-full ${A.bg}`}
          style={{ width: `${(progress / duration) * 100 || 0}%` }}
        />
      </div>

      <div className="flex items-center px-5 h-[76px]">
        {/* Song info — click to expand full-screen */}
        <div
          className="flex items-center gap-3 flex-1 overflow-hidden cursor-pointer"
          onClick={onExpandPlayer}
        >
          <ArtThumb cover={song.cover} className="w-12 h-12 rounded-md" />
          <div className="truncate">
            <h4 className="text-sm font-semibold truncate">{song.title}</h4>
            <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
          </div>
        </div>

        {/* Transport controls */}
        <div className="flex items-center gap-4">
          <button onClick={onPrev} className={A.hoverText}>
            <SkipBack size={20} fill="currentColor" />
          </button>
          <button
            onClick={onTogglePlay}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying
              ? <Pause size={18} className="text-black" fill="currentColor" />
              : <Play  size={18} className="text-black ml-0.5" fill="currentColor" />}
          </button>
          <button onClick={onNext} className={A.hoverText}>
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>

        {/* Volume + queue toggle */}
        <div className="flex items-center gap-3 ml-6">
          <Volume2 size={16} className="text-zinc-400" />
          <input
            type="range" min={0} max={1} step={0.01} value={volume}
            onChange={e => onVolumeChange(Number(e.target.value))}
            className="w-24 accent-white"
          />
          <button
            onClick={onToggleQueue}
            title="Queue"
            className={`ml-2 p-2 rounded-full transition-colors ${
              showQueue
                ? `${A.text} ${A.activeBg}`
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <ListMusic size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
