export interface LumiSong {
  id: string;        // stable id (derived from file path / drive file id)
  uri: string;        // absolute filesystem path or https:// drive link
  title: string;
  artist: string;
  album: string;
  cover: string | null; // data:image/...;base64,...
  durationMs: number;
  dateModified: number;
  format: string;     // mp3, flac, wav, m4a, ogg, aac...
  isRemote?: boolean; // Flag for Google Drive songs
}

export interface LumiFolder {
  uri: string;
  name: string;
}

export interface LumiAudioPlugin {
  /** Opens the OS folder picker. */
  pickFolder(): Promise<LumiFolder>;

  /** Recursively scans a previously-picked folder for audio files and reads embedded tags/art. */
  scanFolder(options: { uri: string }): Promise<{ songs: LumiSong[] }>;

  /** Re-checks that a previously picked folder still exists / is readable. */
  verifyFolderAccess(options: { uri: string }): Promise<{ valid: boolean }>;

  /** Starts/loads a single track directly (rarely used — setPlaylist is the main entry point). */
  play(options: { uri: string; title: string; artist: string; cover: string | null }): Promise<void>;
  setPlaylist(options: { songs: LumiSong[]; index: number; autoPlay?: boolean }): Promise<void>;
  /** Updates queue order/current-index only — never touches audio.src, so playback
   *  is uninterrupted. Use this instead of setPlaylist when the same track is still
   *  playing and only the surrounding queue order changed (e.g. shuffle toggle). */
  updateQueue(options: { songs: LumiSong[]; index: number }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  seekTo(options: { positionMs: number }): Promise<void>;
  setShuffle(options: { enabled: boolean }): Promise<void>;
  setRepeat(options: { mode: number }): Promise<void>;
  getArtwork(options: { uri: string }): Promise<{ cover?: string | null }>;
  getStatus(): Promise<{ isPlaying: boolean; positionMs: number; durationMs: number; currentIndex: number; shuffleMode: boolean; repeatMode: number }>;

  addListener(
    eventName: 'playbackStatus',
    listenerFunc: (data: { isPlaying: boolean; positionMs: number; durationMs: number; currentIndex: number; shuffleMode: boolean; repeatMode: number }) => void
  ): Promise<{ remove: () => void }>;

  addListener(
    eventName: 'trackEnded',
    listenerFunc: () => void
  ): Promise<{ remove: () => void }>;

  addListener(
    eventName: 'remoteNext' | 'remotePrev',
    listenerFunc: () => void
  ): Promise<{ remove: () => void }>;
}

// The concrete implementation lives in lumiAudioWeb.ts (HTMLAudioElement-backed, talks to
// the main process over the lumiAPI bridge for filesystem work). Re-exported here so
// existing `import { LumiAudio } from './types'` call sites don't need to change.
export { LumiAudio } from './lumiAudioWeb';
