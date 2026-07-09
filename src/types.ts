export interface NacsaSong {
  id: string;
  uri: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  cover: string | null;
  durationMs: number;
  format: string;
  bitsPerSample: number | null;
  sampleRate: number | null;
  dateModified: number | null;
  // Online mode
  source?: 'local' | 'drive';
  driveFileId?: string;
}

export interface Playlist {
  id: string;
  name: string;
  folderPath: string;   // local path OR empty string for Drive playlists
  cover: string | null;
  createdAt: number;
  // Online mode
  source?: 'local' | 'drive';
  driveFolderId?: string;
}

export interface NacsaBridge {
  pickFolder(): Promise<{ path: string; name: string } | null>;
  verifyFolderAccess(folderPath: string): Promise<{ valid: boolean }>;
  scanFolder(folderPath: string): Promise<{ songs: NacsaSong[] }>;
  store: {
    getPlaylists(): Promise<Playlist[]>;
    savePlaylist(playlist: Playlist): Promise<boolean>;
    deletePlaylist(playlistId: string): Promise<boolean>;
    getSongs(playlistId: string): Promise<NacsaSong[]>;
    saveSongs(playlistId: string, songs: NacsaSong[]): Promise<boolean>;
  };
  playback: {
    save(state: { queue: NacsaSong[]; currentIndex: number; progress: number }): Promise<boolean>;
    load(): Promise<{ queue: NacsaSong[]; currentIndex: number; progress: number } | null>;
  };
}

declare global {
  interface Window { nacsa: NacsaBridge; }
}
