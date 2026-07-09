import React from 'react';
import { X } from 'lucide-react';
import { NacsaSong } from '../types';
import { ArtThumb } from '../components/ArtThumb';
import { A } from '../theme';

interface QueueSidebarProps {
  isOpen: boolean;
  queue: NacsaSong[];
  upNext: NacsaSong[];
  currentSong: NacsaSong | null;
  onClose: () => void;
  onPlaySong: (songs: NacsaSong[], index: number) => void;
}

export default function QueueSidebar({
  isOpen, queue, upNext, currentSong, onClose, onPlaySong,
}: QueueSidebarProps) {
  return (
    <>
      {/* Sidebar panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-[#121212] border-l border-zinc-800 z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="font-bold text-lg">Queue</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-[88px]">
          {queue.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center mt-12 px-6">
              No queue yet — play a song to start.
            </p>
          ) : (
            <>
              {/* Now Playing */}
              {currentSong && (
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs uppercase text-zinc-500 font-bold tracking-wider mb-2">Now Playing</p>
                  <div className="flex items-center gap-3 p-2 rounded-md bg-white/5">
                    <ArtThumb cover={currentSong.cover} className="w-10 h-10 rounded" />
                    <div className="truncate flex-1">
                      <p className={`text-sm font-semibold truncate ${A.text}`}>{currentSong.title}</p>
                      <p className="text-xs text-zinc-400 truncate">{currentSong.artist}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Up Next */}
              {upNext.length > 0 && (
                <div className="px-4 pt-2">
                  <p className="text-xs uppercase text-zinc-500 font-bold tracking-wider mb-2">Up Next</p>
                  {upNext.map((song, i) => (
                    <div
                      key={`${song.id}-${i}`}
                      onClick={() => {
                        const idx = queue.indexOf(song);
                        if (idx >= 0) onPlaySong(queue, idx);
                      }}
                      className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-white/10 mb-1"
                    >
                      <ArtThumb cover={song.cover} className="w-10 h-10 rounded" />
                      <div className="truncate flex-1">
                        <p className="text-sm truncate">{song.title}</p>
                        <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Click-outside backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={onClose} />
      )}
    </>
  );
}
