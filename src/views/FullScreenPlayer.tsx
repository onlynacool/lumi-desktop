import React from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  ChevronDown, Shuffle, Repeat, Repeat1, Volume2, Disc3,
} from 'lucide-react';
import { NacsaSong, Playlist } from '../types';
import { ArtFallback } from '../components/ArtThumb';
import SeekBar from '../components/SeekBar';
import VinylRecord from '../components/VinylRecord';
import { A } from '../theme';

type RepeatMode = 'none' | 'one' | 'all';

interface FullScreenPlayerProps {
  isOpen: boolean;
  song: NacsaSong | null;
  playlist: Playlist | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  shuffleOn: boolean;
  repeatMode: RepeatMode;
  vinylMode: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (sec: number) => void;
  onVolumeChange: (v: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleVinyl: () => void;
}

export default function FullScreenPlayer({
  isOpen, song, playlist, isPlaying, progress, duration,
  volume, shuffleOn, repeatMode, vinylMode,
  onClose, onTogglePlay, onPrev, onNext, onSeek,
  onVolumeChange, onToggleShuffle, onCycleRepeat, onToggleVinyl,
}: FullScreenPlayerProps) {
  return (
    <div
      className={`fixed inset-0 bg-gradient-to-b from-[#0d1b4b] to-black z-50 flex flex-col transition-transform duration-300 ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-6">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
          <ChevronDown size={28} />
        </button>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">NOW PLAYING FROM</p>
          <p className="text-sm font-semibold truncate max-w-[240px]">{playlist?.name}</p>
        </div>
        <button
          onClick={onToggleVinyl}
          title={vinylMode ? 'Switch to cover art' : 'Switch to vinyl'}
          className={`p-2 rounded-full transition-colors ${
            vinylMode ? `${A.text} ${A.activeBg}` : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Disc3 size={22} />
        </button>
      </div>

      {song && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 max-w-md mx-auto w-full">

          {/* Art / Vinyl */}
          <div className="w-full aspect-square mb-8 shadow-2xl">
            {vinylMode
              ? <VinylRecord cover={song.cover} isPlaying={isPlaying} />
              : (
                <div className="w-full h-full rounded-xl overflow-hidden bg-zinc-800">
                  {song.cover
                    ? <img src={song.cover} alt="" className="w-full h-full object-cover" />
                    : <ArtFallback />}
                </div>
              )}
          </div>

          {/* Song info */}
          <div className="w-full mb-5">
            <h2 className="text-2xl font-bold truncate">{song.title}</h2>
            <p className="text-lg text-zinc-400 truncate">{song.artist}</p>
            {song.sampleRate && (
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">
                {song.format} · {song.sampleRate / 1000}kHz
                {song.bitsPerSample ? ` · ${song.bitsPerSample}-bit` : ''}
              </p>
            )}
          </div>

          {/* Seek bar */}
          <div className="w-full mb-5">
            <SeekBar duration={duration} progress={progress} onSeek={onSeek} />
          </div>

          {/* Transport + shuffle/repeat */}
          <div className="w-full flex justify-between items-center px-4 mb-6">
            <button
              onClick={onToggleShuffle}
              className={`transition-colors ${shuffleOn ? A.text : 'text-zinc-400 hover:text-white'}`}
            >
              <Shuffle size={24} />
            </button>
            <button onClick={onPrev} className="hover:scale-105 transition-transform">
              <SkipBack size={36} fill="currentColor" />
            </button>
            <button
              onClick={onTogglePlay}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
            >
              {isPlaying
                ? <Pause size={32} className="text-black" fill="currentColor" />
                : <Play  size={32} className="text-black ml-2" fill="currentColor" />}
            </button>
            <button onClick={onNext} className="hover:scale-105 transition-transform">
              <SkipForward size={36} fill="currentColor" />
            </button>
            <button
              onClick={onCycleRepeat}
              className={`transition-colors ${repeatMode !== 'none' ? A.text : 'text-zinc-400 hover:text-white'}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={24} /> : <Repeat size={24} />}
            </button>
          </div>

          {/* Volume */}
          <div className="w-full flex items-center gap-3 px-4">
            <Volume2 size={16} className="text-zinc-400" />
            <input
              type="range" min={0} max={1} step={0.01} value={volume}
              onChange={e => onVolumeChange(Number(e.target.value))}
              className="flex-1 accent-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
