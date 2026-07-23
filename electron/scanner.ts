import fs from 'fs';
import path from 'path';

export interface ScannedSong {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  cover: string | null;
  durationMs: number;
  dateModified: number;
  format: string;
}

const AUDIO_EXTS = new Set(['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.aac', '.opus', '.wma']);

// Stable-ish id derived from the absolute path, mirrors the "hashed content uri" idea
// from the Android plugin.
function hashId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + '-' + input.length;
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.warn('Could not read directory', dir, err);
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (AUDIO_EXTS.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

// music-metadata is ESM-only; dynamic import works from our CJS-compiled main process.
async function getMM() {
  return import('music-metadata');
}

export async function scanFolderForSongs(folderPath: string): Promise<ScannedSong[]> {
  const mm = await getMM();
  const files = walk(folderPath);
  const songs: ScannedSong[] = [];

  for (const filePath of files) {
    try {
      const stat = fs.statSync(filePath);
      const metadata = await mm.parseFile(filePath, { skipCovers: false, duration: true });
      const common = metadata.common;

      let cover: string | null = null;
      const pic = common.picture && common.picture[0];
      if (pic) {
        cover = `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}`;
      }

      songs.push({
        id: hashId(filePath),
        uri: filePath,
        title: common.title || path.basename(filePath, path.extname(filePath)),
        artist: common.artist || 'Unknown Artist',
        album: common.album || 'Unknown Album',
        cover,
        durationMs: Math.round((metadata.format.duration || 0) * 1000),
        dateModified: stat.mtimeMs,
        format: path.extname(filePath).slice(1).toLowerCase(),
      });
    } catch (err) {
      console.warn('Failed to read metadata for', filePath, err);
    }
  }

  return songs;
}

export async function readArtwork(filePath: string): Promise<string | null> {
  try {
    const mm = await getMM();
    const metadata = await mm.parseFile(filePath, { skipCovers: false, duration: false });
    const pic = metadata.common.picture && metadata.common.picture[0];
    if (!pic) return null;
    return `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}`;
  } catch {
    return null;
  }
}
