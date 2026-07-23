# Lumi — Electron (Windows) build

This is a from-scratch Electron port of the Capacitor/Android Lumi app, rebuilt around
the same UI (`App.tsx`, `CatPet.tsx`) but with the native Android layer replaced by:

| Capacitor (Android)                          | Electron (this project)                                  |
|-----------------------------------------------|------------------------------------------------------------|
| `LumiAudio` native plugin (ExoPlayer)          | `src/lumiAudioWeb.ts` — `HTMLAudioElement`-backed, same `LumiAudioPlugin` interface |
| SAF folder picker + native folder scan         | `electron/main.ts` (`dialog.showOpenDialog`) + `electron/scanner.ts` (Node `fs` walk + `music-metadata` tag/art extraction) |
| `@capacitor/preferences`                       | `electron-store`, exposed to the renderer over IPC as `window.lumiAPI.storeGet/Set/Remove` |
| `@capacitor/app` (unused import)                | removed |
| content:// / file:// playback                  | custom `lumi-file://` protocol registered in the main process, streamed into `<audio>` |
| Google Drive streaming (`fetch` + API key)      | unchanged — works the same way in Chromium/Electron |

The UI code (`App.tsx`, `CatPet.tsx`) is otherwise untouched — same components, same
Tailwind classes, same playlist/queue/shuffle/repeat/vinyl-mode logic. `App.tsx` only had
one line removed: an unused `import { App as CapApp } from '@capacitor/app'` that wasn't
referenced anywhere in the file.

## ⚠️ Before you do anything else

`src/driveConfig.ts` contains a real Google Drive API key that was included in your
uploaded files. Since it's now been shared in this conversation, **rotate/regenerate it**
in the Google Cloud Console and paste the new key in locally. `driveConfig.example.ts` is
the template for anyone else setting up the project.

## Missing assets

These files weren't part of your upload, so you'll need to copy them in from the
Capacitor project's `public/` folder before the app looks right:

- `public/logo.png`
- `public/cat/sitting.gif`, `walking.gif`, `running.gif`, `sleeping.gif` (used by `CatPet.tsx`)
- `public/default album/default-art-1.png` (etc. — `App.tsx` probes for up to 50 numbered files)

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

This runs Vite's dev server and an Electron window pointed at it, with DevTools open.

## Production build (Windows installer)

```bash
npm run build
```

Produces an NSIS installer under `release/`. Use `npm run build:dir` for an unpacked
build (faster iteration, no installer).

## Notes / things worth reviewing

- **Playback engine**: the original ExoPlayer service handled gapless playback and
  lock-screen media controls natively. `lumiAudioWeb.ts` reimplements queue/shuffle/repeat
  in JS on top of a single `<audio>` element — functionally equivalent for a desktop app,
  but there's no OS media-key/lock-screen integration yet. If you want that, Electron's
  `navigator.mediaSession` API is the place to add it (a few lines in `lumiAudioWeb.ts`).
- **Local file streaming**: local files are served through a custom `lumi-file://`
  protocol (registered in `electron/main.ts`) rather than reading files into memory, so
  seeking and large FLACs behave correctly.
- **Tag/art extraction**: `electron/scanner.ts` uses `music-metadata` (ESM package,
  dynamically imported from the CJS-compiled main process) instead of the Android plugin's
  native tag reader.
- **Storage**: `electron-store` writes to a JSON file in the OS user-data directory,
  mirroring the key/value shape `store.ts` already expected from `@capacitor/preferences`.
