import type { LumiAudioPlugin, LumiSong, LumiFolder } from './types';

type PlaybackStatus = {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  currentIndex: number;
  shuffleMode: boolean;
  repeatMode: number; // 0 = off, 1 = repeat one, 2 = repeat all
};

class SimpleEmitter {
  private handlers: Record<string, Set<(data?: any) => void>> = {};

  on(event: string, fn: (data?: any) => void) {
    if (!this.handlers[event]) this.handlers[event] = new Set();
    this.handlers[event].add(fn);
    return { remove: () => { this.handlers[event]?.delete(fn); } };
  }

  emit(event: string, data?: any) {
    this.handlers[event]?.forEach(fn => fn(data));
  }
}

// Local paths go through the custom `lumi-file://` protocol registered in the main
// process (supports proper seeking); http(s) urls (Google Drive) pass straight through.
function toPlayableSrc(uri: string): string {
  if (/^https?:\/\//i.test(uri)) return uri;
  const normalized = uri.replace(/\\/g, '/');
  return `lumi-file:///${encodeURI(normalized)}`;
}

class LumiAudioWeb implements LumiAudioPlugin {
  private audio = new Audio();
  private emitter = new SimpleEmitter();
  private playlist: LumiSong[] = [];
  private index = -1;
  private shuffleMode = false;
  private repeatMode = 2;
  private statusTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.audio.addEventListener('ended', () => this.emitter.emit('trackEnded'));
    this.audio.addEventListener('play', () => this.broadcastStatus());
    this.audio.addEventListener('pause', () => this.broadcastStatus());
    this.audio.addEventListener('loadedmetadata', () => this.broadcastStatus());
    this.statusTimer = setInterval(() => this.broadcastStatus(), 500);
  }

  private broadcastStatus() {
    this.emitter.emit('playbackStatus', this.snapshotStatus());
  }

  private snapshotStatus(): PlaybackStatus {
    return {
      isPlaying: !this.audio.paused && !this.audio.ended,
      positionMs: Math.round((this.audio.currentTime || 0) * 1000),
      durationMs: Math.round((this.audio.duration || 0) * 1000) || 0,
      currentIndex: this.index,
      shuffleMode: this.shuffleMode,
      repeatMode: this.repeatMode,
    };
  }

  private async loadAndPlay(song: LumiSong) {
    this.audio.src = toPlayableSrc(song.uri);
    try {
      await this.audio.play();
    } catch (err) {
      console.warn('Playback failed', err);
    }
    this.broadcastStatus();
  }

  async pickFolder(): Promise<LumiFolder> {
    return window.lumiAPI.pickFolder();
  }

  async scanFolder(options: { uri: string }) {
    return window.lumiAPI.scanFolder(options.uri);
  }

  async verifyFolderAccess(options: { uri: string }) {
    return window.lumiAPI.verifyFolderAccess(options.uri);
  }

  async play(options: { uri: string; title: string; artist: string; cover: string | null }) {
    this.audio.src = toPlayableSrc(options.uri);
    try { await this.audio.play(); } catch (err) { console.warn(err); }
    this.broadcastStatus();
  }

  async setPlaylist(options: { songs: LumiSong[]; index: number; autoPlay?: boolean }) {
    this.playlist = options.songs;
    this.index = options.index;
    const song = this.playlist[this.index];
    if (!song) return;

    this.audio.src = toPlayableSrc(song.uri);
    if (options.autoPlay !== false) {
      try { await this.audio.play(); } catch (err) { console.warn('autoplay blocked', err); }
    } else {
      this.audio.pause();
    }
    this.broadcastStatus();
  }

  // Updates queue order/current-index bookkeeping only (used by next()/previous()) —
  // deliberately never touches `audio.src`, so the currently playing track keeps
  // playing without any reload/restart. Used when the queue is reordered (e.g.
  // shuffle toggle) but the actual playing file hasn't changed.
  async updateQueue(options: { songs: LumiSong[]; index: number }) {
    this.playlist = options.songs;
    this.index = options.index;
    this.broadcastStatus();
  }

  async pause() {
    this.audio.pause();
  }

  async resume() {
    try { await this.audio.play(); } catch (err) { console.warn(err); }
  }

  async next() {
    if (this.playlist.length === 0) return;

    if (this.repeatMode === 1) {
      // repeat-one: just restart the current track
      await this.loadAndPlay(this.playlist[this.index]);
      return;
    }

    let nextIndex = this.index + 1;
    if (nextIndex >= this.playlist.length) {
      if (this.repeatMode === 2) nextIndex = 0;
      else { this.audio.pause(); this.broadcastStatus(); return; }
    }

    this.index = nextIndex;
    await this.loadAndPlay(this.playlist[this.index]);
  }

  async previous() {
    if (this.playlist.length === 0) return;

    // Restart current track if more than 3s in, matching typical player UX.
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      this.broadcastStatus();
      return;
    }

    let prevIndex = this.index - 1;
    if (prevIndex < 0) prevIndex = this.repeatMode === 2 ? this.playlist.length - 1 : 0;

    this.index = prevIndex;
    await this.loadAndPlay(this.playlist[this.index]);
  }

  async seekTo(options: { positionMs: number }) {
    this.audio.currentTime = options.positionMs / 1000;
    this.broadcastStatus();
  }

  async setShuffle(options: { enabled: boolean }) {
    this.shuffleMode = options.enabled;
    this.broadcastStatus();
  }

  async setRepeat(options: { mode: number }) {
    this.repeatMode = options.mode;
    this.broadcastStatus();
  }

  async getArtwork(options: { uri: string }) {
    return window.lumiAPI.getArtwork(options.uri);
  }

  async getStatus() {
    return this.snapshotStatus();
  }

  addListener(eventName: string, listenerFunc: (data?: any) => void) {
    return Promise.resolve(this.emitter.on(eventName, listenerFunc));
  }
}

export const LumiAudio: LumiAudioPlugin = new LumiAudioWeb();
