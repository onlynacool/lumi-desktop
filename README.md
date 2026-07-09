<div align="center">

<img src="public/logo.png" alt="Lumi Logo" width="120" height="120" style="border-radius: 24px;" />

# Lumi
### *Your Music Companion.*

**A personal, lossless, offline-first music player — built for people who actually care about their music.**

[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Android-blue?style=flat-square)](#)
[![Built with Electron](https://img.shields.io/badge/Desktop-Electron-47848F?style=flat-square&logo=electron)](#)
[![Built with Capacitor](https://img.shields.io/badge/Android-Capacitor-119EFF?style=flat-square)](#)
[![React](https://img.shields.io/badge/UI-React%2018-61DAFB?style=flat-square&logo=react)](#)
[![License](https://img.shields.io/badge/License-Personal%20Use-green?style=flat-square)](#)

---

</div>

## What is Lumi?

Lumi is a **personal music player** built from the ground up for listeners who are tired of streaming services telling them what to hear, how to hear it, and charging them monthly for the privilege.

It plays **your music** — files you own, stored on your own device or your own Google Drive — with no ads, no algorithms, no subscriptions, no data collection, and no compromises on audio quality.

The name *Lumi* comes from the Latin root for **light** — because music, at its best, is something that illuminates a moment. The app is built around that feeling: calm, personal, immersive, and entirely yours.

---

## Platforms

| Platform | Technology | Status |
|----------|-----------|--------|
| **Windows** (PC / Laptop) | Electron + React | ✅ Available |
| **Android** (Phone / Tablet) | Capacitor + React | ✅ Available |

Both platforms share the **same React UI codebase**, meaning every visual update and feature ships to both platforms simultaneously.

---

## Features

### 🎵 Core Playback
- **True lossless audio playback** — MP3, FLAC, WAV, ALAC, OGG, AAC, OPUS, AIFF, APE and more
- **Hi-Res audio support** — 24-bit / 96kHz / 192kHz files play natively, no downsampling
- **Gapless-ready playback** — powered by Chromium's native audio decoder on desktop, ExoPlayer (Media3) on Android
- Full **play, pause, skip, seek, shuffle, repeat one, repeat all** — all working correctly

### 📁 Offline-First: Your Local Library
- Connect any folder from your PC or Android device as a playlist
- Lumi **reads embedded tags** (ID3, FLAC, M4A) automatically — title, artist, album, cover art
- Folders stay connected across app restarts — **no re-importing ever**
- **Hi-Res badge** on songs above 44.1kHz so you always know what you're listening to

### ☁️ Online Mode: Google Drive Streaming *(Desktop)*
- Paste a public Google Drive folder link → Lumi creates an online playlist instantly
- Stream your music from your own cloud — no third-party servers involved
- Drive playlists persist across sessions just like local ones
- Offline and online playlists coexist in the same library

### 🎨 Playlist Management (Spotify-style)
- **Custom playlist cover photos** — upload any image to personalise your playlists
- **Rename playlists** inline — click the title to edit, just like Spotify
- **Sort by name or date modified** — ascending and descending
- **Refresh playlists** to pick up new files added to a folder

### 🖥️ Full-Screen Now Playing
- **Cover art mode** — large, beautiful album artwork fills the screen
- **Vinyl record mode** — animated spinning vinyl disc with real groove rings and a pivoting tonearm; rotates while playing, pauses when you pause
- Toggle between both modes with a single button

### 🎛️ Now Playing Bar
- Persistent mini-player at the bottom of every screen
- Click the thin progress line to seek instantly
- Volume slider, queue toggle, track info — all in one compact bar

### 📋 Live Queue
- Slide-in queue sidebar showing **Now Playing** and **Up Next**
- Queue respects shuffle order — shows the actual upcoming song order, not the original list
- Click any song in the queue to jump to it immediately

### 🔀 Smart Shuffle & Repeat
- **Shuffle Play** button — starts from a random song and builds a shuffled queue automatically
- **Repeat All** — loops the entire playlist
- **Repeat One** — loops the current song indefinitely
- Shuffle and repeat modes work correctly with the queue, skip buttons, and autoplay

### ⌨️ Keyboard Shortcuts *(Desktop)*
| Shortcut | Action |
|----------|--------|
| `Space` | Play / Pause |
| `Ctrl + →` | Next song |
| `Ctrl + ←` | Previous song |

### 🔔 Windows Media Controls 
- **Notification area** — shows song title, artist, album art, and working prev/play/pause/next buttons
- **Taskbar thumbnail** — hover the Lumi taskbar icon to get prev/play/pause/next buttons in the preview popup
- **Media keys** on keyboard work natively
- **Lock screen** now-playing info
- All powered by the Windows System Media Transport Controls (SMTC) via the Web Media Session API

### 🐱 Cat Companion
- A draggable animated cat lives on the UI across all screens
- Randomly cycles through **sitting, walking, running, and sleeping** animations using your own GIF files
- Moves autonomously across the screen, bounces off edges, and flips direction
- Occasionally shows mood bubbles (*"Meow~"*, *"Zzz..."*, *"*on patrol*"*)
- Grab and drag it anywhere — it resumes its own movement when you let go
- Touch-enabled on Android

### 🎨 Starry Night Theme
- Deep navy blue (`#0d1b4b`) to black gradient throughout
- Aqua-blue (`sky-400`) accent colour inspired by Van Gogh's *The Starry Night*
- Custom Lumi logo shown as fallback art when songs have no embedded cover
- Dark, immersive design that gets out of the way of the music

---

## What Makes Lumi Different

| Feature | Lumi | Spotify | Apple Music | VLC | Foobar2000 |
|---------|------|---------|-------------|-----|-----------|
| Truly lossless local playback | ✅ | ❌ (max 320kbps) | ✅ | ✅ | ✅ |
| Hi-Res (24-bit / 192kHz) | ✅ | ❌ | ✅ | ✅ | ✅ |
| Google Drive streaming | ✅ | ❌ | ❌ | ❌ | ❌ |
| No subscription | ✅ | ❌ | ❌ | ✅ | ✅ |
| No ads | ✅ | ❌ | ✅ | ✅ | ✅ |
| No data collection | ✅ | ❌ | ❌ | ✅ | ✅ |
| Works fully offline | ✅ | ❌ | ❌ | ✅ | ✅ |
| Windows + Android (same codebase) | ✅ | ✅ | ❌ | ✅ | ❌ |
| Vinyl record player UI | ✅ | ❌ | ❌ | ❌ | ❌ |
| Animated cat companion | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Tech Stack

### Frontend (Shared — Windows & Android)
| Tool | Purpose |
|------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety across all components |
| **Vite** | Build tool and dev server |
| **Tailwind CSS** | Utility-first styling |
| **Lucide React** | Icon library |

### Desktop (Windows)
| Tool | Purpose |
|------|---------|
| **Electron 31** | Desktop app shell, native OS integration |
| **electron-builder** | Packages into a Windows `.exe` installer |
| **electron-store** | Persistent local app data (playlists, settings) |
| **music-metadata** | Reads embedded ID3 / FLAC / M4A tags and album art |
| **Node.js zlib** | Runtime PNG icon generation for taskbar thumbnail buttons |
| **Web Media Session API** | Windows SMTC integration (notification + lock screen controls) |
| **Google Drive API v3** | Cloud playlist streaming |

### Android
| Tool | Purpose |
|------|---------|
| **Capacitor 6** | Bridges React web UI into a native Android APK |
| **ExoPlayer / Media3** | Native lossless audio decoder with background playback |
| **Android SAF** | Storage Access Framework — persistent folder permissions |
| **MediaMetadataRetriever** | Reads embedded audio tags and album art from device files |
| **Capacitor Preferences** | Persistent storage (equivalent of electron-store on Android) |
| **Custom Kotlin Plugin** | Native bridge between React UI and Android audio/file systems |

---

## Architecture

```
lumi/
├── src/                        # Shared React UI (Desktop + Android)
│   ├── App.tsx                 # Main orchestrator — state, handlers, wiring
│   ├── theme.ts                # Accent colours and shared utilities
│   ├── types.ts                # TypeScript interfaces
│   ├── CatPet.tsx              # Animated cat companion
│   ├── components/
│   │   ├── ArtThumb.tsx        # Album art with logo fallback
│   │   ├── SeekBar.tsx         # Drag-safe progress slider
│   │   └── VinylRecord.tsx     # Spinning vinyl disc animation
│   ├── views/
│   │   ├── HomeView.tsx        # Folder connect + playlist grid
│   │   ├── PlaylistView.tsx    # Song list with fixed header
│   │   ├── NowPlayingBar.tsx   # Persistent bottom mini-player
│   │   ├── FullScreenPlayer.tsx # Full-screen now playing
│   │   └── QueueSidebar.tsx    # Slide-in queue panel
│   └── services/
│       └── DriveService.ts     # Google Drive API integration
│
├── electron/                   # Desktop-only (Windows)
│   ├── main.js                 # Electron main process
│   └── preload.js              # Secure IPC bridge
│
└── android-native-plugin/      # Android-only Kotlin native code
    ├── NacsaAudioPlugin.kt     # Capacitor plugin definition
    └── NacsaPlayerService.kt   # ExoPlayer foreground service
```

---

## Installation

### Windows
1. Download `Lumi Setup x.x.x.exe` from the releases page
2. Double-click to install — click **"More info → Run anyway"** if Windows SmartScreen appears (expected for unsigned apps)
3. Lumi appears in your Start Menu and desktop

### Android
1. Download `Lumi.apk` from the releases page
2. Enable **"Install unknown apps"** for your file manager in Android Settings
3. Tap the APK to install

---

## Getting Started

### Connecting a local folder
1. Open Lumi → tap/click **"Click to connect a music folder"**
2. Select any folder containing audio files
3. Lumi scans it, reads all tags and artwork, and creates a playlist — permanently saved

### Connecting a Google Drive folder 
1. In Google Drive, right-click your music folder → **Share → "Anyone with the link" → Viewer**
2. Copy the folder link
3. In Lumi, paste the link into the **Google Drive** card → click **Connect Drive Folder**
4. Lumi streams your music directly from your own Drive — no downloads, no middlemen

---

## Built By

Lumi was designed and developed as a personal project by **Nakul** — a music lover who wanted a player that respects both the listener and the music.

Every feature in Lumi exists because it was personally needed: lossless playback because quality matters, Google Drive streaming because your music should be everywhere you are, a vinyl mode because some songs deserve a moment, and a cat because why not.

> *"I didn't want a music player that told me what to listen to.*
> *I wanted one that got out of the way and just played the music."*
> — Nakul

---

## Privacy

Lumi collects **zero data**. There are no analytics, no crash reporters, no telemetry, no accounts, and no servers. Everything stays on your device and your own Google Drive. The Google Drive API key is used exclusively to list and stream files from your own folders — nothing is sent anywhere else.

---

## Acknowledgements

- **Van Gogh's *The Starry Night*** — visual inspiration for the entire colour palette and aesthetic
- **Electron** and **Capacitor** teams — for making cross-platform possible
- **ExoPlayer / Media3** — for genuinely excellent lossless audio on Android
- Every artist whose music made building this worth it

---

<div align="center">

**Lumi** · *Your Music Companion.*

Made with 🎵 and a lot of late nights.

</div>
