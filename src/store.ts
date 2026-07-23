import { LumiSong } from './types';

export interface Playlist {
  id: string;
  name: string;
  folderUri: string;
  cover: string | null; // user-uploaded cover, data:image base64
  createdAt: number;
  type?: 'local' | 'drive';
}

const PLAYLISTS_KEY = 'lumi_playlists_v1';
const SESSION_KEY = 'lumi_last_session_v1';
const songsKey = (playlistId: string) => `lumi_songs_${playlistId}`;

export const store = {
  async getLastSession(): Promise<{ queue: LumiSong[], currentIndex: number } | null> {
    const value = await window.lumiAPI.storeGet(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  },

  async saveLastSession(queue: LumiSong[], currentIndex: number) {
    await window.lumiAPI.storeSet(SESSION_KEY, JSON.stringify({ queue, currentIndex }));
  },

  async getAllPlaylists(): Promise<Playlist[]> {
    const value = await window.lumiAPI.storeGet(PLAYLISTS_KEY);
    return value ? JSON.parse(value) : [];
  },

  async savePlaylist(playlist: Playlist) {
    const all = await this.getAllPlaylists();
    const idx = all.findIndex(p => p.id === playlist.id);
    if (idx >= 0) all[idx] = playlist; else all.push(playlist);
    await window.lumiAPI.storeSet(PLAYLISTS_KEY, JSON.stringify(all));
  },

  async deletePlaylist(playlistId: string) {
    const all = await this.getAllPlaylists();
    const filtered = all.filter(p => p.id !== playlistId);
    await window.lumiAPI.storeSet(PLAYLISTS_KEY, JSON.stringify(filtered));
    await window.lumiAPI.storeRemove(songsKey(playlistId));
  },

  async getSongs(playlistId: string): Promise<LumiSong[]> {
    const value = await window.lumiAPI.storeGet(songsKey(playlistId));
    return value ? JSON.parse(value) : [];
  },

  async saveSongs(playlistId: string, songs: LumiSong[]) {
    await window.lumiAPI.storeSet(songsKey(playlistId), JSON.stringify(songs));
  }
};
