import type { LumiSong, LumiFolder } from './types';

export {};

declare global {
  interface Window {
    lumiAPI: {
      pickFolder: () => Promise<LumiFolder>;
      scanFolder: (uri: string) => Promise<{ songs: LumiSong[] }>;
      verifyFolderAccess: (uri: string) => Promise<{ valid: boolean }>;
      getArtwork: (uri: string) => Promise<{ cover: string | null }>;
      listDefaultArt: () => Promise<{ files: string[] }>;
      storeGet: (key: string) => Promise<string | null>;
      storeSet: (key: string, value: string) => Promise<void>;
      storeRemove: (key: string) => Promise<void>;
    };
  }
}
