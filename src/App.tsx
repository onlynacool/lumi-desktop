import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NacsaSong, Playlist } from './types';
import { fileToBase64 } from './theme';
import { extractFolderId, getDriveFolderName, listDriveAudioFiles } from './services/DriveService';
import HomeView         from './views/HomeView';
import PlaylistView     from './views/PlaylistView';
import NowPlayingBar    from './views/NowPlayingBar';
import FullScreenPlayer from './views/FullScreenPlayer';
import QueueSidebar     from './views/QueueSidebar';
import CatPet           from './CatPet';

type RepeatMode = 'none' | 'one' | 'all';
type SortField  = 'name' | 'date';
type SortDir    = 'asc'  | 'desc';

export default function App() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const saveTimer = useRef<any>(null);

  // Refs mirror playback state — audio callbacks read refs, never stale closures
  const queueRef        = useRef<NacsaSong[]>([]);
  const currentIdxRef   = useRef(-1);
  const shuffleOnRef    = useRef(false);
  const shuffleOrderRef = useRef<number[]>([]);
  const shufflePosRef   = useRef(0);
  const repeatModeRef   = useRef<RepeatMode>('none');

  // Playback state
  const [queue,        setQueue]        = useState<NacsaSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [shuffleOn,    setShuffleOn]    = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState<number[]>([]);
  const [repeatMode,   setRepeatMode]   = useState<RepeatMode>('none');
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [volume,       setVolume]       = useState(1);

  // UI state
  const [playlists,       setPlaylists]       = useState<Playlist[]>([]);
  const [activeView,      setActiveView]      = useState<'home' | 'playlist'>('home');
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentSongs,    setCurrentSongs]    = useState<NacsaSong[]>([]);
  const [isProcessing,    setIsProcessing]    = useState(false);
  const [processStatus,   setProcessStatus]   = useState('');
  const [isFullScreen,    setIsFullScreen]    = useState(false);
  const [showQueue,       setShowQueue]       = useState(false);
  const [isEditing,       setIsEditing]       = useState(false);
  const [editName,        setEditName]        = useState('');
  const [editCover,       setEditCover]       = useState<string | null>(null);
  const [sortField,       setSortField]       = useState<SortField>('name');
  const [sortDir,         setSortDir]         = useState<SortDir>('asc');
  const [showSortMenu,    setShowSortMenu]    = useState(false);
  const [vinylMode,       setVinylMode]       = useState(false);

  // Derived
  const currentPlayingSong: NacsaSong | null =
    currentIndex >= 0 && queue.length > 0 ? queue[currentIndex] : null;

  const sortedSongs = [...currentSongs].sort((a, b) => {
    const cmp = sortField === 'name'
      ? a.title.localeCompare(b.title)
      : (a.dateModified || 0) - (b.dateModified || 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const upNextSongs: NacsaSong[] = (() => {
    if (!queue.length) return [];
    if (shuffleOnRef.current && shuffleOrder.length)
      return shuffleOrder.slice(shufflePosRef.current + 1).map(i => queue[i]);
    return queue.slice(currentIndex + 1);
  })();

  // Ref-sync helpers
  const syncQueue  = (q: NacsaSong[]) => { queueRef.current = q;      setQueue(q); };
  const syncIndex  = (i: number)       => { currentIdxRef.current = i; setCurrentIndex(i); };
  const syncSOn    = (v: boolean)      => { shuffleOnRef.current = v;  setShuffleOn(v); };
  const syncRepeat = (m: RepeatMode)   => { repeatModeRef.current = m; setRepeatMode(m); };
  const syncOrder  = (o: number[], pos: number) => {
    shuffleOrderRef.current = o; shufflePosRef.current = pos; setShuffleOrder(o);
  };

  // [3] Debounced save of queue/currentIndex/progress → survives app restarts.
  // Reads from refs (not state) so it's always safe to call from stable
  // useCallback closures (playSong, the audio timeupdate listener) without
  // needing those callbacks to depend on — and re-create around — queue/currentIndex.
  const persistState = () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (currentIdxRef.current < 0 || !queueRef.current.length) return;
      window.nacsa.playback?.save?.({
        queue: queueRef.current,
        currentIndex: currentIdxRef.current,
        progress: audioRef.current?.currentTime ?? 0,
      });
    }, 1000);
  };

  useEffect(() => {
    (async () => {
      await loadPlaylists();

      // [3] Restore last song/queue/position — load silently, never autoplay.
      try {
        const saved = await window.nacsa.playback?.load?.();
        if (saved && Array.isArray(saved.queue) && saved.queue.length &&
            saved.currentIndex >= 0 && saved.currentIndex < saved.queue.length) {
          const song = saved.queue[saved.currentIndex];
          syncQueue(saved.queue);
          syncIndex(saved.currentIndex);
          setProgress(saved.progress || 0);

          const audio = audioRef.current;
          if (audio && song) {
            const applyRestoredPosition = () => {
              audio.currentTime = saved.progress || 0;
              audio.removeEventListener('loadedmetadata', applyRestoredPosition);
            };
            audio.addEventListener('loadedmetadata', applyRestoredPosition);
            audio.src = song.uri; // nacsa-file:// or Drive https:// — loadAndPlay isn't used, so nothing auto-plays
            audio.load();
          }
        }
      } catch (e) { console.error('Failed to restore playback state:', e); }
    })();

    // [2] Listen for taskbar thumbnail toolbar button clicks sent from main process
    (window as any).nacsa?.thumbar?.onCommand((cmd: string) => {
      if (cmd === 'prev')   advanceTrack(-1);
      if (cmd === 'next')   advanceTrack(1);
      if (cmd === 'toggle') togglePlay();
    });
  }, []);

  // Single-mount audio listener — reads refs, never stale
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime  = () => {
      setProgress(audio.currentTime);
      // [3] Persist roughly every 5s of playback, not on every timeupdate tick
      if (Math.floor(audio.currentTime) % 5 === 0) persistState();
    };
    const onMeta  = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      if (repeatModeRef.current === 'one') { audio.currentTime = 0; audio.play(); return; }
      advanceTrack(1);
    };
    audio.addEventListener('timeupdate',     onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('ended',          onEnded);
    return () => {
      audio.removeEventListener('timeupdate',     onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('ended',          onEnded);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space')                            { e.preventDefault(); togglePlay(); }
      if (e.ctrlKey && e.code === 'ArrowRight') { e.preventDefault(); advanceTrack(1); }
      if (e.ctrlKey && e.code === 'ArrowLeft')  { e.preventDefault(); advanceTrack(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  

  // ── Core playback ──────────────────────────────────────────────────────────
  const loadAndPlay = (songs: NacsaSong[], index: number) => {
    const audio = audioRef.current;
    if (!audio || index < 0 || index >= songs.length) return;
    setProgress(0); setDuration(0); setIsPlaying(false);
    audio.src = songs[index].uri;   // works for both nacsa-file:// and https:// Drive URLs
    audio.load();
    audio.play().catch(() => {
      audio.addEventListener('canplay', () => audio.play().catch(console.error), { once: true });
    });
  };

  const advanceTrack = useCallback((direction: 1 | -1) => {
    const audio = audioRef.current;
    const q = queueRef.current;
    if (!q.length) return;
    if (direction === -1 && audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    if (shuffleOnRef.current && shuffleOrderRef.current.length) {
      const newPos = shufflePosRef.current + direction;
      if (newPos < 0) { if (audio) audio.currentTime = 0; return; }
      if (newPos >= shuffleOrderRef.current.length) {
        if (repeatModeRef.current === 'all') {
          const rebuilt = buildShuffleOrder(q.length, shuffleOrderRef.current[0]);
          syncOrder(rebuilt, 0);
          const idx = rebuilt[0]; syncIndex(idx); loadAndPlay(q, idx);
        }
        return;
      }
      const idx = shuffleOrderRef.current[newPos];
      syncOrder(shuffleOrderRef.current, newPos);
      syncIndex(idx); loadAndPlay(q, idx);
    } else {
      const next = currentIdxRef.current + direction;
      if (next < 0) { if (audio) audio.currentTime = 0; return; }
      if (next >= q.length) {
        if (repeatModeRef.current === 'all') { syncIndex(0); loadAndPlay(q, 0); }
        return;
      }
      syncIndex(next); loadAndPlay(q, next);
    }
  }, []);

  // ── [1] Windows Media Session — notification controls, lock screen, media keys ──
  // Register action handlers once; they read advanceTrack/togglePlay via stable refs.

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play',          () => audioRef.current?.play().catch(console.error));
    navigator.mediaSession.setActionHandler('pause',         () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => advanceTrack(-1));
    navigator.mediaSession.setActionHandler('nexttrack',     () => advanceTrack(1));
    navigator.mediaSession.setActionHandler('seekto', details => {
      if (audioRef.current && details.seekTime != null)
        audioRef.current.currentTime = details.seekTime;
    });
  }, [advanceTrack]);

  // Update metadata (song title / artist / artwork) whenever track changes
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentPlayingSong) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   currentPlayingSong.title,
      artist:  currentPlayingSong.artist,
      album:   currentPlayingSong.album || 'Lumi',
      artwork: currentPlayingSong.cover
        ? [{ src: currentPlayingSong.cover, sizes: '512x512', type: 'image/jpeg' }]
        : [{ src: './logo.png',             sizes: '512x512', type: 'image/png'  }],
    });
    // Notify main process → update [2] taskbar thumbnail toolbar
    (window as any).nacsa?.thumbar?.update({ isPlaying, title: currentPlayingSong.title });
  }, [currentPlayingSong]);

  // Update playback state badge + thumbnail toolbar play/pause icon
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    (window as any).nacsa?.thumbar?.update({ isPlaying });
  }, [isPlaying]);

  // Keep seek position in sync so the notification scrubber works
  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(progress, duration),
      });
    } catch { /* setPositionState not available on all platforms */ }
  }, [Math.floor(progress), duration]); // floor reduces update frequency

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || currentIdxRef.current < 0) return;
    if (audio.paused) audio.play().catch(console.error); else audio.pause();
  }, []);

  const buildShuffleOrder = (length: number, startIndex: number) => {
    const arr = Array.from({ length }, (_, i) => i).filter(i => i !== startIndex);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return [startIndex, ...arr];
  };

  const playSong = useCallback((songs: NacsaSong[], index: number) => {
    syncQueue(songs); syncIndex(index);
    if (shuffleOnRef.current) syncOrder(buildShuffleOrder(songs.length, index), 0);
    else syncOrder([], 0);
    loadAndPlay(songs, index);
    persistState();
  }, []);

  const shufflePlay = useCallback((songs: NacsaSong[]) => {
    if (!songs.length) return;
    const startIdx = Math.floor(Math.random() * songs.length);
    syncSOn(true); syncQueue(songs); syncIndex(startIdx);
    syncOrder(buildShuffleOrder(songs.length, startIdx), 0);
    loadAndPlay(songs, startIdx);
  }, []);

  const handleSeek = useCallback((sec: number) => {
    if (audioRef.current) { audioRef.current.currentTime = sec; setProgress(sec); }
  }, []);

  const handleVolume = useCallback((v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const cycleRepeat = () => {
    const next: RepeatMode = repeatModeRef.current === 'none' ? 'all'
      : repeatModeRef.current === 'all' ? 'one' : 'none';
    syncRepeat(next);
  };

  const toggleShuffle = () => {
    const next = !shuffleOnRef.current;
    syncSOn(next);
    if (next && queueRef.current.length)
      syncOrder(buildShuffleOrder(queueRef.current.length, currentIdxRef.current), 0);
    else syncOrder([], 0);
  };

  // ── Playlist management ────────────────────────────────────────────────────
  const loadPlaylists = async () =>
    setPlaylists(await window.nacsa.store.getPlaylists());

  // [LOCAL] Connect a folder from disk
  const handleConnectFolder = async () => {
    try {
      setIsProcessing(true); setProcessStatus('Opening folder picker...');
      const folder = await window.nacsa.pickFolder();
      if (!folder) { setIsProcessing(false); return; }
      setProcessStatus('Reading tags & album art...');
      const { songs } = await window.nacsa.scanFolder(folder.path);
      if (!songs.length) {
        alert('No supported audio files found.'); setIsProcessing(false); return;
      }
      const pl: Playlist = {
        id: folder.path, name: folder.name || 'New Playlist',
        folderPath: folder.path, source: 'local',
        cover: songs.find(s => s.cover)?.cover ?? null, createdAt: Date.now(),
      };
      await window.nacsa.store.savePlaylist(pl);
      await window.nacsa.store.saveSongs(pl.id, songs);
      await loadPlaylists();
    } catch (e) { console.error(e); }
    setIsProcessing(false);
  };

  // [DRIVE] Connect a Google Drive public folder
  const handleConnectDrive = async (link: string) => {
    const folderId = extractFolderId(link);
    if (!folderId) throw new Error('Could not extract a folder ID from that link.');

    // Fetch folder name (also validates the link is accessible)
    const folderName = await getDriveFolderName(folderId);

    // List audio files
    const songs = await listDriveAudioFiles(folderId);
    if (!songs.length) throw new Error('No supported audio files found in that Drive folder.');

    const pl: Playlist = {
      id:           `drive:${folderId}`,
      name:          folderName,
      folderPath:   '',
      source:       'drive',
      driveFolderId: folderId,
      cover:         null,
      createdAt:     Date.now(),
    };
    await window.nacsa.store.savePlaylist(pl);
    await window.nacsa.store.saveSongs(pl.id, songs);
    await loadPlaylists();
  };

  // Rescan — handles both local and Drive playlists
  const handleRescan = async () => {
    if (!currentPlaylist) return;
    setIsProcessing(true); setProcessStatus('Refreshing...');
    try {
      if (currentPlaylist.source === 'drive' && currentPlaylist.driveFolderId) {
        const songs = await listDriveAudioFiles(currentPlaylist.driveFolderId);
        await window.nacsa.store.saveSongs(currentPlaylist.id, songs);
        setCurrentSongs(songs);
      } else {
        const { valid } = await window.nacsa.verifyFolderAccess(currentPlaylist.folderPath);
        if (!valid) { alert('Folder not found.'); setIsProcessing(false); return; }
        const { songs } = await window.nacsa.scanFolder(currentPlaylist.folderPath);
        await window.nacsa.store.saveSongs(currentPlaylist.id, songs);
        setCurrentSongs(songs);
      }
    } catch (e: any) {
      alert(`Refresh failed: ${e.message}`);
    } finally { setIsProcessing(false); }
  };

  const openPlaylist = async (pl: Playlist) => {
    setCurrentPlaylist(pl);
    setCurrentSongs(await window.nacsa.store.getSongs(pl.id));
    setActiveView('playlist');
  };

  const handleEditStart = () => {
    setIsEditing(true);
    setEditName(currentPlaylist?.name ?? '');
    setEditCover(currentPlaylist?.cover ?? null);
  };

  const handleEditSave = async () => {
    if (!currentPlaylist) return;
    const updated: Playlist = {
      ...currentPlaylist,
      name: editName.trim() || currentPlaylist.name,
      cover: editCover,
    };
    await window.nacsa.store.savePlaylist(updated);
    setCurrentPlaylist(updated);
    await loadPlaylists();
    setIsEditing(false);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setEditCover(await fileToBase64(f));
  };

  const handleDeletePlaylist = async (pl: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove "${pl.name}"?`)) return;
    await window.nacsa.store.deletePlaylist(pl.id);
    await loadPlaylists();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full bg-black text-white flex flex-col font-sans select-none">
      <audio ref={audioRef} />

      {activeView === 'home' && (
        <HomeView
          playlists={playlists}
          isProcessing={isProcessing}
          processStatus={processStatus}
          onConnectFolder={handleConnectFolder}
          onConnectDrive={handleConnectDrive}
          onOpenPlaylist={openPlaylist}
          onDeletePlaylist={handleDeletePlaylist}
        />
      )}

      {activeView === 'playlist' && currentPlaylist && (
        <PlaylistView
          currentPlaylist={currentPlaylist}
          currentSongs={currentSongs}
          sortedSongs={sortedSongs}
          currentPlayingSong={currentPlayingSong}
          isEditing={isEditing}
          editName={editName}
          editCover={editCover}
          sortField={sortField}
          sortDir={sortDir}
          showSortMenu={showSortMenu}
          onBack={() => setActiveView('home')}
          onRefresh={handleRescan}
          onPlayAll={() => sortedSongs.length && playSong(sortedSongs, 0)}
          onShufflePlay={() => shufflePlay(sortedSongs)}
          onPlaySong={playSong}
          onEditStart={handleEditStart}
          onEditNameChange={setEditName}
          onEditSave={handleEditSave}
          onEditCancel={() => { setIsEditing(false); setEditCover(null); }}
          onCoverUpload={handleCoverUpload}
          onSortChange={(f, d) => { setSortField(f); setSortDir(d); setShowSortMenu(false); }}
          onToggleSortMenu={e => { e.stopPropagation(); setShowSortMenu(v => !v); }}
          onCloseSortMenu={() => setShowSortMenu(false)}
        />
      )}

      {currentPlayingSong && (
        <NowPlayingBar
          song={currentPlayingSong}
          isPlaying={isPlaying}
          progress={progress}
          duration={duration}
          volume={volume}
          showQueue={showQueue}
          onExpandPlayer={() => setIsFullScreen(true)}
          onTogglePlay={togglePlay}
          onPrev={() => advanceTrack(-1)}
          onNext={() => advanceTrack(1)}
          onSeekClick={ratio => handleSeek(ratio * duration)}
          onVolumeChange={handleVolume}
          onToggleQueue={() => setShowQueue(v => !v)}
        />
      )}

      <FullScreenPlayer
        isOpen={isFullScreen}
        song={currentPlayingSong}
        playlist={currentPlaylist}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        volume={volume}
        shuffleOn={shuffleOn}
        repeatMode={repeatMode}
        vinylMode={vinylMode}
        onClose={() => setIsFullScreen(false)}
        onTogglePlay={togglePlay}
        onPrev={() => advanceTrack(-1)}
        onNext={() => advanceTrack(1)}
        onSeek={handleSeek}
        onVolumeChange={handleVolume}
        onToggleShuffle={toggleShuffle}
        onCycleRepeat={cycleRepeat}
        onToggleVinyl={() => setVinylMode(v => !v)}
      />

      <QueueSidebar
        isOpen={showQueue}
        queue={queue}
        upNext={upNextSongs}
        currentSong={currentPlayingSong}
        onClose={() => setShowQueue(false)}
        onPlaySong={playSong}
      />

      <CatPet />
    </div>
  );
}
