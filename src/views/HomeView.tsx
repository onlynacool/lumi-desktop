import React, { useState } from 'react';
import { UploadCloud, Cloud, Trash2, Loader2, CloudOff } from 'lucide-react';
import { Playlist } from '../types';
import { ArtFallback } from '../components/ArtThumb';
import { A } from '../theme';

interface HomeViewProps {
  playlists: Playlist[];
  isProcessing: boolean;
  processStatus: string;
  onConnectFolder: () => void;
  onConnectDrive: (link: string) => Promise<void>;
  onOpenPlaylist: (pl: Playlist) => void;
  onDeletePlaylist: (pl: Playlist, e: React.MouseEvent) => void;
}

export default function HomeView({
  playlists, isProcessing, processStatus,
  onConnectFolder, onConnectDrive,
  onOpenPlaylist, onDeletePlaylist,
}: HomeViewProps) {
  const [driveLink,      setDriveLink]      = useState('');
  const [driveLoading,   setDriveLoading]   = useState(false);
  const [driveError,     setDriveError]     = useState('');

  const handleDriveConnect = async () => {
    if (!driveLink.trim()) return;
    setDriveError('');
    setDriveLoading(true);
    try {
      await onConnectDrive(driveLink.trim());
      setDriveLink('');
    } catch (err: any) {
      setDriveError(err.message ?? 'Could not connect to Drive folder.');
    } finally {
      setDriveLoading(false);
    }
  };

  const local  = playlists.filter(p => (p.source ?? 'local') === 'local');
  const online = playlists.filter(p => p.source === 'drive');

  return (
    <div className="flex-1 overflow-y-auto pb-[88px]">
      <div className="p-8">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-8">
          <img src="./logo.png" alt="Lumi" className="w-14 h-14 rounded-xl object-cover" />
          <div>
            <h1 className="text-3xl font-black leading-tight">Lumi</h1>
            <p className="text-zinc-400 text-sm">Your Music Companion.</p>
          </div>
        </div>

        {/* ── Two connect cards side-by-side ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">

          {/* Local folder */}
          <button
            onClick={onConnectFolder}
            disabled={isProcessing}
            className={`border-2 border-dashed border-zinc-700 hover:${A.border} rounded-2xl p-8 flex flex-col items-center gap-3 transition-colors text-center`}
          >
            <UploadCloud size={40} className={A.text} />
            <div>
              <p className="font-bold text-base">Local Folder</p>
              <p className="text-zinc-400 text-sm mt-1">
                {isProcessing ? processStatus : 'Connect a folder from this PC'}
              </p>
            </div>
            <p className="text-[11px] text-zinc-600">MP3 · FLAC · WAV · ALAC · OGG · hi-res</p>
          </button>

          {/* Google Drive folder */}
          <div className={`border-2 border-dashed border-zinc-700 hover:${A.border} rounded-2xl p-8 flex flex-col gap-3 transition-colors`}>
            <div className="flex items-center gap-2">
              <Cloud size={40} className={A.text} />
              <div>
                <p className="font-bold text-base">Google Drive</p>
                <p className="text-zinc-400 text-sm">Paste a public folder link</p>
              </div>
            </div>

            <input
              type="text"
              value={driveLink}
              onChange={e => { setDriveLink(e.target.value); setDriveError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleDriveConnect()}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full bg-zinc-800 text-sm text-white placeholder-zinc-600 rounded-lg px-3 py-2 outline-none border border-zinc-700 focus:border-sky-500 transition-colors"
            />

            {driveError && (
              <p className="text-red-400 text-xs flex items-center gap-1.5">
                <CloudOff size={13} /> {driveError}
              </p>
            )}

            <button
              onClick={handleDriveConnect}
              disabled={!driveLink.trim() || driveLoading}
              className={`${A.bg} text-white rounded-full px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity`}
            >
              {driveLoading ? <><Loader2 size={15} className="animate-spin" /> Connecting...</> : 'Connect Drive Folder'}
            </button>

            <p className="text-[11px] text-zinc-600 leading-relaxed">
              The folder must be set to <span className="text-zinc-400">"Anyone with the link → Viewer"</span> in Google Drive.
            </p>
          </div>
        </div>

        {/* ── Local playlists ── */}
        {local.length > 0 && (
          <PlaylistGrid
            title="Local Playlists"
            playlists={local}
            onOpen={onOpenPlaylist}
            onDelete={onDeletePlaylist}
          />
        )}

        {/* ── Drive playlists ── */}
        {online.length > 0 && (
          <PlaylistGrid
            title="Drive Playlists"
            playlists={online}
            onOpen={onOpenPlaylist}
            onDelete={onDeletePlaylist}
            isDrive
          />
        )}

        {!playlists.length && !isProcessing && !driveLoading && (
          <p className="text-zinc-500 text-sm text-center mt-6">
            No playlists yet — connect a local folder or a Drive folder above.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Shared grid component ──────────────────────────────────────────────────────
interface GridProps {
  title: string;
  playlists: Playlist[];
  isDrive?: boolean;
  onOpen: (pl: Playlist) => void;
  onDelete: (pl: Playlist, e: React.MouseEvent) => void;
}

function PlaylistGrid({ title, playlists, isDrive, onOpen, onDelete }: GridProps) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        {isDrive && <Cloud size={18} className="text-sky-400" />}
        {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {playlists.map(pl => (
          <div
            key={pl.id}
            onClick={() => onOpen(pl)}
            className="bg-zinc-900 hover:bg-zinc-800 rounded-xl p-3 cursor-pointer transition-colors group relative"
          >
            <button
              onClick={e => onDelete(pl, e)}
              className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <Trash2 size={14} />
            </button>
            <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-800 mb-3 relative">
              {pl.cover
                ? <img src={pl.cover} alt={pl.name} className="w-full h-full object-cover" />
                : <ArtFallback />}
              {isDrive && (
                <div className="absolute bottom-1.5 right-1.5 bg-black/70 rounded-full p-1">
                  <Cloud size={11} className="text-sky-400" />
                </div>
              )}
            </div>
            <p className="font-semibold text-sm truncate">{pl.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
