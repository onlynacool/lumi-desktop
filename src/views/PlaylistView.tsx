import React from 'react';
import { Play, Shuffle, ChevronLeft, Edit2, Image as ImageIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { NacsaSong, Playlist } from '../types';
import { ArtFallback, ArtThumb } from '../components/ArtThumb';
import { A, formatTime } from '../theme';

type SortField = 'name' | 'date';
type SortDir   = 'asc'  | 'desc';

interface PlaylistViewProps {
  currentPlaylist: Playlist;
  currentSongs: NacsaSong[];
  sortedSongs: NacsaSong[];
  currentPlayingSong: NacsaSong | null;
  isEditing: boolean;
  editName: string;
  editCover: string | null;
  sortField: SortField;
  sortDir: SortDir;
  showSortMenu: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onPlayAll: () => void;
  onShufflePlay: () => void;
  onPlaySong: (songs: NacsaSong[], index: number) => void;
  onEditStart: () => void;
  onEditNameChange: (name: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSortChange: (field: SortField, dir: SortDir) => void;
  onToggleSortMenu: (e: React.MouseEvent) => void;
  onCloseSortMenu: () => void;
}

export default function PlaylistView({
  currentPlaylist, currentSongs, sortedSongs, currentPlayingSong,
  isEditing, editName, sortField, sortDir, showSortMenu,
  onBack, onRefresh, onPlayAll, onShufflePlay, onPlaySong,
  onEditStart, onEditNameChange, onEditSave, onEditCancel,
  onCoverUpload, onSortChange, onToggleSortMenu, onCloseSortMenu,
}: PlaylistViewProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Fixed header ── */}
      <div className="flex-shrink-0" onClick={() => showSortMenu && onCloseSortMenu()}>

        <div className="flex items-center gap-3 p-6">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full">
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={onRefresh}
            className="ml-auto text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500 rounded-full px-3 py-1.5"
          >
            Refresh
          </button>
        </div>

        <div className="px-8 pb-6 flex flex-col md:flex-row items-center md:items-end gap-6">
          {/* Cover art */}
          <div className="w-44 h-44 md:w-56 md:h-56 rounded-lg overflow-hidden bg-zinc-800 shadow-2xl flex-shrink-0 relative">
            {currentPlaylist.cover
              ? <img src={currentPlaylist.cover} alt="" className="w-full h-full object-cover" />
              : <ArtFallback />}
            {isEditing && (
              <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 cursor-pointer">
                <ImageIcon size={28} />
                <span className="text-xs font-semibold">Choose photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={onCoverUpload} />
              </label>
            )}
          </div>

          {/* Title / edit */}
          <div className="flex-1 text-center md:text-left w-full">
            {isEditing ? (
              <div className="flex flex-col gap-3">
                <input
                  value={editName}
                  onChange={e => onEditNameChange(e.target.value)}
                  className="bg-zinc-800 text-3xl font-black rounded-md px-3 py-2 w-full outline-none"
                />
                <div className="flex gap-2">
                  <button onClick={onEditSave} className={`${A.bg} text-white px-4 py-1.5 rounded-full font-bold text-sm`}>Save</button>
                  <button onClick={onEditCancel} className="border border-zinc-500 px-4 py-1.5 rounded-full font-bold text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <h1
                onClick={onEditStart}
                className="text-3xl md:text-5xl font-black mb-2 cursor-pointer hover:underline flex items-center gap-2"
              >
                {currentPlaylist.name}
                <Edit2 size={18} className="text-zinc-500" />
              </h1>
            )}
            <p className="text-zinc-400 text-sm mt-2">
              {currentSongs.length} songs · {currentPlaylist.source === 'drive' ? '☁️ Cloud Playlist' : 'Saved on this PC'}
            </p>
          </div>
        </div>

        {/* Action bar: Play, Shuffle, Sort */}
        <div className="px-8 pb-6 flex items-center gap-4 flex-wrap">
          <button
            onClick={onPlayAll}
            className={`w-14 h-14 ${A.bg} rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl`}
          >
            <Play size={28} className="text-white ml-1" fill="currentColor" />
          </button>

          <button
            onClick={onShufflePlay}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-full font-semibold text-sm transition-colors"
          >
            <Shuffle size={18} className={A.text} /> Shuffle Play
          </button>

          {/* Sort dropdown */}
          <div className="relative ml-auto">
            <button
              onClick={onToggleSortMenu}
              className="flex items-center gap-2 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-full px-4 py-2 text-sm"
            >
              {sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              {sortField === 'name' ? 'Name' : 'Date'}
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-10 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 w-48 overflow-hidden">
                {([
                  ['name', 'asc',  'Name A → Z'],
                  ['name', 'desc', 'Name Z → A'],
                  ['date', 'desc', 'Date (Newest)'],
                  ['date', 'asc',  'Date (Oldest)'],
                ] as [SortField, SortDir, string][]).map(([f, d, label]) => (
                  <button
                    key={label}
                    onClick={() => onSortChange(f, d)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-zinc-800 flex items-center justify-between ${sortField === f && sortDir === d ? A.text : 'text-white'}`}
                  >
                    {label}
                    {sortField === f && sortDir === d && <div className={`w-2 h-2 rounded-full ${A.bg}`} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ── End fixed header ── */}

      {/* ── Scrollable song list ── */}
      <div
        className="flex-1 overflow-y-auto pb-[88px] px-6"
        onClick={() => showSortMenu && onCloseSortMenu()}
      >
        {sortedSongs.map((song, index) => {
          const isCurrent = currentPlayingSong?.id === song.id;
          return (
            <div
              key={song.id}
              onClick={() => onPlaySong(sortedSongs, index)}
              className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer hover:bg-white/10 ${isCurrent ? 'bg-white/10' : ''}`}
            >
              <ArtThumb cover={song.cover} className="w-11 h-11 rounded" />
              <div className="truncate flex-1">
                <p className={`font-medium truncate text-sm ${isCurrent ? A.text : 'text-white'}`}>
                  {song.title}
                </p>
                <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
              </div>
              {song.sampleRate && song.sampleRate > 44100 && (
                <span className={`text-[9px] uppercase ${A.text} font-bold border ${A.borderFaded} rounded px-1.5 py-0.5`}>
                  Hi-Res
                </span>
              )}
              <span className="text-[10px] uppercase text-zinc-600 font-bold w-10 text-right">
                {song.format}
              </span>
              <span className="text-xs text-zinc-500 w-10 text-right">
                {formatTime(song.durationMs / 1000)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
