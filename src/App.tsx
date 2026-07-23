import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, Edit2,
  ChevronDown, Music, Image as ImageIcon,
  Shuffle, Repeat, UploadCloud, ChevronLeft, Trash2, ListMusic, Cloud, Monitor, Search, X
} from 'lucide-react';
import { LumiAudio, LumiSong } from './types';
import { store, Playlist } from './store';
import CatPet from './CatPet';
import { GOOGLE_DRIVE_API_KEY } from './driveConfig';

const formatTime = (ms: number) => {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// --- SUB-COMPONENTS ---

const getDefaultArt = (id: string | undefined, list: string[]) => {
  if (!id || list.length === 0) return list[0] || '/logo.png';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return list[Math.abs(hash) % list.length];
};

const ArtThumb = ({ cover, songId, defaultArts, className = "w-full h-full", alt = "" }: { cover: string | null, songId?: string, defaultArts: string[], className?: string, alt?: string }) => {
  const fallback = getDefaultArt(songId, defaultArts);
  return (
    <img
      src={cover || fallback}
      alt={alt}
      className={`object-cover ${className}`}
      onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
    />
  );
};

export default function App() {
  const [defaultArts, setDefaultArts] = useState<string[]>(['/logo.png']);

  useEffect(() => {
    const discover = async () => {
      try {
        // Reads the real folder contents from disk (via the main process) instead of
        // probing a fixed "default-art-N.ext" naming pattern — so any mix of file
        // names/extensions (gif, png, jpg, jpeg, webp) is picked up, not just the ones
        // that happen to match a strict sequence.
        const { files } = await window.lumiAPI.listDefaultArt();
        // Relative to index.html's location so this also resolves correctly in a
        // packaged (file://) build, not just the Vite dev server.
        const base = import.meta.env.BASE_URL;
        const found = files.map((f) => `${base}default%20album/${encodeURIComponent(f)}`);
        console.log('Discovered default arts in "default album":', found);
        if (found.length > 0) setDefaultArts(found);
      } catch (err) {
        console.warn('Failed to load default album art', err);
      }
    };
    discover();
  }, []);

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeView, setActiveView] = useState<'home' | 'playlist'>('home');
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentSongs, setCurrentSongs] = useState<LumiSong[]>([]);
  const [sortOrder, setSortOrder] = useState<{ field: 'name' | 'date'; direction: 'asc' | 'desc' }>({ field: 'name', direction: 'asc' });
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [playlistScroll, setPlaylistScroll] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [driveUrl, setDriveUrl] = useState('');

  const [queue, setQueue] = useState<LumiSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState(2);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isVinylMode, setIsVinylMode] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCover, setEditCover] = useState<string | null>(null);
  const [currentCover, setCurrentCover] = useState<string | null>(null);

  // Refs for back button logic
  const lastBackPress = useRef<number>(0);
  const activeViewRef = useRef(activeView);
  const isFullScreenRef = useRef(isFullScreen);
  const isQueueOpenRef = useRef(isQueueOpen);

  useEffect(() => { activeViewRef.current = activeView; }, [activeView]);
  useEffect(() => { isFullScreenRef.current = isFullScreen; }, [isFullScreen]);
  useEffect(() => { isQueueOpenRef.current = isQueueOpen; }, [isQueueOpen]);

  // Use refs to handle state updates inside listeners without stale closures
  const currentIndexRef = useRef(currentIndex);
  const queueRef = useRef(queue);

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  const currentPlayingSong = currentIndex >= 0 ? queue[currentIndex] : null;

  const BRAND_TEXT = "text-cyan-400";
  const BRAND_BG = "bg-cyan-500";
  const BRAND_HOVER_BORDER = "hover:border-cyan-400";

  const sortedSongs = useMemo(() => {
    return [...currentSongs].sort((a, b) => {
      if (sortOrder.field === 'name') {
        const valA = a.title.toLowerCase();
        const valB = b.title.toLowerCase();
        return sortOrder.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortOrder.field === 'date') {
        const valA = a.dateModified || 0;
        const valB = b.dateModified || 0;
        return sortOrder.direction === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [currentSongs, sortOrder]);

  const [songSearchQuery, setSongSearchQuery] = useState('');

  const filteredSongs = useMemo(() => {
    const q = songSearchQuery.trim().toLowerCase();
    if (!q) return sortedSongs;
    return sortedSongs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
  }, [sortedSongs, songSearchQuery]);

  // Clear the search box whenever a different playlist is opened.
  useEffect(() => { setSongSearchQuery(''); }, [currentPlaylist?.id]);

  useEffect(() => {
    if (currentPlayingSong) {
      if (!currentPlayingSong.cover && !currentPlayingSong.isRemote) {
        LumiAudio.getArtwork({ uri: currentPlayingSong.uri }).then(res => {
          if (res.cover) setCurrentCover(res.cover);
          else setCurrentCover(null);
        });
      } else {
        setCurrentCover(currentPlayingSong.cover);
      }
    } else {
      setCurrentCover(null);
    }
  }, [currentPlayingSong]);

  useEffect(() => {
    loadPlaylists();

    // Load last session on startup ONLY IF current queue is empty
    store.getLastSession().then(session => {
      if (session && session.queue.length > 0 && queueRef.current.length === 0) {
        setQueue(session.queue);
        setCurrentIndex(session.currentIndex);
        LumiAudio.setPlaylist({
          songs: session.queue,
          index: session.currentIndex,
          autoPlay: false
        });
      }
    });

    const statusListener = LumiAudio.addListener('playbackStatus', (data) => {
      setIsPlaying(data.isPlaying);
      setProgress(data.positionMs);
      setDuration(data.durationMs);

      if (data.currentIndex !== -1 && data.currentIndex !== currentIndexRef.current) {
        const currentSongInService = queueRef.current[data.currentIndex];
        if (currentSongInService) {
           setCurrentIndex(data.currentIndex);
        }
      }
      setShuffleMode(data.shuffleMode);
      setRepeatMode(data.repeatMode);
    });

    const endedListener = LumiAudio.addListener('trackEnded', () => LumiAudio.next());
    const nextListener  = LumiAudio.addListener('remoteNext',  () => LumiAudio.next());
    const prevListener  = LumiAudio.addListener('remotePrev',  () => LumiAudio.previous());

    return () => {
      statusListener.then(l => l.remove());
      endedListener.then(l => l.remove());
      nextListener.then(l => l.remove());
      prevListener.then(l => l.remove());
    };
  }, []);

  // Persist session changes
  useEffect(() => {
    if (queue.length > 0 && currentIndex >= 0) {
      store.saveLastSession(queue, currentIndex);
    }
  }, [queue, currentIndex]);

  const loadPlaylists = async () => {
    const data = await store.getAllPlaylists();
    setPlaylists(data);
  };

  const handleConnectFolder = async () => {
    try {
      setIsProcessing(true);
      setProcessStatus('Opening folder picker...');
      const folder = await LumiAudio.pickFolder();
      setProcessStatus('Scanning for audio files...');
      const { songs } = await LumiAudio.scanFolder({ uri: folder.uri });
      if (songs.length === 0) {
        alert('No supported audio files found in that folder.');
        setIsProcessing(false);
        return;
      }
      const playlist: Playlist = {
        id: folder.uri,
        name: folder.name || 'New Playlist',
        folderUri: folder.uri,
        cover: songs.find(s => s.cover)?.cover ?? null,
        createdAt: Date.now(),
        type: 'local'
      };
      await store.savePlaylist(playlist);
      await store.saveSongs(playlist.id, songs);
      await loadPlaylists();
      setIsProcessing(false);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const fetchAllDriveFiles = async (folderId: string) => {
    let allFiles: any[] = [];
    let nextPageToken = "";
    do {
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=nextPageToken,files(id,name,mimeType,modifiedTime,size)&pageSize=1000&key=${GOOGLE_DRIVE_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      allFiles = [...allFiles, ...data.files];
      nextPageToken = data.nextPageToken || "";
    } while (nextPageToken);
    return allFiles;
  };

  const handleConnectDrive = async () => {
    if (!driveUrl) return alert('Please paste a Drive folder link');
    const match = driveUrl.match(/[-\w]{25,}/);
    const folderId = match ? match[0] : null;
    if (!folderId) return alert('Invalid Drive folder link');
    try {
      setIsProcessing(true);
      setProcessStatus('Connecting to Drive...');
      const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?key=${GOOGLE_DRIVE_API_KEY}`);
      const folderData = await folderRes.json();
      if (folderData.error) throw new Error(folderData.error.message);
      setProcessStatus('Fetching all songs...');
      const allFiles = await fetchAllDriveFiles(folderId);
      const audioFiles = allFiles.filter((f: any) => f.mimeType.startsWith('audio/'));
      if (audioFiles.length === 0) {
        alert('No audio files found in that Drive folder.');
        setIsProcessing(false);
        return;
      }
      const songs: LumiSong[] = audioFiles.map((f: any) => ({
        id: f.id,
        uri: `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${GOOGLE_DRIVE_API_KEY}`,
        title: f.name.replace(/\.[^/.]+$/, ""),
        artist: "Lumi ~ cloud stream",
        album: folderData.name,
        cover: null,
        durationMs: 0,
        dateModified: new Date(f.modifiedTime).getTime(),
        format: f.name.split('.').pop() || 'mp3',
        isRemote: true
      }));
      const playlist: Playlist = {
        id: folderId,
        name: folderData.name,
        folderUri: driveUrl,
        cover: null,
        createdAt: Date.now(),
        type: 'drive'
      };
      await store.savePlaylist(playlist);
      await store.saveSongs(playlist.id, songs);
      await loadPlaylists();
      setDriveUrl('');
      setIsProcessing(false);
    } catch (e: any) {
      alert(`Drive Error: ${e.message}`);
      setIsProcessing(false);
    }
  };

  const rescanPlaylist = async (playlist: Playlist) => {
    setIsProcessing(true);
    setProcessStatus('Refreshing...');
    try {
      if (playlist.type === 'drive') {
        const match = playlist.folderUri.match(/[-\w]{25,}/);
        const folderId = match ? match[0] : null;
        if (!folderId) throw new Error("Invalid link");
        const allFiles = await fetchAllDriveFiles(folderId);
        const songs: LumiSong[] = allFiles.filter((f: any) => f.mimeType.startsWith('audio/')).map((f: any) => ({
          id: f.id,
          uri: `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${GOOGLE_DRIVE_API_KEY}`,
          title: f.name.replace(/\.[^/.]+$/, ""),
          artist: "Lumi ~ cloud stream",
          album: playlist.name,
          cover: null,
          durationMs: 0,
          dateModified: new Date(f.modifiedTime).getTime(),
          format: f.name.split('.').pop() || 'mp3',
          isRemote: true
        }));
        await store.saveSongs(playlist.id, songs);
        if (currentPlaylist?.id === playlist.id) setCurrentSongs(songs);
      } else {
        const { valid } = await LumiAudio.verifyFolderAccess({ uri: playlist.folderUri });
        if (!valid) return alert('Access lost. Please reconnect folder.');
        const { songs } = await LumiAudio.scanFolder({ uri: playlist.folderUri });
        await store.saveSongs(playlist.id, songs);
        if (currentPlaylist?.id === playlist.id) setCurrentSongs(songs);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const openPlaylist = async (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    const songs = await store.getSongs(playlist.id);
    setCurrentSongs(songs);
    setActiveView('playlist');
  };

  const saveEdits = async () => {
    if (!currentPlaylist) return;
    const updated: Playlist = { ...currentPlaylist, name: editName.trim() || currentPlaylist.name, cover: editCover };
    await store.savePlaylist(updated);
    setCurrentPlaylist(updated);
    await loadPlaylists();
    setIsEditing(false);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditCover(await fileToBase64(file));
  };

  const deletePlaylist = async (playlist: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove "${playlist.name}"?`)) return;
    await store.deletePlaylist(playlist.id);
    await loadPlaylists();
  };

  const playSong = useCallback(async (songs: LumiSong[], index: number) => {
    setQueue(songs);
    setCurrentIndex(index);
    await LumiAudio.setPlaylist({ songs, index, autoPlay: true });
  }, []);

  const togglePlay = async () => {
    if (currentIndex === -1) return;
    if (isPlaying) await LumiAudio.pause();
    else await LumiAudio.resume();
  };

  const toggleRepeat = async () => {
    let nextMode = 0;
    if (repeatMode === 0) nextMode = 2;
    else if (repeatMode === 2) nextMode = 1;
    else if (repeatMode === 1) nextMode = 0;
    await LumiAudio.setRepeat({ mode: nextMode });
  };

  // Ref to store the sequential/original queue when shuffle is activated
  const originalQueueRef = useRef<LumiSong[]>([]);

  const toggleShuffle = async () => {
    const newMode = !shuffleMode;

    if (currentIndex === -1 || queue.length === 0) {
      // Nothing playing yet — just flip the mode, nothing to reorder.
      setShuffleMode(newMode);
      await LumiAudio.setShuffle({ enabled: newMode });
      return;
    }

    if (newMode) {
      // Turning shuffle ON: the current song (and everything at/before it) stays
      // exactly where it is — only the "Next Up" portion gets randomized.
      originalQueueRef.current = queue;
      const upcoming = queue.slice(currentIndex + 1);
      const shuffledUpcoming = [...upcoming].sort(() => Math.random() - 0.5);
      const newQueue = [...queue.slice(0, currentIndex + 1), ...shuffledUpcoming];
      setQueue(newQueue);
      await LumiAudio.updateQueue({ songs: newQueue, index: currentIndex });
    } else {
      // Turning shuffle OFF: revert to the playlist's active sort order
      // (A-Z / Z-A / newest / oldest — whatever sortedSongs currently reflects),
      // then re-locate the currently playing song inside it so playback
      // continues uninterrupted at its correct position.
      const source = sortedSongs.length > 0 ? sortedSongs : originalQueueRef.current;
      const currentSongId = currentPlayingSong?.id;
      const newIdx = source.findIndex(s => s.id === currentSongId);
      const resolvedIdx = newIdx !== -1 ? newIdx : currentIndex;
      setQueue(source);
      setCurrentIndex(resolvedIdx);
      await LumiAudio.updateQueue({ songs: source, index: resolvedIdx });
    }

    setShuffleMode(newMode);
    await LumiAudio.setShuffle({ enabled: newMode });
  };

  const isPlayingThisPlaylist = currentPlayingSong ? currentSongs.some(s => s.id === currentPlayingSong.id) : false;

  const togglePlaylistShuffle = async () => {
    if (isPlayingThisPlaylist) {
      // Already playing from this playlist — just flip shuffle on/off in place,
      // same as other players, without restarting playback.
      await toggleShuffle();
    } else {
      // Not currently playing this playlist — start it shuffled and mark shuffle on.
      if (currentSongs.length === 0) return;
      const shuffled = [...currentSongs].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setCurrentIndex(0);
      await LumiAudio.setPlaylist({ songs: shuffled, index: 0 });
      await LumiAudio.setShuffle({ enabled: true });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ms = Number(e.target.value);
    setProgress(ms);
    LumiAudio.seekTo({ positionMs: ms });
  };

  // --- Keyboard shortcuts: Space = play/pause, Ctrl+Right = next, Ctrl+Left = previous ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault();
        LumiAudio.next();
      } else if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        LumiAudio.previous();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentIndex]);

  // --- Windows System Media Transport Controls (the taskbar-preview / volume-flyout
  // play-pause/next/previous buttons Spotify shows) via the browser Media Session API ---
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => LumiAudio.resume());
    navigator.mediaSession.setActionHandler('pause', () => LumiAudio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => LumiAudio.previous());
    navigator.mediaSession.setActionHandler('nexttrack', () => LumiAudio.next());
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    };
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (currentPlayingSong) {
      const art = currentPlayingSong.cover || currentCover;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentPlayingSong.title,
        artist: currentPlayingSong.artist,
        album: currentPlayingSong.album,
        artwork: art ? [{ src: art, sizes: '512x512', type: 'image/png' }] : [],
      });
    } else {
      navigator.mediaSession.metadata = null;
    }
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [currentPlayingSong, currentCover, isPlaying]);

  const localPlaylists = playlists.filter(p => !p.type || p.type === 'local');
  const drivePlaylists = playlists.filter(p => p.type === 'drive');

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col font-sans overflow-hidden">
      <div className="flex-1 relative overflow-hidden">
        {activeView === 'home' && (
          <main className="absolute inset-0 overflow-y-auto scroll-smooth touch-pan-y p-6 pt-12 pb-32">
            <div className="flex items-center gap-3 mb-8">
              <img src="./logo.png" alt="Lumi" className="w-14 h-14 rounded-2xl object-cover shadow-lg" />
              <div>
                <h1 className="text-4xl font-black leading-tight">Lumi</h1>
                <p className="text-zinc-400 text-sm font-medium">Your Music Companion.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-10">
              <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[160px]">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center mb-2"><Monitor size={20} className="text-white" /></div>
                  <h3 className="text-sm font-bold">Local</h3>
                  <p className="text-[10px] text-zinc-500 leading-tight">Device storage</p>
                </div>
                <button onClick={handleConnectFolder} disabled={isProcessing} className="w-full mt-4 py-2.5 rounded-xl font-bold bg-white/5 border border-white/10 text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-transform"><UploadCloud size={14} className={BRAND_TEXT} />{isProcessing && processStatus.includes('Folder') ? '...' : 'Select'}</button>
              </div>
              <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[160px]">
                <div className="flex flex-col items-center w-full">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center mb-2"><Cloud size={20} className={BRAND_TEXT} /></div>
                  <h3 className="text-sm font-bold">Cloud</h3>
                  <input type="text" placeholder="Paste link..." value={driveUrl} onChange={e => setDriveUrl(e.target.value)} className="w-full bg-black/40 border border-zinc-800 rounded-lg px-2 py-1.5 mt-2 text-[10px] outline-none focus:border-cyan-500/50 text-center" />
                </div>
                <button onClick={handleConnectDrive} disabled={isProcessing} className={`w-full mt-3 py-2.5 rounded-xl font-bold ${BRAND_BG} text-black text-[11px] flex items-center justify-center active:scale-95 transition-transform`}>{isProcessing && processStatus.includes('Drive') ? '...' : 'Connect'}</button>
              </div>
            </div>

            {localPlaylists.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-black mb-6 px-1">Local Playlists</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {localPlaylists.map(pl => (
                    <div key={pl.id} onClick={() => openPlaylist(pl)} className="bg-zinc-900/50 hover:bg-zinc-800 rounded-2xl p-4 cursor-pointer transition-all group relative border border-white/5 active:scale-[0.97]">
                      <button onClick={(e) => deletePlaylist(pl, e)} className="absolute top-3 right-3 bg-black/80 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 size={16} /></button>
                      <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-800 mb-4 shadow-xl"><ArtThumb cover={pl.cover} songId={pl.id} defaultArts={defaultArts} alt={pl.name} /></div>
                      <p className="font-bold text-sm truncate">{pl.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {drivePlaylists.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-black mb-6 px-1 flex items-center gap-2"><Cloud size={20} className={BRAND_TEXT}/> Drive Playlists</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {drivePlaylists.map(pl => (
                    <div key={pl.id} onClick={() => openPlaylist(pl)} className="bg-zinc-900/50 hover:bg-zinc-800 rounded-2xl p-4 cursor-pointer transition-all group relative border border-white/5 active:scale-[0.97]">
                      <button onClick={(e) => deletePlaylist(pl, e)} className="absolute top-3 right-3 bg-black/80 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 size={16} /></button>
                      <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-800 mb-4 shadow-xl flex items-center justify-center">
                        <ArtThumb cover={pl.cover} songId={pl.id} defaultArts={defaultArts} alt={pl.name} />
                        {!pl.cover && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Cloud size={48} className="text-white/20" /></div>}
                      </div>
                      <p className="font-bold text-sm truncate">{pl.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        )}

        {activeView === 'playlist' && currentPlaylist && (
          <div className="absolute inset-0 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* STICKY COMPACT HEADER */}
            <div className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 px-6 pt-10 pb-4 flex items-center gap-3 ${playlistScroll > 150 ? 'bg-zinc-950/90 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
              <button onClick={() => { setActiveView('home'); setPlaylistScroll(0); }} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors flex-shrink-0">
                <ChevronLeft size={28} />
              </button>

              <h2 className={`font-black truncate transition-all duration-300 flex-1 text-center ${playlistScroll > 150 ? 'opacity-100 translate-y-0 text-lg' : 'opacity-0 -translate-y-4 text-base'}`}>
                {currentPlaylist.name}
              </h2>

              <button onClick={() => rescanPlaylist(currentPlaylist)} className="ml-auto text-[10px] font-bold text-zinc-400 border border-zinc-800 bg-zinc-900/50 rounded-full px-4 py-1.5 hover:bg-zinc-800 transition-colors flex-shrink-0">
                Refresh
              </button>
            </div>

            <div
              onScroll={(e) => setPlaylistScroll(e.currentTarget.scrollTop)}
              className="flex-1 overflow-y-auto scroll-smooth touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {/* LARGE EXPANDED HEADER SECTION (The 50% starting view) */}
              <div className="relative w-full pt-28 px-6 pb-8 flex flex-col items-center overflow-hidden">
                {/* Background Glow */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-20 pointer-events-none transition-opacity duration-500 ${BRAND_BG} blur-[100px] rounded-full`} style={{ opacity: Math.max(0, 0.2 - playlistScroll / 1000) }} />

                <div
                  className="transition-all duration-300 ease-out flex flex-col items-center w-full"
                  style={{
                    opacity: Math.max(0, 1 - playlistScroll / 250),
                    transform: `scale(${Math.max(0.7, 1 - playlistScroll / 1000)}) translateY(${playlistScroll * 0.2}px)`
                  }}
                >
                  <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden bg-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center relative group border border-white/10 mb-8">
                    <ArtThumb cover={currentPlaylist.cover} songId={currentPlaylist.id} defaultArts={defaultArts} />
                    {isEditing && (
                      <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 cursor-pointer opacity-100">
                        <ImageIcon size={28} />
                        <span className="text-xs font-semibold">Choose photo</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                      </label>
                    )}
                  </div>

                  <div className="text-center w-full px-4">
                    {isEditing ? (
                      <div className="flex flex-col gap-3 max-w-md mx-auto">
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="bg-zinc-800 text-2xl font-black rounded-md px-3 py-2 w-full outline-none border border-cyan-500/30 focus:border-cyan-500 text-center" />
                        <div className="flex gap-2 justify-center">
                          <button onClick={saveEdits} className={`${BRAND_BG} text-black px-5 py-2 rounded-full font-bold text-sm shadow-lg`}>Save</button>
                          <button onClick={() => { setIsEditing(false); setEditCover(null); }} className="bg-zinc-800 border border-zinc-700 px-5 py-2 rounded-full font-bold text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <h1 onClick={() => { setIsEditing(true); setEditName(currentPlaylist.name); setEditCover(currentPlaylist.cover); }} className="text-4xl md:text-6xl font-black mb-3 cursor-pointer hover:underline truncate inline-flex items-center gap-3 group">
                        {currentPlaylist.name}
                        <Edit2 size={20} className="text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h1>
                    )}
                    <p className="text-zinc-400 text-sm font-bold tracking-wide uppercase opacity-60">
                      {sortedSongs.length} songs · {currentPlaylist.type === 'drive' ? 'Cloud' : 'Local'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ACTION BAR (Play/Shuffle/Sort) - Becomes sticky below the top bar */}
              <div className={`sticky top-[88px] z-20 px-6 py-4 flex items-center gap-4 transition-colors duration-300 ${playlistScroll > 320 ? 'bg-zinc-950/95 backdrop-blur-md border-b border-white/5' : 'bg-transparent'}`}>
                <button onClick={() => sortedSongs.length > 0 && playSong(sortedSongs, 0)} className={`w-14 h-14 ${BRAND_BG} rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl active:scale-95`}>
                  <Play size={30} className="text-black ml-1" fill="currentColor" />
                </button>
                <button onClick={togglePlaylistShuffle} className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors shadow-lg active:scale-95 ${shuffleMode && isPlayingThisPlaylist ? `${BRAND_BG}` : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800'}`}>
                  <Shuffle size={22} className={shuffleMode && isPlayingThisPlaylist ? 'text-black' : BRAND_TEXT} />
                </button>

                <div className="flex-1 relative max-w-sm mx-2">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    value={songSearchQuery}
                    onChange={(e) => setSongSearchQuery(e.target.value)}
                    placeholder="Search this playlist..."
                    className="w-full bg-zinc-900/80 border border-zinc-800 text-xs font-semibold text-zinc-200 placeholder:text-zinc-600 rounded-full pl-10 pr-8 py-2.5 outline-none focus:border-cyan-500/50 transition-colors"
                  />
                  {songSearchQuery && (
                    <button onClick={() => setSongSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="ml-auto">
                  <select
                    value={`${sortOrder.field}-${sortOrder.direction}`}
                    onChange={(e) => { const [field, direction] = e.target.value.split('-') as [any, any]; setSortOrder({ field, direction }); }}
                    className="bg-zinc-900/80 border border-zinc-800 text-[10px] font-black tracking-tighter uppercase text-zinc-400 rounded-full px-4 py-2 outline-none focus:border-cyan-500/50 transition-colors"
                  >
                    <option value="name-asc">A-Z</option>
                    <option value="name-desc">Z-A</option>
                    <option value="date-desc">Newest</option>
                    <option value="date-asc">Oldest</option>
                  </select>
                </div>
              </div>

              {/* SONG LIST */}
              <div className="px-4 pt-2 pb-40 space-y-1 relative z-10">
                {filteredSongs.map((song) => {
                  const isCurrent = currentPlayingSong?.id === song.id;
                  return (
                    <div key={song.id} onClick={() => playSong(sortedSongs, sortedSongs.findIndex(s => s.id === song.id))} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-all group ${isCurrent ? 'bg-cyan-500/10' : ''}`}>
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 border border-white/5 relative">
                        <ArtThumb cover={song.cover} songId={song.id} defaultArts={defaultArts} />
                        {isCurrent && isPlaying && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><div className="flex gap-0.5 items-end h-4"><div className="w-0.5 bg-cyan-400 animate-music-bar-1"></div><div className="w-0.5 bg-cyan-400 animate-music-bar-2"></div><div className="w-0.5 bg-cyan-400 animate-music-bar-3"></div></div></div>}
                      </div>
                      <div className="truncate flex-1">
                        <p className={`font-bold truncate text-sm ${isCurrent ? BRAND_TEXT : 'text-zinc-100'}`}>{song.title}</p>
                        <p className="text-xs text-zinc-500 font-medium truncate">{song.artist}</p>
                      </div>
                      {song.isRemote && <Cloud size={14} className="text-zinc-700" />}
                      <span className="text-[10px] tracking-wider uppercase text-zinc-600 font-black">{song.format}</span>
                    </div>
                  );
                })}

                {filteredSongs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20">
                    <Music size={64} />
                    <p className="mt-4 font-bold">{songSearchQuery ? `No matches for "${songSearchQuery}"` : 'No songs found'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <QueueSidebar isQueueOpen={isQueueOpen} queue={queue} currentIndex={currentIndex} onClose={() => setIsQueueOpen(false)} onPlaySong={playSong} BRAND_TEXT={BRAND_TEXT} defaultArts={defaultArts} />

      {currentPlayingSong && (
        <div onClick={() => setIsFullScreen(true)} className="fixed bottom-0 left-0 right-0 h-[80px] bg-black/90 border-t border-white/5 backdrop-blur-lg flex items-center px-4 cursor-pointer z-40 animate-in slide-in-from-bottom duration-500">
          <div className="absolute top-0 left-0 right-0 h-3 -mt-1.5 flex items-center group/seek" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full h-[2px] bg-zinc-900 group-hover/seek:h-[3px] transition-all">
              <div className={`h-full ${BRAND_BG} shadow-[0_0_8px_rgba(34,211,238,0.5)] pointer-events-none`} style={{ width: `${(progress / duration) * 100 || 0}%` }} />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Seek"
            />
          </div>
          <div className="flex items-center gap-3 flex-1 overflow-hidden"><ArtThumb cover={currentPlayingSong.cover || currentCover} songId={currentPlayingSong.id} defaultArts={defaultArts} className="w-14 h-14 rounded-lg object-cover shadow-lg border border-white/5 flex-shrink-0" /><div className="truncate"><h4 className="text-sm font-bold truncate pr-4">{currentPlayingSong.title}</h4><p className="text-xs text-zinc-500 font-black truncate">{currentPlayingSong.artist}</p></div></div>
          <div className="flex items-center gap-2 px-2" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsQueueOpen(true)} className="text-zinc-500 hover:text-white p-2"><ListMusic size={22} /></button>
            <button onClick={() => LumiAudio.previous()} className="text-white hover:text-cyan-400 p-2 transition-colors"><SkipBack size={20} fill="currentColor" /></button>
            <button onClick={togglePlay} className={`w-11 h-11 ${BRAND_BG} rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform`}>{isPlaying ? <Pause size={22} className="text-black" fill="currentColor" /> : <Play size={22} className="text-black ml-0.5" fill="currentColor" />}</button>
            <button onClick={() => LumiAudio.next()} className="text-white hover:text-cyan-400 p-2 transition-colors"><SkipForward size={20} fill="currentColor" /></button>
          </div>
        </div>
      )}

      <div className={`fixed inset-0 bg-[#050505] z-50 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isFullScreen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-10 pointer-events-none ${BRAND_BG} blur-[120px] rounded-full`} />
        <div className="flex justify-between items-center p-6 pt-10 relative z-10"><button onClick={() => setIsFullScreen(false)} className="p-2 text-zinc-400 hover:text-white transition-colors"><ChevronDown size={32} /></button><div className="text-center"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black mb-1">Now Playing from</p><p className="text-xs font-black truncate max-w-[200px] text-zinc-300">{currentPlaylist?.name}</p></div><button onClick={() => setIsVinylMode(!isVinylMode)} className={`p-2 rounded-xl transition-all ${isVinylMode ? BRAND_TEXT + ' bg-cyan-500/10 shadow-lg border border-cyan-500/20' : 'text-zinc-500 hover:text-white'}`}><Music size={24} /></button></div>
        {currentPlayingSong && (
          <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden px-8 pb-12 lg:px-16 relative z-10">
            <div className="w-full max-w-md mx-auto lg:max-w-5xl lg:h-full lg:grid lg:grid-cols-[minmax(320px,460px)_1fr] lg:gap-20 lg:items-center">

              {/* Artwork column — centered independently so it never stretches oddly on wide windows */}
              <div className="lg:flex lg:items-center lg:justify-center lg:h-full">
                {isVinylMode ? (
                  <div className="relative w-full lg:w-[420px] aspect-square mb-12 lg:mb-0 flex items-center justify-center">
                    <div className={`w-[90%] h-[90%] rounded-full bg-zinc-950 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center border-[10px] border-[#111] relative overflow-hidden ${isPlaying ? 'animate-spin-slow' : ''}`}>
                      {[...Array(8)].map((_, i) => (<div key={i} className="absolute inset-0 rounded-full border border-white/5 opacity-[0.03]" style={{ margin: `${i * 12}px` }} />))}
                      <div className="w-[42%] h-[42%] rounded-full overflow-hidden border-8 border-[#0a0a0a] bg-zinc-900"><ArtThumb cover={currentPlayingSong.cover || currentCover} songId={currentPlayingSong.id} defaultArts={defaultArts} /></div>
                      <div className="absolute w-5 h-5 bg-[#050505] rounded-full border border-white/10 shadow-lg z-20 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-zinc-800 rounded-full" /></div>
                    </div>
                    <div className={`absolute top-0 right-0 w-32 h-48 pointer-events-none transition-transform duration-1000 origin-top-right ${isPlaying ? 'rotate-0' : 'rotate-[-20deg]'} opacity-90`}>
                      <div className="absolute top-4 right-12 w-3 h-3 bg-zinc-600 rounded-full border border-white/20 z-30" />
                      <div className="absolute top-4 right-[50px] w-2 h-44 bg-gradient-to-b from-zinc-400 to-zinc-600 rounded-full origin-top rotate-[22deg]" />
                      <div className="absolute top-[165px] right-[100px] w-8 h-5 bg-zinc-300 rounded-sm shadow-xl rotate-[22deg]" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full lg:w-[420px] aspect-square mb-12 lg:mb-0 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 group">
                    <ArtThumb cover={currentPlayingSong.cover || currentCover} songId={currentPlayingSong.id} defaultArts={defaultArts} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>
                )}
              </div>

              {/* Info + controls column */}
              <div className="w-full lg:max-w-md">
                <div className="w-full mb-10 px-2 lg:px-0">
                  <h2 className="text-2xl lg:text-4xl font-black truncate text-white tracking-tight">{currentPlayingSong.title}</h2>
                  <p className={`text-lg lg:text-xl font-bold mt-1 ${BRAND_TEXT} opacity-80 truncate`}>{currentPlayingSong.artist}</p>
                </div>
                <div className="w-full flex flex-col gap-3 mb-10">
                  <input type="range" min={0} max={duration || 100} value={progress} onChange={handleSeek} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
                  <div className="flex justify-between text-[11px] text-zinc-500 font-black tracking-widest uppercase"><span>{formatTime(progress)}</span><span>{formatTime(duration)}</span></div>
                </div>
                <div className="w-full flex justify-between items-center px-2 mb-10">
                  <button onClick={toggleShuffle} className={`p-3 ${shuffleMode ? BRAND_TEXT : "text-zinc-500"}`}><Shuffle size={26} /></button>
                  <button onClick={() => LumiAudio.previous()} className="p-3 text-white"><SkipBack size={38} fill="currentColor" /></button>
                  <button onClick={togglePlay} className="w-22 h-22 bg-white rounded-full flex items-center justify-center shadow-xl">{isPlaying ? <Pause size={36} className="text-black" fill="currentColor" /> : <Play size={36} className="text-black ml-2" fill="currentColor" />}</button>
                  <button onClick={() => LumiAudio.next()} className="p-3 text-white"><SkipForward size={38} fill="currentColor" /></button>
                  <button onClick={toggleRepeat} className={`p-3 relative ${repeatMode > 0 ? BRAND_TEXT : "text-zinc-500"}`}><Repeat size={26} />{repeatMode === 1 && <span className={`absolute text-[10px] font-black top-2 right-2 ${BRAND_BG} text-black rounded-full w-4.5 h-4.5 flex items-center justify-center border-2 border-[#050505]`}>1</span>}</button>
                </div>
                <div className="w-full flex justify-end px-2">
                  <button onClick={() => setIsQueueOpen(true)} className="text-zinc-500 hover:text-white p-3 bg-zinc-900/30 rounded-2xl transition-colors"><ListMusic size={26} /></button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      <CatPet />
    </div>
  );
}

  function QueueSidebar({isQueueOpen,queue,currentIndex,onClose,onPlaySong,BRAND_TEXT,defaultArts}: {
    isQueueOpen: boolean;
    queue: LumiSong[];
    currentIndex: number;
    onClose: () => void;
    onPlaySong: (songs: LumiSong[], index: number) => void;
    BRAND_TEXT: string;
    defaultArts: string[];
    }) {
    // Render only from currentIndex onward (Stack behavior: past songs pop off)
    const visibleQueue = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= queue.length) return [];
    return queue.slice(currentIndex);
  }, [queue, currentIndex]);

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 w-85 max-w-[90%] bg-[#0a0a0a] z-[60] shadow-2xl transition-transform duration-500 ease-out border-l border-white/5 backdrop-blur-xl ${
        isQueueOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900/20">
        <h2 className="text-xl font-black">Queue</h2>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={24} className="rotate-180" />
        </button>
      </div>

      <div className="overflow-y-auto h-full pb-40 p-4 space-y-4">
        {visibleQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 opacity-30">
            <Music size={48} />
            <p className="text-sm font-bold mt-4">Queue is empty</p>
          </div>
        ) : (
          <>
            {/* CURRENTLY PLAYING SECTION */}
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2 px-1">
                Now Playing
              </p>
              {(() => {
                const nowPlaying = visibleQueue[0];
                return (
                  <div
                    onClick={() => onPlaySong(queue, currentIndex)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer bg-cyan-500/10 border border-cyan-500/20 shadow-lg"
                  >
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/5">
                      <ArtThumb cover={nowPlaying.cover} songId={nowPlaying.id} defaultArts={defaultArts} />
                    </div>
                    <div className="truncate flex-1">
                      <p className={`text-xs font-bold truncate ${BRAND_TEXT}`}>
                        {nowPlaying.title}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-bold truncate">
                        {nowPlaying.artist}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* UPCOMING TRACKS SECTION */}
            {visibleQueue.length > 1 && (
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2 px-1">
                  Next Up
                </p>
                <div className="space-y-1.5">
                  {visibleQueue.slice(1).map((song, relativeIdx) => {
                    // Calculate real index in the main queue array
                    const actualQueueIndex = currentIndex + 1 + relativeIdx;

                    return (
                      <div
                        key={`${song.id}-${actualQueueIndex}`}
                        onClick={() => onPlaySong(queue, actualQueueIndex)}
                        className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                      >
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/5">
                          <ArtThumb cover={song.cover} songId={song.id} defaultArts={defaultArts} />
                        </div>
                        <div className="truncate flex-1">
                          <p className="text-xs font-bold truncate text-zinc-200">
                            {song.title}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-bold truncate">
                            {song.artist}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}